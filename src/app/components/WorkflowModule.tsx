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
        {/* Prompt Editor */}
        <div className="prompt-editor group">
          {isPromptExpanded ? (
            <div className="prompt-editor-overlay" onClick={() => {
              setIsPromptExpanded(false);
              setEditingPrompt(module.prompt);
            }} />
          ) : null}
          
          {isPromptExpanded ? (
            <div className="prompt-editor-modal">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Edit Agent Role & Instructions</h3>
                <button
                  onClick={() => {
                    setIsPromptExpanded(false);
                    setEditingPrompt(module.prompt);
                  }}
                  className="p-2 rounded-lg hover:bg-surface-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <textarea
                value={editingPrompt}
                onChange={(e) => setEditingPrompt(e.target.value)}
                placeholder="Enter instructions for this agent..."
                className="prompt-editor-input"
                autoFocus
              />
              
              <div className="prompt-editor-buttons">
                <button
                  onClick={handleCancelPrompt}
                  className="btn-secondary px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePrompt}
                  className="btn-primary px-4 py-2 text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={handleExpandPrompt}
              className="prompt-editor-preview group/preview"
            >
              {module.prompt ? (
                <div className="relative">
                  <p className="text-sm whitespace-pre-wrap">{module.prompt}</p>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface-1 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-end justify-center pb-4">
                    <span className="text-sm text-text-secondary flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Click to edit
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <span className="text-sm text-text-secondary flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add agent instructions
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

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