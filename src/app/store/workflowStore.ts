import { create } from 'zustand';
import { WorkflowModuleData, WorkflowResult } from '../types/workflow';

interface AgentStatus {
  moduleId: string;
  isComplete: boolean;
  isExecuting: boolean;
  error: string | null;
  executionTime?: number;
  retryCount: number;
}

interface WorkflowState {
  isRunning: boolean;
  currentAgentIndex: number;
  results: WorkflowResult[];
  error: string | null;
  failedAgentIndex: number;
  agentStatus: Record<string, AgentStatus>;
  // Actions
  startWorkflow: (modules: WorkflowModuleData[], startFromIndex?: number) => Promise<void>;
  stopWorkflow: () => void;
  retryFromFailed: (modules: WorkflowModuleData[]) => Promise<void>;
  retryEntireWorkflow: (modules: WorkflowModuleData[]) => Promise<void>;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // Base delay for exponential backoff

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to determine which API route to use based on model
function getApiRoute(model: string): string {
  if (model.startsWith('claude-')) {
    return '/api/claude';
  }
  if (model.startsWith('gpt-')) {
    return '/api/openai';
  }
  throw new Error(`Unsupported model: ${model}`);
}

async function executeAgent(
  module: WorkflowModuleData,
  previousOutput: string | null,
  retryCount: number = 0
): Promise<{ response: string; usage: { input_tokens: number; output_tokens: number } }> {
  const apiKey = module.selectedModel.startsWith('claude-')
    ? sessionStorage.getItem('anthropic_api_key')
    : sessionStorage.getItem('openai_api_key');

  if (!apiKey) {
    throw new Error(`API key not found for ${module.selectedModel}`);
  }

  try {
    const apiRoute = getApiRoute(module.selectedModel);
    console.log(`Executing agent with model ${module.selectedModel} via ${apiRoute}`);

    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: previousOutput 
          ? `CONTENT TO PROCESS: ${previousOutput}\n\nYOUR ROLE: ${module.prompt}`
          : `USER INPUT: ${module.prompt}\n\nYOUR ROLE: ${module.prompt}`,
        apiKey,
        model: module.selectedModel,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Handle rate limits with exponential backoff
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await sleep(delay);
        return executeAgent(module, previousOutput, retryCount + 1);
      }

      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      response: data.response,
      usage: data.usage || { input_tokens: 0, output_tokens: 0 }
    };
  } catch (error) {
    // Retry on network errors
    if (error instanceof Error && error.message.includes('fetch') && retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
      console.log(`Network error. Retrying in ${delay}ms...`);
      await sleep(delay);
      return executeAgent(module, previousOutput, retryCount + 1);
    }
    throw error;
  }
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  isRunning: false,
  currentAgentIndex: -1,
  results: [],
  error: null,
  failedAgentIndex: -1,
  agentStatus: {},

  startWorkflow: async (modules: WorkflowModuleData[], startFromIndex = 0) => {
    const store = get();
    if (store.isRunning) return;

    // Keep existing results if retrying from a failed agent
    const existingResults = startFromIndex > 0 ? store.results.slice(0, startFromIndex) : [];

    set({
      isRunning: true,
      currentAgentIndex: startFromIndex,
      error: null,
      failedAgentIndex: -1,
      results: existingResults,
      agentStatus: modules.reduce((acc, module, index) => ({
        ...acc,
        [module.id]: {
          moduleId: module.id,
          isComplete: index < startFromIndex,
          isExecuting: index === startFromIndex,
          error: null,
          retryCount: 0
        }
      }), {})
    });

    let previousOutput = startFromIndex > 0 && existingResults.length > 0
      ? existingResults[existingResults.length - 1].output
      : null;

    for (let i = startFromIndex; i < modules.length; i++) {
      const module = modules[i];
      const startTime = Date.now();

      try {
        // Check if workflow was stopped
        if (!get().isRunning) {
          console.log('Workflow execution stopped by user');
          return;
        }

        set(state => ({
          currentAgentIndex: i,
          agentStatus: {
            ...state.agentStatus,
            [module.id]: {
              ...state.agentStatus[module.id],
              isExecuting: true,
              error: null
            }
          }
        }));

        const { response, usage } = await executeAgent(module, previousOutput);
        previousOutput = response;
        const executionTime = Date.now() - startTime;

        // Store result
        const result: WorkflowResult = {
          agentIndex: i,
          input: module.prompt,
          output: response,
          timestamp: new Date().toISOString(),
          executionTime,
          usage
        };

        set(state => ({
          results: [...state.results, result],
          agentStatus: {
            ...state.agentStatus,
            [module.id]: {
              ...state.agentStatus[module.id],
              isExecuting: false,
              isComplete: true,
              executionTime
            }
          }
        }));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Agent ${i} (${module.title}) failed:`, errorMessage);

        set(state => ({
          error: `${module.title}: ${errorMessage}`,
          failedAgentIndex: i,
          isRunning: false,
          agentStatus: {
            ...state.agentStatus,
            [module.id]: {
              ...state.agentStatus[module.id],
              isExecuting: false,
              error: errorMessage,
              retryCount: (state.agentStatus[module.id].retryCount || 0) + 1
            }
          }
        }));
        return; // Stop workflow but preserve previous results
      }
    }

    // Workflow completed successfully
    set({
      isRunning: false,
      currentAgentIndex: -1,
      error: null,
      failedAgentIndex: -1
    });
  },

  stopWorkflow: () => set({
    isRunning: false,
    currentAgentIndex: -1,
    error: 'Workflow stopped by user'
  }),

  retryFromFailed: async (modules: WorkflowModuleData[]) => {
    const { failedAgentIndex } = get();
    if (failedAgentIndex >= 0) {
      await get().startWorkflow(modules, failedAgentIndex);
    }
  },

  retryEntireWorkflow: async (modules: WorkflowModuleData[]) => {
    await get().startWorkflow(modules, 0);
  }
})); 