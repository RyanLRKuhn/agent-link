'use client';

import { useState } from 'react';
import { WorkflowModuleData, AVAILABLE_MODELS } from '../types/workflow';

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
          <label className="block text-sm font-medium text-[var(--text-secondary)]">
            Prompt
          </label>
          
          {!isPromptExpanded ? (
            <button 
              onClick={handleExpandPrompt}
              className="w-full text-left p-4 bg-[var(--surface-2)] rounded-lg cursor-pointer hover:bg-[var(--surface-3)] transition-colors duration-200 group"
            >
              <p className="text-[var(--text-secondary)] text-sm group-hover:text-[var(--text-primary)] transition-colors duration-200">
                {getPromptPreview()}
              </p>
            </button>
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
      </div>
    </div>
  );
} 