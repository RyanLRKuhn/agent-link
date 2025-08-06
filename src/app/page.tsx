'use client';

import { useState } from 'react';
import WorkflowModule from './components/WorkflowModule';
import AddModuleButton from './components/AddModuleButton';
import SettingsDropdown from './components/SettingsDropdown';
import { WorkflowModuleData, AVAILABLE_MODELS } from './types/workflow';

export default function Home() {
  const [modules, setModules] = useState<WorkflowModuleData[]>([
    {
      id: '1',
      title: 'Agent 1',
      selectedModel: AVAILABLE_MODELS[0],
      prompt: ''
    }
  ]);

  const createModule = (index: number) => {
    const newModule: WorkflowModuleData = {
      id: Date.now().toString(),
      title: `Agent ${modules.length + 1}`,
      selectedModel: AVAILABLE_MODELS[0],
      prompt: ''
    };

    setModules(prevModules => {
      const newModules = [...prevModules];
      newModules.splice(index, 0, newModule);
      return newModules.map((mod, idx) => ({
        ...mod,
        title: `Agent ${idx + 1}`
      }));
    });
  };

  const deleteModule = (moduleId: string) => {
    setModules(prevModules => {
      if (prevModules.length <= 1) return prevModules;
      const newModules = prevModules.filter(mod => mod.id !== moduleId);
      return newModules.map((mod, idx) => ({
        ...mod,
        title: `Agent ${idx + 1}`
      }));
    });
  };

  const updateModule = (moduleId: string, updates: Partial<WorkflowModuleData>) => {
    setModules(prevModules =>
      prevModules.map(mod =>
        mod.id === moduleId ? { ...mod, ...updates } : mod
      )
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--surface-0)]">
      {/* Header */}
      <header className="h-16 border-b border-[var(--border)] bg-[var(--surface-1)] backdrop-blur-sm backdrop-saturate-150 z-10">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
              A
            </div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">AgentLink</h1>
          </div>
          
          {/* Settings Dropdown */}
          <SettingsDropdown />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-[var(--surface-0)] p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col items-center gap-8">
            <AddModuleButton 
              className="tooltip-top animate-slide-in" 
              onClick={() => createModule(0)}
            />
            
            {modules.map((module, index) => (
              <div 
                key={module.id} 
                className="w-full flex flex-col items-center gap-8 py-4 relative animate-slide-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Module with connecting line */}
                <div className="w-full flex flex-col items-center relative">
                  {index > 0 && (
                    <div className="absolute -top-8 h-8 w-px module-connection" />
                  )}
                  <WorkflowModule 
                    module={module}
                    onUpdate={updateModule}
                    onDelete={deleteModule}
                    canDelete={modules.length > 1}
                  />
                </div>
                
                <AddModuleButton 
                  className="tooltip-bottom relative"
                  onClick={() => createModule(index + 1)}
                />
              </div>
            ))}

            {/* Run Workflow Button */}
            <div className="w-full pt-8 pb-16 flex justify-center">
              <button
                className="px-8 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg font-medium transition-all duration-200 hover-glow flex items-center gap-2 group"
                onClick={() => {/* TODO: Implement workflow execution */}}
              >
                <span>Run Workflow</span>
                <svg
                  className="w-4 h-4 transform transition-transform group-hover:translate-x-1"
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
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
