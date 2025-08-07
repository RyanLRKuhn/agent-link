'use client';

import { WorkflowModuleData } from '../types/workflow';

interface ErrorDisplayProps {
  error: string;
  failedAgentIndex: number;
  modules: WorkflowModuleData[];
  onRetryFromFailed: () => void;
  onRetryAll: () => void;
}

export default function ErrorDisplay({
  error,
  failedAgentIndex,
  modules,
  onRetryFromFailed,
  onRetryAll
}: ErrorDisplayProps) {
  const failedModule = modules[failedAgentIndex];

  return (
    <div className="w-full premium-card p-6 space-y-4">
      {/* Error Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-red-500/10 rounded-lg">
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-500 mb-1">
            Workflow Error in {failedModule?.title || 'Unknown Agent'}
          </h3>
          <pre className="text-sm font-mono text-[var(--text-secondary)] bg-[var(--surface-2)] p-3 rounded-lg overflow-x-auto">
            {error}
          </pre>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={onRetryFromFailed}
          className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg 
            font-medium transition-all duration-200 hover:shadow-[var(--glow)] 
            flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          Retry from {failedModule?.title}
        </button>
        <button
          onClick={onRetryAll}
          className="flex-1 px-4 py-2 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] 
            text-[var(--text-secondary)] rounded-lg font-medium transition-colors
            flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          Retry Entire Workflow
        </button>
      </div>

      {/* Partial Results Notice */}
      {failedAgentIndex > 0 && (
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] pt-4 border-t border-[var(--border)]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          <span>
            Results from previous agents have been preserved and are shown above.
          </span>
        </div>
      )}
    </div>
  );
} 