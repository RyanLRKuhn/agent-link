'use client';

import { useState } from 'react';

export default function WorkflowModule() {
  const [selectedModel, setSelectedModel] = useState('Claude Sonnet 4');
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [editingPrompt, setEditingPrompt] = useState('');

  const handleExpandPrompt = () => {
    console.log('handleExpandPrompt');
    setIsPromptExpanded(true);
    setEditingPrompt(prompt);
  };

  const handleSavePrompt = () => {
    setPrompt(editingPrompt);
    setIsPromptExpanded(false);
  };

  const handleCancelPrompt = () => {
    setIsPromptExpanded(false);
    setEditingPrompt(prompt);
  };

  // Get first line of prompt for collapsed view
  const getPromptPreview = () => {
    if (!prompt) return 'Click to edit prompt';
    const firstLine = prompt.split('\n')[0];
    return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine + '...';
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg w-[480px]">
      {/* Module Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white">Agent 1</h2>
      </div>

      {/* Module Content */}
      <div className="p-4 space-y-4">
        {/* Model Selection */}
        <div className="space-y-2">
          <label htmlFor="model" className="block text-sm font-medium text-gray-300">
            Model
          </label>
          <select
            id="model"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {['Claude Sonnet 4', 'GPT-4', 'Claude Haiku'].map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        {/* Prompt Section */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Prompt
          </label>
          
          {!isPromptExpanded ? (
            <button 
              onClick={handleExpandPrompt}
              className="w-full text-left p-4 bg-gray-700 rounded-md cursor-pointer hover:bg-gray-650 transition-colors"
            >
              <p className="text-gray-400 text-sm">{getPromptPreview()}</p>
            </button>
          ) : (
            <div className="space-y-3 animate-fade-in">
              <textarea
                value={editingPrompt}
                onChange={(e) => setEditingPrompt(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[160px] resize-y"
                placeholder="Enter your prompt here..."
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSavePrompt}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelPrompt}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800"
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