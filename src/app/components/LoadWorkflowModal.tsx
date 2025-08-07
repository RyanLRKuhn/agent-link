import { useState, useEffect } from 'react';
import { StoredWorkflow } from '@/lib/workflows';

interface LoadWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (workflowId: string) => Promise<void>;
}

interface WorkflowListItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export default function LoadWorkflowModal({
  isOpen,
  onClose,
  onLoad
}: LoadWorkflowModalProps) {
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingWorkflowId, setLoadingWorkflowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchWorkflows();
    }
  }, [isOpen]);

  const fetchWorkflows = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/workflows');
      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }
      const data = await response.json();
      setWorkflows(data);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      setError('Failed to load workflows');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = async (workflowId: string) => {
    setLoadingWorkflowId(workflowId);
    try {
      await onLoad(workflowId);
      onClose();
    } catch (error) {
      console.error('Error loading workflow:', error);
      setError('Failed to load workflow');
    } finally {
      setLoadingWorkflowId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-surface-0/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-1 rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Load Workflow</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-2 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 text-sm rounded-lg bg-error/10 text-error border border-error/20">
            {error}
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="w-8 h-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <p>No saved workflows found</p>
              <p className="text-sm mt-1">Save a workflow to see it here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {workflows.map(workflow => (
                <div
                  key={workflow.id}
                  className="flex items-center justify-between p-4 rounded-lg
                    bg-surface-2 border border-surface-2 group"
                >
                  <div>
                    <h3 className="font-medium">{workflow.name}</h3>
                    <p className="text-sm text-text-secondary">
                      Created {new Date(workflow.createdAt).toLocaleDateString()}
                      {workflow.updatedAt !== workflow.createdAt && 
                        ` • Updated ${new Date(workflow.updatedAt).toLocaleDateString()}`
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => handleLoad(workflow.id)}
                    disabled={loadingWorkflowId === workflow.id}
                    className="px-4 py-2 text-sm font-medium rounded-lg
                      bg-primary hover:bg-primary-hover text-white
                      transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                      opacity-0 group-hover:opacity-100 flex items-center gap-2"
                  >
                    {loadingWorkflowId === workflow.id ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Loading...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Load
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 