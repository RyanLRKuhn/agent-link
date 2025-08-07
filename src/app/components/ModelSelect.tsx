'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getCustomProviders } from '../utils/customProviders';
import { 
  Provider, 
  BuiltInProvider, 
  CustomProvider, 
  isBuiltInProvider, 
  isCustomProvider,
  PROVIDER_NAMES 
} from '../types/workflow';

interface ModelSelectProps {
  onProviderChange: (provider: Provider | null) => void;
  onModelChange: (model: string | null) => void;
  selectedProvider: Provider | null;
  selectedModel: string | null;
}

interface AvailableModels {
  [key: string]: string[];
}

// Built-in provider definitions
const BUILT_IN_PROVIDERS: BuiltInProvider[] = ['anthropic', 'openai', 'google'];

// Fallback models for built-in providers
const FALLBACK_MODELS: Record<BuiltInProvider, string[]> = {
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  google: ['gemini-1.5-pro', 'gemini-1.5-flash']
};

// Helper to safely access sessionStorage
const getStorageValue = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(key);
};

export default function ModelSelect({
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange
}: ModelSelectProps) {
  // Memoize providers to prevent re-renders
  const [providers, setProviders] = useState<Provider[]>([]);
  const [hasKeys, setHasKeys] = useState<Record<string, boolean>>({});
  const [availableModels, setAvailableModels] = useState<AvailableModels>({});
  const [isLoading, setIsLoading] = useState(true);

  // Memoize the loadProviders function
  const loadProviders = useCallback(() => {
    // Get custom providers
    const customProviders = getCustomProviders().map(provider => ({
      id: provider.id,
      name: provider.name,
      type: 'custom' as const,
      models: provider.models || []
    })) as CustomProvider[];

    // Combine built-in and custom providers
    setProviders([...BUILT_IN_PROVIDERS, ...customProviders]);

    // Check API keys
    const anthropicKey = getStorageValue('anthropic_api_key');
    const openaiKey = getStorageValue('openai_api_key');
    const googleKey = getStorageValue('google_api_key');

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
    const modelsStr = getStorageValue('available_models');
    let models: AvailableModels;
    
    try {
      models = modelsStr ? JSON.parse(modelsStr) : {};
    } catch (error) {
      console.error('Failed to parse available models:', error);
      models = {};
    }

    setAvailableModels({
      anthropic: models.anthropic || FALLBACK_MODELS.anthropic,
      openai: models.openai || FALLBACK_MODELS.openai,
      google: models.google || FALLBACK_MODELS.google,
      ...customProviders.reduce((acc, provider) => ({
        ...acc,
        [provider.id]: provider.models || []
      }), {})
    });

    setIsLoading(false);
  }, []); // No dependencies needed as this only uses external state

  // Load providers on mount and storage changes
  useEffect(() => {
    loadProviders();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'customProviders' || 
          event.key?.endsWith('_api_key') || 
          event.key === 'available_models') {
        loadProviders();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadProviders]);

  // Reset model when provider changes or available models update
  useEffect(() => {
    if (selectedProvider && selectedModel) {
      const providerId = isBuiltInProvider(selectedProvider) 
        ? selectedProvider 
        : selectedProvider.id;
      
      const providerModels = availableModels[providerId] || [];
      if (!providerModels.includes(selectedModel)) {
        onModelChange(null);
      }
    }
  }, [selectedProvider, selectedModel, availableModels, onModelChange]);

  // Memoize current provider's models
  const currentModels = useMemo(() => {
    if (!selectedProvider) return [];
    const providerId = isBuiltInProvider(selectedProvider) 
      ? selectedProvider 
      : selectedProvider.id;
    return availableModels[providerId] || [];
  }, [selectedProvider, availableModels]);

  // Memoize provider change handler
  const handleProviderChange = useCallback((value: string) => {
    if (!value) {
      onProviderChange(null);
      return;
    }

    // Check if it's a built-in provider
    if (BUILT_IN_PROVIDERS.includes(value as BuiltInProvider)) {
      onProviderChange(value as BuiltInProvider);
    } else {
      // Find custom provider
      const customProvider = providers.find(p => 
        isCustomProvider(p) && p.id === value
      );
      if (customProvider) {
        onProviderChange(customProvider);
      }
    }
  }, [providers, onProviderChange]);

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-9 bg-surface-2 rounded-lg"></div>
        <div className="h-9 bg-surface-2 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Provider Select */}
      <div>
        <select
          value={selectedProvider ? (isBuiltInProvider(selectedProvider) 
            ? selectedProvider 
            : selectedProvider.id) : ''}
          onChange={(e) => handleProviderChange(e.target.value)}
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