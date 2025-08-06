'use client';

import { useWorkflowStore } from '../store/workflowStore';
import LoadingSpinner from './LoadingSpinner';
import { WorkflowModuleData } from '../types/workflow';

interface RunWorkflowButtonProps {
  className?: string;
  modules: WorkflowModuleData[];
}

export default function RunWorkflowButton({ className = '', modules }: RunWorkflowButtonProps) {
  const { isRunning, currentAgentIndex, error, startWorkflow } = useWorkflowStore();

  const handleClick = async () => {
    await startWorkflow(modules);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleClick}
        disabled={isRunning || modules.length === 0}
        className={`px-8 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg font-medium transition-all duration-200 hover-glow flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--primary)] ${className}`}
      >
        {isRunning ? (
          <>
            <LoadingSpinner />
            <span className="flex items-center gap-2">
              Running
              {currentAgentIndex >= 0 && (
                <span className="text-white/70">
                  (Agent {currentAgentIndex + 1})
                </span>
              )}
              ...
            </span>
          </>
        ) : (
          <>
            <span>Run Workflow</span>
            <svg
              className="w-5 h-5 transform transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </>
        )}
      </button>

      {error && (
        <div className="text-red-400 text-sm animate-fade-in flex items-center gap-2">
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
          <span>{error}</span>
        </div>
      )}
    </div>
  );
} 