import { useState } from 'react';

interface SaveWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

export default function SaveWorkflowModal({
  isOpen,
  onClose,
  onSave
}: SaveWorkflowModalProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave(name);
      setName('');
      onClose();
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-surface-0/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-1 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Save Workflow</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label 
              htmlFor="workflow-name" 
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              Workflow Name
            </label>
            <input
              id="workflow-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter workflow name..."
              className="w-full px-3 py-2 text-sm rounded-lg
                bg-surface-2 border border-surface-2
                focus:border-primary focus:ring-1 focus:ring-primary
                placeholder-text-tertiary"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg
                bg-surface-2 hover:bg-surface-3
                border border-surface-2 hover:border-surface-3
                transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-lg
                bg-primary hover:bg-primary-hover text-white
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save Workflow
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 