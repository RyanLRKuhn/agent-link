'use client';

import { useState, useCallback } from 'react';
import { PROVIDER_TEMPLATES, ProviderTemplate } from '../utils/providerTemplates';
import { CustomProvider } from '../utils/customProviders';

interface CustomProviderFormProps {
  onSave: (config: any) => void;
  onCancel: () => void;
  initialProvider?: CustomProvider; // Add support for editing
  mode?: 'create' | 'edit';
}

export default function CustomProviderForm({
  onSave,
  onCancel,
  initialProvider,
  mode = 'create'
}: CustomProviderFormProps) {
  const [name, setName] = useState(initialProvider?.name || '');
  const [endpoint, setEndpoint] = useState(initialProvider?.endpoint || '');
  const [authType, setAuthType] = useState<'bearer' | 'query' | 'header'>(
    initialProvider?.auth.type || 'bearer'
  );
  const [authKey, setAuthKey] = useState(initialProvider?.auth.key || 'Authorization');
  const [apiKey, setApiKey] = useState(initialProvider?.auth.value || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [requestTemplate, setRequestTemplate] = useState(
    initialProvider?.requestTemplate 
      ? JSON.stringify(initialProvider.requestTemplate, null, 2)
      : '{}'
  );
  const [responsePath, setResponsePath] = useState(initialProvider?.responsePath || '');
  const [models, setModels] = useState(initialProvider?.models?.join(', ') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [documentation, setDocumentation] = useState<ProviderTemplate['documentation'] | null>(null);

  // Only allow template selection in create mode
  const handleTemplateChange = useCallback((templateId: string) => {
    if (mode === 'edit') return; // Disable template selection in edit mode

    const template = PROVIDER_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setDocumentation(template.documentation);

      if (templateId !== 'custom') {
        setEndpoint(template.config.endpoint);
        setAuthType(template.config.auth.type);
        setAuthKey(template.config.auth.key);
        setRequestTemplate(JSON.stringify(template.config.requestTemplate, null, 2));
        setResponsePath(template.config.responsePath);
        setModels(template.config.models?.join(', ') || '');
      } else {
        setEndpoint('');
        setAuthType('bearer');
        setAuthKey('Authorization');
        setRequestTemplate('{}');
        setResponsePath('');
        setModels('');
      }
    }
  }, [mode]);

  // Helper function to get user-friendly auth type name
  const getAuthTypeName = (type: 'bearer' | 'query' | 'header') => {
    switch (type) {
      case 'bearer':
        return 'Bearer Token (most common)';
      case 'query':
        return 'URL Query Parameter';
      case 'header':
        return 'Custom Header';
    }
  };

  // Helper function to get user-friendly auth description
  const getAuthDescription = (type: 'bearer' | 'query' | 'header') => {
    switch (type) {
      case 'bearer':
        return 'Your API key will be sent in the Authorization header with "Bearer" prefix';
      case 'query':
        return 'Your API key will be added to the URL as a query parameter';
      case 'header':
        return 'Your API key will be sent in a custom HTTP header';
    }
  };

  const handleTest = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Basic validation
      if (!name.trim()) throw new Error('Provider name is required');
      if (!endpoint.trim()) throw new Error('Endpoint URL is required');
      if (!apiKey.trim()) throw new Error('API key is required');
      if (!responsePath.trim()) throw new Error('Response path is required');
      if (!models.trim()) throw new Error('At least one model is required');

      // Validate URL format
      try {
        new URL(endpoint);
      } catch (error) {
        throw new Error('Invalid URL format');
      }

      // Validate JSON format
      let requestConfig;
      try {
        requestConfig = JSON.parse(requestTemplate);
        if (typeof requestConfig !== 'object') throw new Error();
      } catch (error) {
        throw new Error('Invalid JSON format in request template');
      }

      const config = {
        name,
        endpoint,
        auth: {
          type: authType,
          key: authKey,
          value: apiKey
        },
        requestTemplate: requestConfig,
        responsePath,
        models: models.split(',').map(m => m.trim()).filter(Boolean)
      };

      // Call the test endpoint
      const response = await fetch('/api/custom/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to test configuration');
      }

      setError('Configuration test successful!');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    try {
      const requestConfig = JSON.parse(requestTemplate);

      // Basic validation
      if (!name.trim()) throw new Error('Provider name is required');
      if (!endpoint.trim()) throw new Error('Endpoint URL is required');
      if (!responsePath.trim()) throw new Error('Response path is required');
      if (!requestConfig) throw new Error('Invalid request template JSON');
      if (!apiKey.trim()) throw new Error('API key is required');

      const config = {
        ...(initialProvider && { id: initialProvider.id }), // Preserve ID when editing
        name,
        endpoint,
        auth: {
          type: authType,
          key: authKey,
          value: apiKey
        },
        requestTemplate: requestConfig,
        responsePath,
        models: models.split(',').map(m => m.trim()).filter(Boolean),
        ...(initialProvider && { createdAt: initialProvider.createdAt }) // Preserve creation date
      };

      onSave(config);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Form Title */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium">
          {mode === 'create' ? 'Add Custom Provider' : 'Edit Provider'}
        </h3>
      </div>

      {/* Template Selector - Only show in create mode */}
      {mode === 'create' && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Provider Template
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full px-3 py-1.5 text-sm rounded-lg bg-surface-2
              border border-surface-2 focus:border-primary
              focus:ring-1 focus:ring-primary"
          >
            {PROVIDER_TEMPLATES.map(template => (
              <option key={template.id} value={template.id}>
                {template.name} - {template.description}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Provider Name */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Provider Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., My Custom LLM"
          className="w-full px-3 py-1.5 text-sm rounded-lg bg-surface-2
            border border-surface-2 focus:border-primary
            focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Endpoint URL */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          API Endpoint
          {documentation && (
            <span className="block text-xs text-text-tertiary mt-0.5">
              {documentation.endpoint}
            </span>
          )}
        </label>
        <input
          type="text"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder="https://api.example.com/v1/completions"
          className="w-full px-3 py-1.5 text-sm rounded-lg bg-surface-2
            border border-surface-2 focus:border-primary
            focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Authentication */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          Authentication
          {documentation && (
            <span className="block text-xs text-text-tertiary mt-0.5">
              {documentation.auth}
            </span>
          )}
        </label>
        <div className="space-y-4">
          {/* Auth Type */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Authentication Type
            </label>
            <select
              value={authType}
              onChange={(e) => {
                const newType = e.target.value as 'bearer' | 'query' | 'header';
                setAuthType(newType);
                // Set default auth key name based on type
                switch (newType) {
                  case 'bearer':
                    setAuthKey('Authorization');
                    break;
                  case 'query':
                    setAuthKey('key');
                    break;
                  case 'header':
                    setAuthKey('x-api-key');
                    break;
                }
              }}
              className="w-full px-3 py-1.5 text-sm rounded-lg bg-surface-2
                border border-surface-2 focus:border-primary
                focus:ring-1 focus:ring-primary"
            >
              {(['bearer', 'query', 'header'] as const).map(type => (
                <option key={type} value={type}>
                  {getAuthTypeName(type)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-tertiary">
              {getAuthDescription(authType)}
            </p>
          </div>

          {/* Auth Key Name - Only shown and editable for custom header */}
          {authType === 'header' ? (
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                Custom Header Name
              </label>
              <input
                type="text"
                value={authKey}
                onChange={(e) => setAuthKey(e.target.value)}
                placeholder="e.g., x-api-key"
                className="w-full px-3 py-1.5 text-sm rounded-lg bg-surface-2
                  border border-surface-2 focus:border-primary
                  focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-text-tertiary">
                The name of the custom HTTP header that will contain your API key
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                {authType === 'bearer' ? 'Authorization Header' : 'Query Parameter Name'}
              </label>
              <div className="w-full px-3 py-1.5 text-sm rounded-lg bg-surface-2/50
                border border-surface-2 text-text-secondary">
                {authKey}
              </div>
              <p className="mt-1 text-xs text-text-tertiary">
                {authType === 'bearer' 
                  ? 'Standard header name for Bearer token authentication'
                  : 'Standard query parameter name for API key'}
              </p>
            </div>
          )}

          {/* API Key */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={authType === 'bearer' 
                  ? 'sk_...' 
                  : authType === 'query'
                    ? 'Your API key'
                    : 'Enter API key'
                }
                className="w-full px-3 py-1.5 text-sm rounded-lg bg-surface-2
                  border border-surface-2 focus:border-primary
                  focus:ring-1 focus:ring-primary pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute inset-y-0 right-0 px-3
                  text-text-secondary hover:text-text-primary
                  transition-colors"
              >
                {showApiKey ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-text-tertiary">
              {authType === 'bearer'
                ? 'Your secret API key - will be sent as "Bearer YOUR_KEY"'
                : authType === 'query'
                  ? 'Your secret API key - will be added to URLs as ?key=YOUR_KEY'
                  : 'Your secret API key - will be sent in the custom header'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Request Template */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Request Template
          {documentation && (
            <span className="block text-xs text-text-tertiary mt-0.5">
              {documentation.requestFormat}
            </span>
          )}
        </label>
        <textarea
          value={requestTemplate}
          onChange={(e) => setRequestTemplate(e.target.value)}
          placeholder="JSON template with {{prompt}} and {{model}} variables"
          rows={6}
          className="w-full px-3 py-1.5 text-sm rounded-lg bg-surface-2
            border border-surface-2 focus:border-primary
            focus:ring-1 focus:ring-primary font-mono"
        />
      </div>

      {/* Response Path */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Response Path
          {documentation && (
            <span className="block text-xs text-text-tertiary mt-0.5">
              {documentation.responseFormat}
            </span>
          )}
        </label>
        <input
          type="text"
          value={responsePath}
          onChange={(e) => setResponsePath(e.target.value)}
          placeholder="e.g., choices[0].message.content"
          className="w-full px-3 py-1.5 text-sm rounded-lg bg-surface-2
            border border-surface-2 focus:border-primary
            focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Available Models */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Available Models
          {documentation && (
            <span className="block text-xs text-text-tertiary mt-0.5">
              {documentation.models}
            </span>
          )}
        </label>
        <input
          type="text"
          value={models}
          onChange={(e) => setModels(e.target.value)}
          placeholder="model-1, model-2, model-3"
          className="w-full px-3 py-1.5 text-sm rounded-lg bg-surface-2
            border border-surface-2 focus:border-primary
            focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className={`p-3 text-sm rounded-lg ${
          error === 'Configuration test successful!'
            ? 'bg-success/10 text-success border border-success/20'
            : 'bg-error/10 text-error border border-error/20'
        }`}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm font-medium rounded-lg
            bg-surface-2 hover:bg-surface-3
            border border-surface-2 hover:border-surface-3
            transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleTest}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm font-medium rounded-lg
            bg-surface-2 hover:bg-surface-3
            border border-surface-2 hover:border-surface-3
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Testing...
            </>
          ) : (
            'Test Configuration'
          )}
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm font-medium rounded-lg
            bg-primary hover:bg-primary-hover text-white
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mode === 'create' ? 'Save Provider' : 'Update Provider'}
        </button>
      </div>
    </div>
  );
} 