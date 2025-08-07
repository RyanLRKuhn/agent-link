'use client';

import { useState } from 'react';
import { WorkflowModuleData } from '../types/workflow';
import LoadingSpinner from './LoadingSpinner';
import ModelSelect from './ModelSelect';

interface WorkflowModuleProps {
  module: WorkflowModuleData;
  onUpdate: (moduleId: string, updates: Partial<WorkflowModuleData>) => void;
  onDelete?: (moduleId: string) => void;
  canDelete?: boolean;
  index: number;
  isExecuting?: boolean;
  isComplete?: boolean;
  executionError?: string | null;
  executionTime?: number;
}

export default function WorkflowModule({
  module,
  onUpdate,
  onDelete,
  canDelete = true,
  index,
  isExecuting = false,
  isComplete = false,
  executionError = null,
  executionTime
}: WorkflowModuleProps) {
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(module.prompt);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testTimestamp, setTestTimestamp] = useState<string | null>(null);

  const handleExpandPrompt = () => {
    setIsPromptExpanded(true);
    setEditingPrompt(module.prompt);
  };

  const handleSavePrompt = () => {
    onUpdate(module.id, { prompt: editingPrompt });
    setIsPromptExpanded(false);
  };

  const handleCancelPrompt = () => {
    setEditingPrompt(module.prompt);
    setIsPromptExpanded(false);
  };

  const handleProviderChange = (provider: 'openai' | 'anthropic' | 'google' | null) => {
    console.log('Provider change:', provider); // Debug log
    onUpdate(module.id, {
      provider,
      selectedModel: null // Reset model when provider changes
    });
  };

  const handleModelChange = (model: string | null) => {
    console.log('Model change:', model); // Debug log
    onUpdate(module.id, { selectedModel: model });
  };

  const handleTestPrompt = async () => {
    if (!module.provider || !module.selectedModel) {
      setTestError('Please select a provider and model first.');
      return;
    }

    const apiKey = module.provider === 'anthropic'
      ? sessionStorage.getItem('anthropic_api_key')
      : module.provider === 'openai'
      ? sessionStorage.getItem('openai_api_key')
      : sessionStorage.getItem('google_api_key');

    if (!apiKey) {
      setTestError(`Please add your ${
        module.provider === 'anthropic' ? 'Anthropic' :
        module.provider === 'openai' ? 'OpenAI' :
        'Google AI'
      } API key in settings.`);
      return;
    }

    setIsTestLoading(true);
    setTestError(null);
    setTestResponse(null);

    try {
      const endpoint = module.provider === 'anthropic'
        ? '/api/claude'
        : module.provider === 'openai'
        ? '/api/openai'
        : '/api/gemini';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: module.prompt,
          apiKey,
          model: module.selectedModel
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to test prompt');

      setTestResponse(data.response);
      setTestTimestamp(new Date().toISOString());
    } catch (error) {
      setTestError(error instanceof Error ? error.message : 'Failed to test prompt');
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleCopyResponse = () => {
    if (testResponse) {
      navigator.clipboard.writeText(testResponse);
    }
  };

  return (
    <div className={`w-full premium-card rounded-xl overflow-hidden transition-all duration-300 ${
      isExecuting ? 'ring-2 ring-blue-500/30 shadow-[var(--glow)]' : ''
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface-1)]">
        <h3 className="font-semibold text-lg text-[var(--text-primary)] flex items-center gap-2">
          {module.title}
          {isExecuting && (
            <span className="text-blue-400 text-sm font-normal animate-pulse flex items-center gap-1">
              <LoadingSpinner className="w-3 h-3" />
              Processing
            </span>
          )}
          {isComplete && executionTime && (
            <span className="text-green-400 text-sm font-normal flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {(executionTime / 1000).toFixed(1)}s
            </span>
          )}
          {executionError && (
            <span className="text-red-400 text-sm font-normal flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Error
            </span>
          )}
        </h3>

        <div className="flex items-center gap-3">
          <ModelSelect
            provider={module.provider}
            model={module.selectedModel}
            onProviderChange={handleProviderChange}
            onModelChange={handleModelChange}
          />

          {onDelete && canDelete && (
            <button
              onClick={() => onDelete(module.id)}
              className="p-1.5 text-[var(--text-secondary)] hover:text-red-400 rounded-lg
                transition-all duration-200 hover:bg-red-500/10 group"
              aria-label="Delete module"
            >
              <svg className="w-4 h-4 transition-transform duration-200 group-hover:scale-110"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 bg-[var(--surface-1)]">
        {isPromptExpanded ? (
          <div className="space-y-3 animate-fade-in">
            <textarea
              value={editingPrompt}
              onChange={(e) => setEditingPrompt(e.target.value)}
              placeholder="Define this agent's role and behavior..."
              className="w-full h-40 p-3 premium-input rounded-lg text-sm text-[var(--text-primary)]
                focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none
                placeholder:text-[var(--text-secondary)]"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelPrompt}
                className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] 
                  transition-colors rounded-lg hover:bg-[var(--surface-2)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePrompt}
                className="px-3 py-1.5 text-sm bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white 
                  rounded-lg transition-all duration-200 hover:shadow-[var(--glow)]"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={handleExpandPrompt}
            className="p-3 premium-input rounded-lg cursor-pointer transition-all duration-200
              hover:border-[var(--primary)] hover:shadow-[var(--glow)] group"
          >
            <p className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
              {module.prompt ? module.prompt.split('\n')[0] + '...' : 'Click to edit role & instructions'}
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleTestPrompt}
            disabled={isTestLoading}
            className="px-3 py-1.5 text-sm premium-input rounded-lg transition-all duration-200
              hover:border-[var(--primary)] hover:shadow-[var(--glow)]
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-2"
          >
            {isTestLoading ? (
              <>
                <LoadingSpinner className="w-4 h-4" />
                <span>Testing...</span>
              </>
            ) : (
              <>Test</>
            )}
          </button>
        </div>

        {/* Test Results */}
        {(testResponse || testError) && (
          <div className={`mt-4 p-4 rounded-lg premium-card ${
            testError ? 'bg-red-500/5 border-red-500/20' : ''
          }`}>
            {testError ? (
              <p className="text-sm text-red-400">{testError}</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">
                    {testTimestamp && new Date(testTimestamp).toLocaleTimeString()}
                  </span>
                  <button
                    onClick={handleCopyResponse}
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] 
                      transition-colors flex items-center gap-1 group"
                  >
                    <svg className="w-3 h-3 transition-transform duration-200 group-hover:scale-110" 
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" 
                      />
                    </svg>
                    Copy
                  </button>
                </div>
                <div className="p-3 bg-[var(--surface-0)] rounded-lg border border-[var(--border)]">
                  <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap font-mono">
                    {testResponse}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 