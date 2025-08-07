import { NextRequest, NextResponse } from 'next/server';
import { getWorkflow } from '@/lib/workflows';
import { getProvider } from '@/lib/providers';

interface ApiKeys {
  anthropic?: string;
  openai?: string;
  google?: string;
  custom?: Record<string, string>;
}

interface ExecutionResult {
  agentIndex: number;
  input: string;
  output: string;
  executionTime: number;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  timestamp: string;
}

async function executeModule(
  module: any,
  input: string,
  apiKeys: ApiKeys
): Promise<ExecutionResult> {
  const startTime = Date.now();

  try {
    // Determine provider type and endpoint
    let endpoint: string;
    let apiKey: string | undefined;
    let requestBody: any;

    if (typeof module.provider === 'string') {
      // Built-in provider
      switch (module.provider) {
        case 'anthropic':
          endpoint = '/api/claude';
          apiKey = apiKeys.anthropic;
          break;
        case 'openai':
          endpoint = '/api/openai';
          apiKey = apiKeys.openai;
          break;
        case 'google':
          endpoint = '/api/gemini';
          apiKey = apiKeys.google;
          break;
        default:
          throw new Error(`Unknown provider: ${module.provider}`);
      }

      requestBody = {
        prompt: input,
        apiKey,
        model: module.selectedModel
      };
    } else if (module.provider?.type === 'custom') {
      // Custom provider
      endpoint = '/api/custom';
      const provider = await getProvider(module.provider.id);
      if (!provider) {
        throw new Error(`Custom provider not found: ${module.provider.id}`);
      }

      apiKey = apiKeys.custom?.[module.provider.id];
      if (!apiKey) {
        throw new Error(`API key not found for custom provider: ${provider.name}`);
      }

      requestBody = {
        prompt: input,
        apiKey,
        model: module.selectedModel,
        providerId: module.provider.id
      };
    } else {
      throw new Error('Invalid provider configuration');
    }

    if (!apiKey) {
      throw new Error(`API key not found for provider: ${
        typeof module.provider === 'string' 
          ? module.provider 
          : module.provider?.name || 'unknown'
      }`);
    }

    // Make request to appropriate endpoint
    const response = await fetch(new URL(endpoint, process.env.VERCEL_URL).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to execute module');
    }

    const data = await response.json();
    
    return {
      agentIndex: 0, // Will be set by caller
      input,
      output: data.response,
      executionTime: Date.now() - startTime,
      usage: data.usage,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(
      `Module execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Load workflow
    const workflow = await getWorkflow(params.id);
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Get API keys from request
    const { apiKeys } = await request.json();
    if (!apiKeys) {
      return NextResponse.json(
        { error: 'API keys are required' },
        { status: 400 }
      );
    }

    const results: ExecutionResult[] = [];
    let currentInput = '';

    // Execute each module in sequence
    for (let i = 0; i < workflow.modules.length; i++) {
      const module = workflow.modules[i];
      
      try {
        // Use previous output as input, or module's prompt for first module
        currentInput = i === 0 ? module.prompt : results[i - 1].output;

        const result = await executeModule(module, currentInput, apiKeys);
        results.push({
          ...result,
          agentIndex: i
        });
      } catch (error) {
        return NextResponse.json({
          error: `Execution failed at module ${i + 1}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          results,
          failedAgentIndex: i
        }, { status: 500 });
      }
    }

    // Calculate execution metadata
    const metadata = {
      workflowId: workflow.id,
      startTime: results[0].timestamp,
      endTime: results[results.length - 1].timestamp,
      totalExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0),
      totalTokens: results.reduce((sum, r) => {
        return sum + (r.usage?.input_tokens || 0) + (r.usage?.output_tokens || 0);
      }, 0)
    };

    return NextResponse.json({
      results,
      metadata
    });

  } catch (error) {
    console.error('Workflow execution error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 