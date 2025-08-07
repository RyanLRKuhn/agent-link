'use client';

import { useState } from 'react';
import { WorkflowModuleData } from '../types/workflow';

interface WorkflowOutputProps {
  modules: WorkflowModuleData[];
  results: Array<{
    agentIndex: number;
    input: string;
    output: string;
    timestamp: string;
    executionTime: number;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
    };
  }>;
  onExport: () => void;
}

export default function WorkflowOutput({
  modules,
  results,
  onExport
}: WorkflowOutputProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const finalResult = results[results.length - 1];
  
  // Calculate total execution time and tokens
  const totalTime = results.reduce((sum, r) => sum + r.executionTime, 0);
  const totalTokens = results.reduce((sum, r) => {
    return sum + (r.usage?.input_tokens || 0) + (r.usage?.output_tokens || 0);
  }, 0);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(finalResult.output);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Final Result</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onExport}
            className="px-3 py-1.5 text-sm bg-[var(--surface-2)] hover:bg-[var(--surface-3)] 
              text-[var(--text-secondary)] rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
              />
            </svg>
            Export Workflow
          </button>
        </div>
      </div>

      {/* Workflow Summary */}
      <div className="flex items-center gap-6 text-sm text-[var(--text-secondary)] pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          {(totalTime / 1000).toFixed(1)}s total
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" 
            />
          </svg>
          {totalTokens.toLocaleString()} tokens
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
            />
          </svg>
          {modules.length} agents
        </div>
      </div>

      {/* Workflow Path */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] flex-wrap">
        <span>Path:</span>
        {modules.map((module, index) => (
          <span key={module.id} className="flex items-center">
            {index > 0 && (
              <svg className="w-4 h-4 mx-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            <span className="px-2 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--border)]">
              {module.title}
            </span>
          </span>
        ))}
      </div>

      {/* Final Output */}
      <div className="relative">
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] 
              rounded-lg transition-colors group"
          >
            {copySuccess ? (
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" 
                />
              </svg>
            )}
          </button>
        </div>
        <div className="p-6 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
          <pre className="whitespace-pre-wrap font-mono text-sm text-[var(--text-primary)]">
            {finalResult.output}
          </pre>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-xs text-[var(--text-secondary)]">
        Completed at {new Date(finalResult.timestamp).toLocaleString()}
      </div>
    </div>
  );
} 