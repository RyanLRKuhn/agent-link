'use client';

import { useState } from 'react';
import { WorkflowModuleData } from '../types/workflow';
import { WorkflowResult } from '../store/workflowStore';

interface WorkflowOutputProps {
  modules: WorkflowModuleData[];
  results: WorkflowResult[];
  onExport: () => void;
}

export default function WorkflowOutput({ modules, results, onExport }: WorkflowOutputProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const finalResult = results[results.length - 1];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(finalResult.output);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const getAgentDescription = (module: WorkflowModuleData) => {
    // Get first sentence of prompt as role description
    const firstSentence = module.prompt.split(/[.!?](?:\s|$)/)[0];
    return firstSentence || module.title;
  };

  return (
    <div className="w-full animate-fade-in">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Final Output</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Workflow completed in {results.reduce((acc, r) => acc + r.executionTime, 0) / 1000}s
          </p>
        </div>
        <button
          onClick={onExport}
          className="px-4 py-2 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--border)] flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Results
        </button>
      </div>

      {/* Workflow Summary */}
      <div className="mb-6 p-4 bg-[var(--surface-1)] rounded-lg border border-[var(--border)]">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Workflow Summary</h3>
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <div className="px-3 py-1.5 bg-[var(--surface-2)] rounded-lg text-[var(--text-primary)]">
            📝 User Input
          </div>
          {modules.map((module, index) => (
            <div key={module.id} className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <div className="px-3 py-1.5 bg-[var(--surface-2)] rounded-lg text-[var(--text-primary)] flex items-center gap-2">
                <span>🤖 {module.title}</span>
                <span className="text-[var(--text-secondary)]">({getAgentDescription(module)})</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Final Output Display */}
      <div className="relative">
        <div className="absolute -top-3 left-4 px-2 bg-[var(--surface-0)] text-xs font-medium text-[var(--text-secondary)]">
          Final Result
        </div>
        <div className="p-6 bg-[var(--surface-1)] rounded-xl border border-[var(--border)]">
          <pre className="text-[var(--text-primary)] whitespace-pre-wrap font-mono text-sm mb-4">
            {finalResult.output}
          </pre>
          <div className="flex justify-end">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--border)] flex items-center gap-2"
            >
              {copySuccess ? (
                <>
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Output
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 