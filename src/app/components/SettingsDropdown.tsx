'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MODEL_IDS } from '../types/workflow';

interface ApiKeyStatus {
  isConfigured: boolean;
  isValid: boolean | null;
  isLoading: boolean;
  error: string | null;
}

interface RefreshStatus {
  message: string;
  type: 'success' | 'warning' | 'error';
  timestamp: number;
}

export default function SettingsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [keyStatus, setKeyStatus] = useState<Record<string, ApiKeyStatus>>({
    anthropic: {
      isConfigured: false,
      isValid: null,
      isLoading: false,
      error: null
    },
    openai: {
      isConfigured: false,
      isValid: null,
      isLoading: false,
      error: null
    }
  });
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus | null>(null);
  const [previousKeys, setPreviousKeys] = useState({
    anthropic: '',
    openai: ''
  });

  // Memoize fetchAvailableModels to prevent recreation on every render
  const fetchAvailableModels = useCallback(async (keys: { anthropic?: string; openai?: string }) => {
    setRefreshStatus(null);

    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anthropicApiKey: keys.anthropic,
          openaiApiKey: keys.openai
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch models');
      }

      // Store in sessionStorage
      const updatedModels = {
        openai: data.openai || [],
        anthropic: data.anthropic || [],
        lastUpdated: new Date().toISOString()
      };
      sessionStorage.setItem('available_models', JSON.stringify(updatedModels));

      // Count providers with models
      const activeProviders = [
        data.openai?.length && 'OpenAI',
        data.anthropic?.length && 'Anthropic'
      ].filter(Boolean);

      const totalModels = (data.openai?.length || 0) + (data.anthropic?.length || 0);

      setRefreshStatus({
        message: `Found ${totalModels} model${totalModels !== 1 ? 's' : ''} from ${activeProviders.join(' and ')}`,
        type: 'success',
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error fetching models:', error);
      setRefreshStatus({
        message: error instanceof Error ? error.message : 'Failed to fetch models',
        type: 'error',
        timestamp: Date.now()
      });
    }
  }, []);

  const testConnection = async (provider: 'anthropic' | 'openai') => {
    const key = provider === 'anthropic' ? anthropicKey : openaiKey;
    if (!key) return;

    setKeyStatus(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        isLoading: true,
        error: null
      }
    }));

    try {
      const endpoint = provider === 'anthropic' ? '/api/claude' : '/api/openai';
      const model = provider === 'anthropic' 
        ? MODEL_IDS.CLAUDE_SONNET
        : 'gpt-3.5-turbo';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'test',
          apiKey: key,
          model
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to validate API key');
      }

      // Save key and update status
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

      // Only fetch models if the key has changed
      if (key !== previousKeys[provider]) {
        setPreviousKeys(prev => ({ ...prev, [provider]: key }));
        // Don't automatically fetch models - let user click refresh button
      }

    } catch (error) {
      setKeyStatus(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          isValid: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to validate key'
        }
      }));
    }
  };

  useEffect(() => {
    // Load saved keys
    const savedAnthropicKey = sessionStorage.getItem('anthropic_api_key');
    const savedOpenaiKey = sessionStorage.getItem('openai_api_key');

    if (savedAnthropicKey) {
      setAnthropicKey(savedAnthropicKey);
      setPreviousKeys(prev => ({ ...prev, anthropic: savedAnthropicKey }));
    }
    if (savedOpenaiKey) {
      setOpenaiKey(savedOpenaiKey);
      setPreviousKeys(prev => ({ ...prev, openai: savedOpenaiKey }));
    }

    setKeyStatus(prev => ({
      anthropic: {
        ...prev.anthropic,
        isConfigured: !!savedAnthropicKey
      },
      openai: {
        ...prev.openai,
        isConfigured: !!savedOpenaiKey
      }
    }));

    // Handle click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear refresh status after delay
  useEffect(() => {
    if (refreshStatus) {
      const timer = setTimeout(() => {
        setRefreshStatus(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [refreshStatus?.timestamp]);

  const getStatusIcon = (status: ApiKeyStatus) => {
    if (status.isLoading) {
      return (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      );
    }
    if (status.isValid === true) {
      return (
        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    if (status.isValid === false) {
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    }
    if (status.isConfigured) {
      return (
        <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className="relative">
      {/* Settings Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-colors duration-200 relative
          ${isOpen ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'}`}
      >
        <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>

        {/* Status Indicator */}
        {(keyStatus.anthropic.isConfigured || keyStatus.openai.isConfigured) && (
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full" />
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          id="settings-dropdown-panel"
          className="absolute right-0 mt-2 w-96 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] shadow-xl z-50"
        >
          <div className="p-4 space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Settings</h3>

            {/* Refresh Status Message */}
            {refreshStatus && (
              <div className={`text-sm px-3 py-2 rounded-lg animate-fade-in ${
                refreshStatus.type === 'success' 
                  ? 'bg-green-500/10 text-green-400'
                  : refreshStatus.type === 'warning'
                  ? 'bg-yellow-500/10 text-yellow-400'
                  : 'bg-red-500/10 text-red-400'
              }`}>
                {refreshStatus.message}
              </div>
            )}

            {/* API Keys Section */}
            <div className="space-y-4">
              {/* Anthropic API Key */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    Anthropic API Key
                  </label>
                  {getStatusIcon(keyStatus.anthropic)}
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="flex-1 px-3 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <button
                    onClick={() => testConnection('anthropic')}
                    disabled={!anthropicKey || keyStatus.anthropic.isLoading}
                    className="px-3 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Test
                  </button>
                </div>
                {keyStatus.anthropic.error && (
                  <p className="text-xs text-red-400">{keyStatus.anthropic.error}</p>
                )}
              </div>

              {/* OpenAI API Key */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    OpenAI API Key
                  </label>
                  {getStatusIcon(keyStatus.openai)}
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-..."
                    className="flex-1 px-3 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <button
                    onClick={() => testConnection('openai')}
                    disabled={!openaiKey || keyStatus.openai.isLoading}
                    className="px-3 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Test
                  </button>
                </div>
                {keyStatus.openai.error && (
                  <p className="text-xs text-red-400">{keyStatus.openai.error}</p>
                )}
              </div>
            </div>

            {/* Models Section */}
            <div className="pt-4 border-t border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-[var(--text-secondary)]">Available Models</h4>
                <button
                  onClick={() => fetchAvailableModels({ anthropic: anthropicKey, openai: openaiKey })}
                  disabled={keyStatus.anthropic.isLoading || keyStatus.openai.isLoading || (!anthropicKey && !openaiKey)}
                  className="px-2 py-1 text-xs bg-[var(--surface-2)] hover:bg-[var(--surface-3)]
                    text-[var(--text-secondary)] rounded-lg transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center gap-1.5"
                >
                  {keyStatus.anthropic.isLoading || keyStatus.openai.isLoading ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh Models
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 