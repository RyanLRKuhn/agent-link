'use client';

import { useState } from 'react';
import ModelSelect from './ModelSelect';
import { getCustomProviders } from '../utils/customProviders';
import { Provider, isBuiltInProvider, getProviderId } from '../types/workflow';

interface WorkflowModuleData {
  id: string;
  title: string;
  prompt: string;
  provider: Provider | null;
  selectedModel: string | null;
}

interface WorkflowModuleProps {
  module: WorkflowModuleData;
  onUpdate: (moduleId: string, updates: Partial<WorkflowModuleData>) => void;
  onDelete: (moduleId: string) => void;
  canDelete: boolean;
  index: number;
  isExecuting?: boolean;
  isComplete?: boolean;
  executionError?: string | null;
  executionTime?: number;
}

interface TestResponse {
  text: string;
  timestamp: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

export default function WorkflowModule({
  module,
  onUpdate,
  onDelete,
  canDelete,
  index,
  isExecuting = false,
  isComplete = false,
  executionError = null,
  executionTime
}: WorkflowModuleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResponse, setTestResponse] = useState<TestResponse | null>(null);
  const [isResponseExpanded, setIsResponseExpanded] = useState(true);

  const handleTest = async () => {
    if (!module.prompt || !module.provider || !module.selectedModel) return;
    
    setIsLoading(true);
    setError(null);
    setTestResponse(null);

    try {
      // Get API key based on provider
      let apiKey: string | null = null;
      if (isBuiltInProvider(module.provider)) {
        apiKey = sessionStorage.getItem(`${module.provider}_api_key`);
      }

      // Get custom provider config if applicable
      const customProvider = module.provider 
        ? getCustomProviders().find(p => p.id === getProviderId(module.provider))
        : null;

      // Map provider to correct API endpoint
      let endpoint: string;
      if (customProvider) {
        endpoint = '/api/custom';
      } else if (isBuiltInProvider(module.provider)) {
        switch (module.provider) {
          case 'anthropic':
            endpoint = '/api/claude';
            break;
          case 'openai':
            endpoint = '/api/openai';
            break;
          case 'google':
            endpoint = '/api/gemini';
            break;
          default:
            throw new Error('Unknown provider');
        }
      } else {
        throw new Error('Invalid provider');
      }

      console.log('Calling API endpoint:', endpoint);

      // Make API request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: module.prompt,
          apiKey,
          model: module.selectedModel,
          ...(customProvider && { providerConfig: customProvider })
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      const data = await response.json();
      
      // Store test response with metadata
      const newResponse: TestResponse = {
        text: data.response,
        timestamp: new Date().toISOString(),
        usage: data.usage
      };
      setTestResponse(newResponse);

    } catch (error) {
      console.error('Test error:', error);
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResponse = () => {
    if (testResponse?.text) {
      navigator.clipboard.writeText(testResponse.text);
    }
  };

  const handlePromptChange = (newPrompt: string) => {
    onUpdate(module.id, { prompt: newPrompt });
  };

  const handleProviderChange = (provider: Provider | null) => {
    onUpdate(module.id, { 
      provider,
      selectedModel: null // Reset model when provider changes
    });
  };

  const handleModelChange = (model: string | null) => {
    onUpdate(module.id, { selectedModel: model });
  };

  return (
    <div className={`relative p-4 rounded-lg border ${
      isComplete ? 'bg-surface-2/50 border-surface-3' :
      isExecuting ? 'bg-surface-2 border-primary shadow-glow-sm' :
      'bg-surface-1 border-surface-2'
    }`}>
      {/* Module Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm
            ${isComplete ? 'bg-success/10 text-success' :
              isExecuting ? 'bg-primary/10 text-primary' :
              'bg-surface-2 text-text-secondary'
            }`}>
            {index + 1}
          </div>
          <h3 className="font-medium">{module.title}</h3>
        </div>
        {canDelete && (
          <button
            onClick={() => onDelete(module.id)}
            className="p-1.5 text-text-secondary hover:text-error
              hover:bg-error/10 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Model Selection */}
      <div className="mb-4">
        <ModelSelect
          selectedProvider={module.provider}
          selectedModel={module.selectedModel}
          onProviderChange={handleProviderChange}
          onModelChange={handleModelChange}
        />
      </div>

      {/* Prompt Editor */}
      <div className="relative">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={module.prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              className="w-full min-h-[120px] p-3 text-sm rounded-lg
                bg-surface-2 border border-surface-2
                focus:border-primary focus:ring-1 focus:ring-primary
                placeholder-text-tertiary resize-none"
              placeholder="Enter your prompt..."
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg
                  bg-surface-2 hover:bg-surface-3
                  border border-surface-2 hover:border-surface-3
                  transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg
                  bg-primary hover:bg-primary-hover text-white
                  transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="min-h-[120px] p-3 rounded-lg border border-dashed
              border-surface-3 hover:border-primary
              transition-colors cursor-text"
          >
            {module.prompt ? (
              <div className="text-sm whitespace-pre-wrap">{module.prompt}</div>
            ) : (
              <div className="text-sm text-text-tertiary">
                Click to add prompt...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleTest}
          disabled={!module.prompt || !module.provider || !module.selectedModel || isLoading || isExecuting}
          className="px-3 py-1.5 text-sm font-medium rounded-lg
            bg-primary hover:bg-primary-hover text-white
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Testing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Test
            </>
          )}
        </button>
      </div>

      {/* Test Response Section */}
      {testResponse && (
        <div className="mt-4 rounded-lg border border-surface-2 overflow-hidden">
          {/* Response Header */}
          <div className="flex items-center justify-between p-3 bg-surface-2 border-b border-surface-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsResponseExpanded(!isResponseExpanded)}
                className="p-1 hover:bg-surface-3 rounded transition-colors"
              >
                <svg 
                  className={`w-4 h-4 transition-transform ${isResponseExpanded ? 'rotate-0' : '-rotate-90'}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="text-xs text-text-secondary">
                {new Date(testResponse.timestamp).toLocaleTimeString()}
              </div>
              {testResponse.usage && (
                <div className="text-xs text-text-secondary">
                  {testResponse.usage.input_tokens && testResponse.usage.output_tokens && (
                    <>
                      {testResponse.usage.input_tokens + testResponse.usage.output_tokens} tokens
                    </>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleCopyResponse}
              className="p-1.5 text-text-secondary hover:text-text-primary
                hover:bg-surface-3 rounded transition-colors group"
            >
              <svg className="w-4 h-4 transition-transform group-hover:scale-110"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>

          {/* Response Content */}
          {isResponseExpanded && (
            <div className="p-3 bg-surface-1">
              <div className="font-mono text-sm whitespace-pre-wrap">
                {testResponse.text}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Execution Error */}
      {executionError && (
        <div className="mt-4 p-3 text-sm rounded-lg bg-error/10 text-error border border-error/20">
          {executionError}
        </div>
      )}

      {/* Test Error */}
      {error && (
        <div className="mt-4 p-3 text-sm rounded-lg bg-error/10 text-error border border-error/20">
          {error}
        </div>
      )}
    </div>
  );
} 