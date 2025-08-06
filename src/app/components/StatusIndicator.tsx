'use client';

import LoadingSpinner from './LoadingSpinner';

interface StatusIndicatorProps {
  isExecuting: boolean;
  isComplete: boolean;
  error: string | null;
  executionTime?: number;
}

export default function StatusIndicator({
  isExecuting,
  isComplete,
  error,
  executionTime
}: StatusIndicatorProps) {
  if (isExecuting) {
    return (
      <div className="flex items-center gap-1.5 text-blue-400 animate-pulse">
        <LoadingSpinner className="w-3.5 h-3.5" />
        <span className="text-sm font-medium">Processing</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-1.5 text-red-400">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        <span className="text-sm font-medium">Failed</span>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-400">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-sm font-medium">
          Complete {executionTime && `(${(executionTime / 1000).toFixed(1)}s)`}
        </span>
      </div>
    );
  }

  return null;
} 