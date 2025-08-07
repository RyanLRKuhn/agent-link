'use client';

import { useState } from 'react';
import { CustomProvider, validateProviderConfig } from '../utils/customProviders';

/**
 * Props for the CustomProviderForm component
 * @interface CustomProviderFormProps
 */
interface CustomProviderFormProps {
  /** Callback function to save the provider configuration */
  onSave: (config: Omit<CustomProvider, 'id' | 'createdAt'>) => void;
  /** Callback function to cancel form submission */
  onCancel: () => void;
  /** Optional initial data for editing an existing provider */
  initialData?: Omit<CustomProvider, 'id' | 'createdAt'>;
}

/**
 * CustomProviderForm Component
 * 
 * A form for adding or editing custom LLM provider configurations.
 * Handles validation, testing, and saving of provider configurations.
 * 
 * @param {CustomProviderFormProps} props - Component props
 */
export default function CustomProviderForm({
  onSave,
  onCancel,
  initialData
}: CustomProviderFormProps) {
  // Form state with default values or initial data
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    endpoint: initialData?.endpoint || '',
    authType: initialData?.auth?.type || 'bearer',
    authKey: initialData?.auth?.key || '',
    requestTemplate: initialData?.requestTemplate
      ? JSON.stringify(initialData.requestTemplate, null, 2)
      : JSON.stringify({ body: { prompt: '{{prompt}}' } }, null, 2),
    responsePath: initialData?.responsePath || '',
    models: initialData?.models?.join(', ') || '',
    description: initialData?.description || ''
  });

  // Error and test status state
  const [error, setError] = useState<string | null>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  /**
   * Handle form input changes
   * @param {React.ChangeEvent} e - Input change event
   */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError(null);
    setTestResult(null);
  };

  /**
   * Validate form data and return config object if valid
   * @returns {Object|null} Validated config object or null if invalid
   */
  const validateForm = () => {
    try {
      // Validate request template JSON
      const requestTemplate = JSON.parse(formData.requestTemplate);

      const config = {
        name: formData.name,
        endpoint: formData.endpoint,
        auth: {
          type: formData.authType as 'bearer' | 'query' | 'header',
          key: formData.authKey
        },
        requestTemplate,
        responsePath: formData.responsePath,
        models: formData.models.split(',').map(m => m.trim()).filter(Boolean),
        description: formData.description || undefined
      };

      const errors = validateProviderConfig(config);
      if (errors.length > 0) {
        setError(errors.map(e => `${e.field}: ${e.message}`).join('\n'));
        return null;
      }

      return config;
    } catch (e) {
      setError('Invalid JSON in request template');
      return null;
    }
  };

  /**
   * Test the provider configuration with a sample request
   */
  const handleTest = async () => {
    const config = validateForm();
    if (!config) return;

    setIsTestLoading(true);
    setTestResult(null);
    setError(null);

    try {
      // Make a test request to the custom provider
      const response = await fetch('/api/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Test prompt',
          apiKey: 'test_key',
          model: config.models[0] || 'test_model',
          providerConfig: {
            endpoint: config.endpoint,
            method: 'POST',
            auth: config.auth,
            requestTemplate: config.requestTemplate,
            responsePath: config.responsePath
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Test failed');
      }

      setTestResult({
        success: true,
        message: 'Configuration test successful!'
      });
    } catch (e) {
      setTestResult({
        success: false,
        message: `Test failed: ${(e as Error).message}`
      });
    } finally {
      setIsTestLoading(false);
    }
  };

  /**
   * Handle form submission
   * @param {React.FormEvent} e - Form submit event
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const config = validateForm();
    if (config) {
      onSave(config);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Provider Name */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
          Provider Name
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface-1)] border border-[var(--border)]
            focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50"
          placeholder="e.g., Custom GPT Provider"
        />
      </div>

      {/* API Endpoint */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
          API Endpoint
        </label>
        <input
          type="text"
          name="endpoint"
          value={formData.endpoint}
          onChange={handleInputChange}
          className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface-1)] border border-[var(--border)]
            focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50"
          placeholder="https://api.example.com/v1/{{model}}"
        />
      </div>

      {/* Authentication */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            Authentication Type
          </label>
          <select
            name="authType"
            value={formData.authType}
            onChange={handleInputChange}
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface-1)] border border-[var(--border)]
              focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50"
          >
            <option value="bearer">Bearer Token</option>
            <option value="query">Query Parameter</option>
            <option value="header">Header</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            Auth Key Name
          </label>
          <input
            type="text"
            name="authKey"
            value={formData.authKey}
            onChange={handleInputChange}
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface-1)] border border-[var(--border)]
              focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50"
            placeholder={formData.authType === 'bearer' ? 'Authorization' : 'api_key'}
          />
        </div>
      </div>

      {/* Request Template */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
          Request Template (JSON)
        </label>
        <textarea
          name="requestTemplate"
          value={formData.requestTemplate}
          onChange={handleInputChange}
          rows={5}
          className="w-full px-3 py-2 text-sm font-mono rounded-lg bg-[var(--surface-1)] border border-[var(--border)]
            focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50"
          placeholder="Enter request template JSON..."
        />
      </div>

      {/* Response Path */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
          Response Path
        </label>
        <input
          type="text"
          name="responsePath"
          value={formData.responsePath}
          onChange={handleInputChange}
          className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface-1)] border border-[var(--border)]
            focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50"
          placeholder="response.choices[0].text"
        />
      </div>

      {/* Available Models */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
          Available Models (comma-separated)
        </label>
        <input
          type="text"
          name="models"
          value={formData.models}
          onChange={handleInputChange}
          className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface-1)] border border-[var(--border)]
            focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50"
          placeholder="model-1, model-2, model-3"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
          Description (optional)
        </label>
        <input
          type="text"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface-1)] border border-[var(--border)]
            focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50"
          placeholder="Brief description of this provider..."
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 text-sm rounded-lg bg-red-500/10 border border-red-500/20 text-red-500">
          <pre className="whitespace-pre-wrap font-mono">{error}</pre>
        </div>
      )}

      {/* Test Result */}
      {testResult && (
        <div className={`p-3 text-sm rounded-lg ${
          testResult.success
            ? 'bg-green-500/10 border-green-500/20 text-green-500'
            : 'bg-red-500/10 border-red-500/20 text-red-500'
        } border`}>
          <div className="flex items-center gap-2">
            {testResult.success ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {testResult.message}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleTest}
          disabled={isTestLoading}
          className="px-4 py-2 text-sm font-medium rounded-lg
            bg-[var(--surface-2)] hover:bg-[var(--surface-3)]
            border border-[var(--border)] transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-2"
        >
          {isTestLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Testing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Test Configuration
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium rounded-lg
            bg-[var(--surface-2)] hover:bg-[var(--surface-3)]
            border border-[var(--border)] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium rounded-lg
            bg-blue-500 hover:bg-blue-600 text-white
            transition-colors disabled:opacity-50
            flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Save Provider
        </button>
      </div>
    </form>
  );
} 