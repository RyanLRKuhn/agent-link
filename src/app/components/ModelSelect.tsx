'use client';

import { useState, useEffect } from 'react';
import { getCustomProviders } from '../utils/customProviders';
import { 
  Provider, 
  BuiltInProvider, 
  CustomProvider, 
  isBuiltInProvider,
  isCustomProvider,
  getProviderId,
  PROVIDER_NAMES 
} from '../types/workflow';

interface ModelSelectProps {
  selectedProvider: Provider | null;
  selectedModel: string | null;
  onProviderChange: (provider: Provider | null) => void;
  onModelChange: (model: string | null) => void;
}

// Built-in provider definitions
const BUILT_IN_PROVIDERS: BuiltInProvider[] = ['anthropic', 'openai', 'google'];

// Fallback models for built-in providers
const FALLBACK_MODELS: Record<BuiltInProvider, string[]> = {
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  google: ['gemini-1.5-pro', 'gemini-1.5-flash']
};

export default function ModelSelect({
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange
}: ModelSelectProps) {
  const [hasKeys, setHasKeys] = useState<Record<string, boolean>>({});
  const [availableModels, setAvailableModels] = useState<Record<string, string[]>>({});
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load providers and check API keys
  useEffect(() => {
    const loadProviders = () => {
      // Get custom providers
      const customProviders = getCustomProviders().map(provider => ({
        id: provider.id,
        name: provider.name,
        type: 'custom' as const,
        models: provider.models || []
      })) as CustomProvider[];

      // Combine built-in and custom providers
      setProviders([
        ...BUILT_IN_PROVIDERS,
        ...customProviders
      ]);

      // Check API keys
      const anthropicKey = sessionStorage.getItem('anthropic_api_key');
      const openaiKey = sessionStorage.getItem('openai_api_key');
      const googleKey = sessionStorage.getItem('google_api_key');

      setHasKeys({
        anthropic: !!anthropicKey,
        openai: !!openaiKey,
        google: !!googleKey,
        ...customProviders.reduce((acc, provider) => ({
          ...acc,
          [provider.id]: true // Custom providers don't need key validation
        }), {})
      });

      // Load available models
      const modelsStr = sessionStorage.getItem('available_models');
      if (modelsStr) {
        try {
          const parsed = JSON.parse(modelsStr);
          setAvailableModels({
            anthropic: parsed.anthropic || FALLBACK_MODELS.anthropic,
            openai: parsed.openai || FALLBACK_MODELS.openai,
            google: parsed.google || FALLBACK_MODELS.google,
            ...customProviders.reduce((acc, provider) => ({
              ...acc,
              [provider.id]: provider.models || []
            }), {})
          });
        } catch (error) {
          console.error('Failed to parse available models:', error);
          setAvailableModels({
            anthropic: FALLBACK_MODELS.anthropic,
            openai: FALLBACK_MODELS.openai,
            google: FALLBACK_MODELS.google,
            ...customProviders.reduce((acc, provider) => ({
              ...acc,
              [provider.id]: provider.models || []
            }), {})
          });
        }
      } else {
        setAvailableModels({
          anthropic: FALLBACK_MODELS.anthropic,
          openai: FALLBACK_MODELS.openai,
          google: FALLBACK_MODELS.google,
          ...customProviders.reduce((acc, provider) => ({
            ...acc,
            [provider.id]: provider.models || []
          }), {})
        });
      }

      setIsLoading(false);
    };

    loadProviders();

    // Listen for storage changes
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'customProviders' || event.key?.endsWith('_api_key') || event.key === 'available_models') {
        loadProviders();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Reset model when provider changes
  useEffect(() => {
    if (selectedProvider) {
      const providerId = getProviderId(selectedProvider);
      if (providerId && (!selectedModel || !availableModels[providerId]?.includes(selectedModel))) {
        onModelChange(null);
      }
    }
  }, [selectedProvider, selectedModel, availableModels, onModelChange]);

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-9 bg-surface-2 rounded-lg"></div>
        <div className="h-9 bg-surface-2 rounded-lg"></div>
      </div>
    );
  }

  // Get the current provider's models
  const currentModels = selectedProvider ? (() => {
    const providerId = getProviderId(selectedProvider);
    return providerId ? availableModels[providerId] || [] : [];
  })() : [];

  return (
    <div className="space-y-2">
      {/* Provider Select */}
      <div>
        <select
          value={selectedProvider ? getProviderId(selectedProvider) || '' : ''}
          onChange={(e) => {
            const value = e.target.value;
            if (!value) {
              onProviderChange(null);
            } else {
              // Check if it's a built-in provider
              if (BUILT_IN_PROVIDERS.includes(value as BuiltInProvider)) {
                onProviderChange(value as BuiltInProvider);
              } else {
                // Find custom provider
                const customProvider = providers.find(p => !isBuiltInProvider(p) && p.id === value);
                if (customProvider) {
                  onProviderChange(customProvider);
                }
              }
            }
          }}
          className="w-full px-3 py-1.5 text-sm rounded-lg bg-surface-2
            border border-surface-2 focus:border-primary
            focus:ring-1 focus:ring-primary"
        >
          <option value="">Select Provider</option>
          
          {/* Built-in Providers */}
          <optgroup label="Built-in Providers">
            {BUILT_IN_PROVIDERS.map(provider => (
              <option
                key={provider}
                value={provider}
                disabled={!hasKeys[provider]}
              >
                {PROVIDER_NAMES[provider]} {!hasKeys[provider] && '(API Key Required)'}
              </option>
            ))}
          </optgroup>

          {/* Custom Providers */}
          {providers.filter(isCustomProvider).length > 0 && (
            <optgroup label="Custom Providers">
              {providers
                .filter(isCustomProvider)
                .map(provider => (
                  <option
                    key={provider.id}
                    value={provider.id}
                  >
                    {provider.name}
                  </option>
                ))
              }
            </optgroup>
          )}
        </select>
      </div>

      {/* Model Select */}
      <div>
        <select
          value={selectedModel || ''}
          onChange={(e) => onModelChange(e.target.value || null)}
          disabled={!selectedProvider}
          className="w-full px-3 py-1.5 text-sm rounded-lg bg-surface-2
            border border-surface-2 focus:border-primary
            focus:ring-1 focus:ring-primary
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Select Model</option>
          {currentModels.map(model => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
} 