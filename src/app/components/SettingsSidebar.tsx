'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getCustomProviders, saveCustomProvider, deleteCustomProvider } from '../utils/customProviders';
import CustomProviderForm from './CustomProviderForm';

/**
 * Interface for API key validation status
 * @interface ApiKeyStatus
 */
interface ApiKeyStatus {
  isConfigured: boolean;  // Whether the key is saved in storage
  isValid: boolean;       // Whether the key has been validated
  isLoading: boolean;     // Whether validation is in progress
  error: string | null;   // Error message if validation failed
}

/**
 * Combined status for all provider API keys
 * @interface KeyStatus
 */
interface KeyStatus {
  anthropic: ApiKeyStatus;
  openai: ApiKeyStatus;
  google: ApiKeyStatus;
}

/**
 * Status message for model refresh operations
 * @interface RefreshStatus
 */
interface RefreshStatus {
  type: 'success' | 'error' | 'warning';
  message: string;
}

/**
 * SettingsSidebar Component
 * 
 * A slide-in sidebar for managing API keys, custom providers, and model settings.
 * Handles API key validation, model fetching, and custom provider management.
 */
export default function SettingsSidebar() {
  // Refs for click-outside detection
  const sidebarRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  // State for sidebar visibility and API keys
  const [isOpen, setIsOpen] = useState(false);
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');

  // State for API key validation status
  const [keyStatus, setKeyStatus] = useState<KeyStatus>({
    anthropic: {
      isConfigured: false,
      isValid: false,
      isLoading: false,
      error: null
    },
    openai: {
      isConfigured: false,
      isValid: false,
      isLoading: false,
      error: null
    },
    google: {
      isConfigured: false,
      isValid: false,
      isLoading: false,
      error: null
    }
  });

  // State for model refresh status and custom providers
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCustomProviderForm, setShowCustomProviderForm] = useState(false);
  const [customProviders, setCustomProviders] = useState(getCustomProviders());

  /**
   * Load saved API keys from sessionStorage on mount
   */
  useEffect(() => {
    const anthropicKey = sessionStorage.getItem('anthropic_api_key');
    const openaiKey = sessionStorage.getItem('openai_api_key');
    const googleKey = sessionStorage.getItem('google_api_key');

    if (anthropicKey) {
      setAnthropicKey(anthropicKey);
      setKeyStatus(prev => ({
        ...prev,
        anthropic: { ...prev.anthropic, isConfigured: true }
      }));
    }

    if (openaiKey) {
      setOpenaiKey(openaiKey);
      setKeyStatus(prev => ({
        ...prev,
        openai: { ...prev.openai, isConfigured: true }
      }));
    }

    if (googleKey) {
      setGoogleKey(googleKey);
      setKeyStatus(prev => ({
        ...prev,
        google: { ...prev.google, isConfigured: true }
      }));
    }
  }, []);

  /**
   * Fetch available models from all configured providers
   * @param {Object} keys - API keys for each provider
   */
  const fetchAvailableModels = useCallback(async (keys: {
    anthropic?: string;
    openai?: string;
    google?: string;
  }) => {
    setIsRefreshing(true);
    setRefreshStatus(null);

    try {
      console.log('Fetching models with keys:', {
        anthropic: !!keys.anthropic,
        openai: !!keys.openai,
        google: !!keys.google
      });

      const response = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anthropicApiKey: keys.anthropic,
          openaiApiKey: keys.openai,
          googleApiKey: keys.google
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      sessionStorage.setItem('available_models', JSON.stringify(data));

      setRefreshStatus({
        type: 'success',
        message: `Found ${Object.values(data).flat().length} models from configured providers`
      });
    } catch (error) {
      console.error('Error fetching models:', error);
      setRefreshStatus({
        type: 'error',
        message: 'Failed to fetch available models'
      });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  /**
   * Handle refreshing models from all configured providers
   */
  const handleRefreshModels = useCallback(async () => {
    const keys = {
      anthropic: sessionStorage.getItem('anthropic_api_key') || undefined,
      openai: sessionStorage.getItem('openai_api_key') || undefined,
      google: sessionStorage.getItem('google_api_key') || undefined
    };

    await fetchAvailableModels(keys);
  }, [fetchAvailableModels]);

  /**
   * Test API key connection for a specific provider
   * @param {string} provider - The provider to test ('anthropic', 'openai', or 'google')
   */
  const testConnection = async (provider: 'anthropic' | 'openai' | 'google') => {
    const key = provider === 'anthropic' ? anthropicKey :
      provider === 'openai' ? openaiKey :
        googleKey;

    if (!key) {
      setKeyStatus(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          error: 'API key is required'
        }
      }));
      return;
    }

    setKeyStatus(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        isLoading: true,
        error: null
      }
    }));

    try {
      const endpoint = provider === 'anthropic' ? '/api/claude' :
        provider === 'openai' ? '/api/openai' :
          '/api/gemini';

      const testModel = provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' :
        provider === 'openai' ? 'gpt-3.5-turbo' :
          'gemini-1.5-pro';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Test connection',
          apiKey: key,
          model: testModel
        })
      });

      if (!response.ok) {
        throw new Error('Invalid API key');
      }

      // Save valid key
      sessionStorage.setItem(`${provider}_api_key`, key);

      setKeyStatus(prev => ({
        ...prev,
        [provider]: {
          isConfigured: true,
          isValid: true,
          isLoading: false,
          error: null
        }
      }));

    } catch (error) {
      console.error(`${provider} API key test failed:`, error);
      setKeyStatus(prev => ({
        ...prev,
        [provider]: {
          isConfigured: false,
          isValid: false,
          isLoading: false,
          error: (error as Error).message
        }
      }));
    }
  };

  // Handle click outside to close sidebar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key to close sidebar
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Sync custom providers across tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'customProviders') {
        setCustomProviders(getCustomProviders());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  /**
   * Save a new custom provider configuration
   */
  const handleSaveProvider = useCallback((config: any) => {
    try {
      saveCustomProvider(config);
      setCustomProviders(getCustomProviders());
      setShowCustomProviderForm(false);
    } catch (error) {
      console.error('Failed to save custom provider:', error);
    }
  }, []);

  /**
   * Delete a custom provider by ID
   */
  const handleDeleteProvider = useCallback((id: string) => {
    if (window.confirm('Are you sure you want to delete this provider?')) {
      deleteCustomProvider(id);
      setCustomProviders(getCustomProviders());
    }
  }, []);

  // Auto-clear refresh status after delay
  useEffect(() => {
    if (refreshStatus) {
      const timer = setTimeout(() => {
        setRefreshStatus(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [refreshStatus]);

  return (
    <>
      {/* Settings Button */}
      <button
        ref={settingsButtonRef}
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Settings Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-surface-0/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Sidebar */}
          <div
            ref={sidebarRef}
            className={`absolute right-0 top-0 h-full w-[480px] bg-[var(--surface-1)]
              shadow-[-4px_0_15px_rgba(0,0,0,0.3)] border-l border-[var(--border)]
              transform transition-transform duration-300 ease-out
              ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--border)]
              bg-[var(--surface-2)]/50 backdrop-blur-sm">
              <h2 className="text-xl font-semibold flex items-center gap-3">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
                Settings
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-[var(--surface-3)] transition-colors
                  hover:text-primary group"
              >
                <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="h-[calc(100vh-88px)] overflow-y-auto">
              <div className="p-6 space-y-8">
                {/* Refresh Status Message */}
                {refreshStatus && (
                  <div className={`text-sm px-4 py-3 rounded-lg animate-fade-in ${refreshStatus.type === 'success'
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : refreshStatus.type === 'warning'
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                    {refreshStatus.message}
                  </div>
                )}

                {/* API Keys Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">API Keys</h3>
                    <button
                      onClick={handleRefreshModels}
                      disabled={isRefreshing}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg
                        bg-[var(--surface-2)] hover:bg-[var(--surface-3)]
                        border border-[var(--border)] transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed
                        flex items-center gap-2"
                    >
                      {isRefreshing ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Refreshing...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Refresh Models
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Anthropic API Key */}
                    <div className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Anthropic API Key
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={anthropicKey}
                          onChange={(e) => setAnthropicKey(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-[var(--surface-1)]
                            border border-[var(--border)] focus:outline-none focus:ring-2
                            focus:ring-blue-500/30 focus:border-blue-500/50"
                          placeholder="sk-ant-..."
                        />
                        <button
                          onClick={() => testConnection('anthropic')}
                          disabled={keyStatus.anthropic.isLoading}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg
                            bg-[var(--surface-1)] hover:bg-[var(--surface-3)]
                            border border-[var(--border)] transition-colors
                            disabled:opacity-50 disabled:cursor-not-allowed
                            min-w-[80px]"
                        >
                          {keyStatus.anthropic.isLoading ? 'Testing...' : 'Test'}
                        </button>
                      </div>
                      {keyStatus.anthropic.isValid && (
                        <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          API key is valid
                        </p>
                      )}
                      {keyStatus.anthropic.error && (
                        <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {keyStatus.anthropic.error}
                        </p>
                      )}
                    </div>

                    {/* OpenAI API Key */}
                    <div className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        OpenAI API Key
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={openaiKey}
                          onChange={(e) => setOpenaiKey(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-[var(--surface-1)]
                            border border-[var(--border)] focus:outline-none focus:ring-2
                            focus:ring-blue-500/30 focus:border-blue-500/50"
                          placeholder="sk-..."
                        />
                        <button
                          onClick={() => testConnection('openai')}
                          disabled={keyStatus.openai.isLoading}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg
                            bg-[var(--surface-1)] hover:bg-[var(--surface-3)]
                            border border-[var(--border)] transition-colors
                            disabled:opacity-50 disabled:cursor-not-allowed
                            min-w-[80px]"
                        >
                          {keyStatus.openai.isLoading ? 'Testing...' : 'Test'}
                        </button>
                      </div>
                      {keyStatus.openai.isValid && (
                        <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          API key is valid
                        </p>
                      )}
                      {keyStatus.openai.error && (
                        <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {keyStatus.openai.error}
                        </p>
                      )}
                    </div>

                    {/* Google AI API Key */}
                    <div className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Google AI API Key
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={googleKey}
                          onChange={(e) => setGoogleKey(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-[var(--surface-1)]
                            border border-[var(--border)] focus:outline-none focus:ring-2
                            focus:ring-blue-500/30 focus:border-blue-500/50"
                          placeholder="AIza..."
                        />
                        <button
                          onClick={() => testConnection('google')}
                          disabled={keyStatus.google.isLoading}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg
                            bg-[var(--surface-1)] hover:bg-[var(--surface-3)]
                            border border-[var(--border)] transition-colors
                            disabled:opacity-50 disabled:cursor-not-allowed
                            min-w-[80px]"
                        >
                          {keyStatus.google.isLoading ? 'Testing...' : 'Test'}
                        </button>
                      </div>
                      {keyStatus.google.isValid && (
                        <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          API key is valid
                        </p>
                      )}
                      {keyStatus.google.error && (
                        <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {keyStatus.google.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Custom Providers Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Custom Providers</h3>
                    <button
                      onClick={() => setShowCustomProviderForm(true)}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg
                        bg-blue-500 hover:bg-blue-600 text-white transition-colors
                        flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Provider
                    </button>
                  </div>

                  {showCustomProviderForm ? (
                    <div className="mb-4">
                      <CustomProviderForm
                        onSave={handleSaveProvider}
                        onCancel={() => setShowCustomProviderForm(false)}
                      />
                    </div>
                  ) : customProviders.length > 0 ? (
                    <div className="space-y-2">
                      {customProviders.map(provider => (
                        <div
                          key={provider.id}
                          className="flex items-center justify-between p-4 rounded-lg
                            bg-[var(--surface-2)] border border-[var(--border)]"
                        >
                          <div>
                            <div className="font-medium">{provider.name}</div>
                            <div className="text-sm text-[var(--text-secondary)]">
                              {provider.models?.length || 0} models
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDeleteProvider(provider.id)}
                              className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[var(--text-secondary)] bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                      <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <p>No custom providers configured</p>
                      <p className="text-sm mt-1">Click "Add Provider" to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 