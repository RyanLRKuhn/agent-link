'use client';

import { useState, useEffect } from 'react';
import { WorkflowModuleData, AVAILABLE_MODELS } from '../types/workflow';
import LoadingSpinner from './LoadingSpinner';

interface ResponseData {
  response: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  timestamp: string;
}

interface WorkflowModuleProps {
  module: WorkflowModuleData;
  onUpdate: (moduleId: string, updates: Partial<WorkflowModuleData>) => void;
  onDelete: (moduleId: string) => void;
  canDelete: boolean;
}

export default function WorkflowModule({ 
  module, 
  onUpdate, 
  onDelete,
  canDelete 
}: WorkflowModuleProps) {
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [isLeaving, setIsLeaving] = useState(false);
  const [isTestingPrompt, setIsTestingPrompt] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<ResponseData | null>(null);
  const [isResponseExpanded, setIsResponseExpanded] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleExpandPrompt = () => {
    setIsPromptExpanded(true);
    setEditingPrompt(module.prompt);
  };

  const handleSavePrompt = () => {
    onUpdate(module.id, { prompt: editingPrompt });
    setIsPromptExpanded(false);
  };

  const handleCancelPrompt = () => {
    setIsPromptExpanded(false);
    setEditingPrompt(module.prompt);
  };

  const handleModelChange = (model: string) => {
    onUpdate(module.id, { selectedModel: model });
  };

  const handleDelete = () => {
    setIsLeaving(true);
    setTimeout(() => onDelete(module.id), 200);
  };

  const handleCopyResponse = async () => {
    if (responseData?.response) {
      await navigator.clipboard.writeText(responseData.response);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleTestPrompt = async () => {
    setTestError(null);
    setResponseData(null);
    
    const apiKey = sessionStorage.getItem('anthropic_api_key');
    if (!apiKey) {
      setTestError('API key required. Please add your API key in settings.');
      return;
    }

    if (!module.prompt.trim()) {
      setTestError('Please enter a prompt first.');
      return;
    }

    setIsTestingPrompt(true);

    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: module.prompt,
          apiKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to test prompt');
      }

      setResponseData(data);
      setIsResponseExpanded(true);
    } catch (error) {
      setTestError(error instanceof Error ? error.message : 'Failed to test prompt');
    } finally {
      setIsTestingPrompt(false);
    }
  };

  const getPromptPreview = () => {
    if (!module.prompt) return 'Click to edit prompt';
    const firstLine = module.prompt.split('\n')[0];
    return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine + '...';
  };

  return (
    <div 
      className={`bg-[var(--surface-1)] rounded-xl shadow-lg shadow-black/20 w-[480px] transition-all duration-200 ${
        isLeaving ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
      }`}
    >
      {/* Module Header */}
      <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-2)] rounded-t-xl">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">{module.title}</h2>
        {canDelete && (
          <button
            onClick={handleDelete}
            className="w-7 h-7 rounded-lg bg-[var(--surface-3)] hover:bg-red-500/20 hover:text-red-500 flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[var(--surface-2)]"
            aria-label="Delete module"
          >
            <svg
              className="w-4 h-4 text-[var(--text-secondary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Module Content */}
      <div className="p-5 space-y-5">
        {/* Model Selection */}
        <div className="space-y-2.5">
          <label htmlFor={`model-${module.id}`} className="block text-sm font-medium text-[var(--text-secondary)]">
            Model
          </label>
          <select
            id={`model-${module.id}`}
            value={module.selectedModel}
            onChange={(e) => handleModelChange(e.target.value)}
            className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg py-2.5 px-3.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-shadow duration-200"
          >
            {AVAILABLE_MODELS.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        {/* Prompt Section */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-[var(--text-secondary)]">
              Prompt
            </label>
            {!isPromptExpanded && module.prompt && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestPrompt}
                  disabled={isTestingPrompt}
                  className="px-3 py-1.5 bg-[var(--surface-3)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--border)] focus:ring-offset-2 focus:ring-offset-[var(--surface-1)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTestingPrompt ? (
                    <>
                      <LoadingSpinner />
                      Testing...
                    </>
                  ) : responseData ? (
                    <>
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Test Again
                    </>
                  ) : testError ? (
                    <>
                      <svg
                        className="w-4 h-4 text-red-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Retry
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Test Prompt
                    </>
                  )}
                </button>

                {testError && (
                  <div className="flex-1 text-red-400 text-sm animate-fade-in flex items-center gap-2">
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="truncate">{testError}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {!isPromptExpanded ? (
            <>
              <button 
                onClick={handleExpandPrompt}
                className="w-full text-left p-4 bg-[var(--surface-2)] rounded-lg cursor-pointer hover:bg-[var(--surface-3)] transition-colors duration-200 group"
              >
                <p className="text-[var(--text-secondary)] text-sm group-hover:text-[var(--text-primary)] transition-colors duration-200">
                  {getPromptPreview()}
                </p>
              </button>

              {testError && (
                <div className="mt-3 p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                  <p className="text-red-400 text-sm">{testError}</p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3 animate-fade-in">
              <textarea
                value={editingPrompt}
                onChange={(e) => setEditingPrompt(e.target.value)}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg py-3 px-4 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent min-h-[160px] resize-y transition-shadow duration-200"
                placeholder="Enter your prompt here..."
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSavePrompt}
                  className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg font-medium transition-all duration-200 hover-glow focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface-1)]"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelPrompt}
                  className="px-4 py-2 bg-[var(--surface-3)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--border)] focus:ring-offset-2 focus:ring-offset-[var(--surface-1)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Response Section */}
        {responseData && !isPromptExpanded && (
          <div className="space-y-2.5 animate-fade-in border-t border-[var(--border)] pt-5">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Response
              </label>
              <button
                onClick={() => setIsResponseExpanded(!isResponseExpanded)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <svg
                  className={`w-5 h-5 transform transition-transform duration-200 ${
                    isResponseExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>

            {isResponseExpanded && (
              <div className="space-y-3">
                <div className="relative">
                  <pre className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg py-3 px-4 text-[var(--text-primary)] whitespace-pre-wrap text-sm font-mono overflow-x-auto">
                    {responseData.response}
                  </pre>
                  <button
                    onClick={handleCopyResponse}
                    className="absolute top-2 right-2 p-1.5 rounded-md bg-[var(--surface-3)] hover:bg-[var(--surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    title="Copy response"
                  >
                    {copySuccess ? (
                      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="flex justify-between items-center text-xs text-[var(--text-secondary)]">
                  <span>
                    {formatTimestamp(responseData.timestamp)}
                  </span>
                  <span>
                    Tokens: {responseData.usage.input_tokens} in / {responseData.usage.output_tokens} out
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 