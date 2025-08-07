import { useState, useEffect, useCallback } from 'react';
import type { StoredWorkflow } from '@/lib/workflows';

interface LoadWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (workflowId: string) => Promise<void>;
  onWorkflowSaved?: () => void; // New prop for refresh trigger
}

interface WorkflowListItem extends Omit<StoredWorkflow, 'modules'> {
  modules?: Array<{ title: string }>;
}

export default function LoadWorkflowModal({
  isOpen,
  onClose,
  onLoad,
  onWorkflowSaved
}: LoadWorkflowModalProps) {
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingWorkflowId, setLoadingWorkflowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // For manual refresh

  // Fetch workflows when opened or when refreshKey changes
  useEffect(() => {
    if (isOpen) {
      fetchWorkflows();
    }
  }, [isOpen, refreshKey]);

  // Listen for workflow saved events
  useEffect(() => {
    if (onWorkflowSaved) {
      onWorkflowSaved();
    }
  }, [onWorkflowSaved]);

  const fetchWorkflows = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Add cache-busting query parameter
      const response = await fetch(`/api/workflows/list?t=${Date.now()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch workflows');
      }
      const data = await response.json();
      setWorkflows(data);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      setError('Failed to load workflows');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Function to trigger manual refresh
  const refreshList = useCallback(() => {
    setRefreshKey(key => key + 1);
  }, []);

  // Clear copied state after 2 seconds
  useEffect(() => {
    if (copiedId) {
      const timer = setTimeout(() => setCopiedId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedId]);

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

  const handleCopyId = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering load
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
    } catch (error) {
      console.error('Failed to copy ID:', error);
    }
  };

  const formatAgentTitles = (workflow: WorkflowListItem) => {
    if (!workflow.modules || workflow.modules.length === 0) return null;
    
    const titles = workflow.modules.map(m => m.title);
    if (titles.length <= 3) {
      return titles.join(', ');
    }
    return `${titles.slice(0, 3).join(', ')} + ${titles.length - 3} more`;
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
      <div className="relative bg-surface-1 rounded-lg shadow-lg p-6 max-w-3xl w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Load Workflow</h2>
          <div className="flex items-center gap-2">
            {/* Add refresh button */}
            <button
              onClick={refreshList}
              disabled={isLoading}
              className="p-2 hover:bg-surface-2 rounded-lg transition-colors
                text-text-secondary hover:text-primary disabled:opacity-50"
              title="Refresh workflow list"
            >
              <svg 
                className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-2 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
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
                    bg-surface-2 border border-surface-2 group hover:border-surface-3"
                >
                  <div className="flex-1 min-w-0">
                    {/* Primary Info */}
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-medium truncate">{workflow.name}</h3>
                      <div className="flex items-center gap-2 ml-4">
                        <code className="px-2 py-1 text-xs bg-surface-3 rounded font-mono">
                          {workflow.id}
                        </code>
                        <button
                          onClick={(e) => handleCopyId(workflow.id, e)}
                          className={`p-1.5 rounded transition-colors ${
                            copiedId === workflow.id
                              ? 'bg-success/10 text-success'
                              : 'hover:bg-surface-3 text-text-secondary'
                          }`}
                          title="Copy ID"
                        >
                          {copiedId === workflow.id ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Secondary Info */}
                    <div className="flex flex-col gap-1">
                      <p className="text-sm text-text-secondary">
                        Created {new Date(workflow.createdAt).toLocaleDateString()}
                        {workflow.updatedAt !== workflow.createdAt && 
                          ` • Updated ${new Date(workflow.updatedAt).toLocaleDateString()}`
                        }
                      </p>
                      {workflow.description && (
                        <p className="text-sm text-text-secondary">{workflow.description}</p>
                      )}
                      {formatAgentTitles(workflow) && (
                        <p className="text-xs text-text-tertiary font-medium">
                          {formatAgentTitles(workflow)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Load Button */}
                  <button
                    onClick={() => handleLoad(workflow.id)}
                    disabled={loadingWorkflowId === workflow.id}
                    className="ml-4 px-4 py-2 text-sm font-medium rounded-lg
                      bg-primary hover:bg-primary-hover text-white
                      transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                      opacity-0 group-hover:opacity-100 flex items-center gap-2
                      whitespace-nowrap"
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