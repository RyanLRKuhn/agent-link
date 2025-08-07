'use client';

import { useState, useCallback, useMemo } from 'react';
import AddModuleButton from './components/AddModuleButton';
import WorkflowModule from './components/WorkflowModule';
import FlowIndicator from './components/FlowIndicator';
import WorkflowOutput from './components/WorkflowOutput';
import ErrorDisplay from './components/ErrorDisplay';
import ProgressBar from './components/ProgressBar';
import StatusIndicator from './components/StatusIndicator';
import { WorkflowModuleData } from './types/workflow';
import { useWorkflowStore } from './store/workflowStore';
import SaveWorkflowModal from './components/SaveWorkflowModal';
import SuccessNotification from './components/SuccessNotification';
import LoadWorkflowModal from './components/LoadWorkflowModal';
import type { Provider } from './types/workflow';

export default function Home() {
  const [modules, setModules] = useState<WorkflowModuleData[]>([{
    id: '1',
    title: 'Agent 1',
    provider: null,
    selectedModel: null,
    prompt: ''
  }]);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { 
    isRunning, 
    currentAgentIndex, 
    results, 
    agentStatus, 
    error, 
    failedAgentIndex,
    startWorkflow,
    stopWorkflow
  } = useWorkflowStore();

  // Memoize module management functions
  const createModule = useCallback((index: number) => {
    const newModule: WorkflowModuleData = {
      id: String(Date.now()),
      title: `Agent ${modules.length + 1}`,
      provider: null,
      selectedModel: null,
      prompt: ''
    };

    setModules(prev => [
      ...prev.slice(0, index + 1),
      newModule,
      ...prev.slice(index + 1)
    ]);
  }, [modules.length]);

  const updateModule = useCallback((moduleId: string, updates: Partial<WorkflowModuleData>) => {
    console.log('Updating module:', moduleId, updates); // Debug log
    setModules(prev => prev.map(module => 
      module.id === moduleId
        ? { ...module, ...updates }
        : module
    ));
  }, []);

  const deleteModule = useCallback((moduleId: string) => {
    setModules(prev => {
      const newModules = prev.filter(m => m.id !== moduleId);
      // Renumber modules
      return newModules.map((module, index) => ({
        ...module,
        title: `Agent ${index + 1}`
      }));
    });
  }, []);

  const handleRetryFromFailed = useCallback(() => {
    if (failedAgentIndex >= 0) {
      startWorkflow(modules, failedAgentIndex);
    }
  }, [failedAgentIndex, modules, startWorkflow]);

  const handleRetryAll = useCallback(() => {
    startWorkflow(modules, 0);
  }, [modules, startWorkflow]);

  const handleExport = useCallback(() => {
    const exportData = {
      metadata: {
        timestamp: new Date().toISOString(),
        totalTime: results.reduce((sum, r) => sum + r.executionTime, 0),
        totalTokens: results.reduce((sum, r) => {
          return sum + (r.usage?.input_tokens || 0) + (r.usage?.output_tokens || 0);
        }, 0),
      },
      workflow: {
        agents: modules.map(m => ({
          title: m.title,
          model: m.selectedModel,
          role: m.prompt
        })),
        results: results.map(r => ({
          agent: modules[r.agentIndex].title,
          input: r.input,
          output: r.output,
          executionTime: r.executionTime,
          usage: r.usage,
          timestamp: r.timestamp
        }))
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${new Date().toISOString().split('.')[0].replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [modules, results]);

  const handleSaveWorkflow = async (name: string) => {
    try {
      const response = await fetch('/api/workflows/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules, name })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save workflow');
      }

      const workflow = await response.json();
      setSuccessMessage(`Workflow saved successfully! ID: ${workflow.id}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('Failed to save workflow:', error);
      setSuccessMessage(`Error: ${error instanceof Error ? error.message : 'Failed to save workflow'}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleLoadWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load workflow');
      }

      const workflow = await response.json();
      setModules(workflow.modules);
      setSuccessMessage('Workflow loaded successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('Failed to load workflow:', error);
      throw error; // Re-throw to be handled by the modal
    }
  };

  // Memoize module rendering
  const renderModules = useMemo(() => {
    return modules.map((module, index) => {
      const status = agentStatus[module.id];
      const isActive = isRunning && currentAgentIndex === index;
      const isPreviousActive = isRunning && currentAgentIndex === index - 1;
      const previousModule = index > 0 ? modules[index - 1] : null;
      const isTransitioning = isPreviousActive && status?.isExecuting;

      return (
        <div 
          key={module.id} 
          className="w-full flex flex-col items-center animate-slide-in"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          {index > 0 && (
            <FlowIndicator 
              isActive={isPreviousActive}
              fromAgent={previousModule?.title}
              toAgent={module.title}
              isTransitioning={isTransitioning}
            />
          )}

          <div className={`w-full transition-all duration-300 ${
            isActive ? 'scale-[1.02]' : ''
          }`}>
            <WorkflowModule 
              module={module}
              onUpdate={updateModule}
              onDelete={deleteModule}
              canDelete={modules.length > 1}
              index={index}
              isExecuting={status?.isExecuting}
              isComplete={status?.isComplete}
              executionError={status?.error}
              executionTime={status?.executionTime}
            />
          </div>

          {(status?.isExecuting || status?.isComplete || status?.error) && (
            <div className="mt-4 animate-fade-in">
              <StatusIndicator
                isExecuting={status.isExecuting}
                isComplete={status.isComplete}
                error={status.error}
                executionTime={status.executionTime}
              />
            </div>
          )}

          <div className="my-8">
            <AddModuleButton 
              onClick={() => createModule(index + 1)}
            />
          </div>
        </div>
      );
    });
  }, [modules, agentStatus, isRunning, currentAgentIndex, updateModule, deleteModule, createModule]);

  return (
    <div className="min-h-screen bg-[var(--surface-0)] flex flex-col">
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col items-center">
            {isRunning && (
              <ProgressBar 
                totalSteps={modules.length} 
                currentStep={currentAgentIndex} 
                isRunning={isRunning}
              />
            )}

            <AddModuleButton 
              className="mb-8 animate-slide-in" 
              onClick={() => createModule(0)}
            />
            
            {renderModules}

            <div className="w-full flex justify-center gap-4 mb-16">
              {isRunning ? (
                <button
                  onClick={stopWorkflow}
                  className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium 
                    transition-all duration-200 hover:shadow-[var(--glow)] flex items-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Stop Workflow
                </button>
              ) : (
                <>
                  <button
                    onClick={() => startWorkflow(modules)}
                    className="px-8 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg 
                      font-medium transition-all duration-200 hover:shadow-[var(--glow)] flex items-center gap-3"
                    disabled={isRunning || modules.some(m => !m.prompt)}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Run Workflow
                  </button>

                  <button
                    onClick={() => setIsSaveModalOpen(true)}
                    className="px-8 py-3 bg-surface-2 hover:bg-surface-3 rounded-lg 
                      font-medium transition-all duration-200 border border-surface-2
                      hover:border-surface-3 flex items-center gap-3"
                    disabled={modules.some(m => !m.prompt)}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save Workflow
                  </button>

                  <button
                    onClick={() => setIsLoadModalOpen(true)}
                    className="px-8 py-3 bg-surface-2 hover:bg-surface-3 rounded-lg 
                      font-medium transition-all duration-200 border border-surface-2
                      hover:border-surface-3 flex items-center gap-3"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Load Workflow
                  </button>
                </>
              )}
            </div>

            {error && !isRunning && (
              <div className="w-full mb-16">
                <ErrorDisplay
                  error={error}
                  failedAgentIndex={failedAgentIndex}
                  modules={modules}
                  onRetryFromFailed={handleRetryFromFailed}
                  onRetryAll={handleRetryAll}
                />
              </div>
            )}

            {!isRunning && results.length > 0 && !error && (
              <div className="w-full mt-16 pt-16 border-t border-[var(--border)]">
                <WorkflowOutput 
                  modules={modules}
                  results={results}
                  onExport={handleExport}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      <SaveWorkflowModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveWorkflow}
      />

      <LoadWorkflowModal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        onLoad={handleLoadWorkflow}
      />

      {successMessage && (
        <SuccessNotification
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}
    </div>
  );
}
