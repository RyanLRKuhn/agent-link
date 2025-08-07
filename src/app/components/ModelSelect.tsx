import { useEffect, useState } from 'react';
import { Provider, PROVIDER_NAMES, FALLBACK_MODELS, getModelDisplayName } from '../types/workflow';

interface ModelSelectProps {
  provider: Provider | null;
  model: string | null;
  onProviderChange: (provider: Provider | null) => void;
  onModelChange: (model: string | null) => void;
  className?: string;
}

interface AvailableModels {
  openai: string[];
  anthropic: string[];
  google: string[];
  lastUpdated: string | null;
}

const PROVIDER_ICONS = {
  openai: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" fill="currentColor"/>
    </svg>
  ),
  anthropic: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 22V12M12 12L22 7M12 12L2 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  google: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
} as const;

export default function ModelSelect({
  provider,
  model,
  onProviderChange,
  onModelChange,
  className = ''
}: ModelSelectProps) {
  const [availableModels, setAvailableModels] = useState<AvailableModels>({
    openai: FALLBACK_MODELS.openai,
    anthropic: FALLBACK_MODELS.anthropic,
    google: FALLBACK_MODELS.google,
    lastUpdated: null
  });
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [hasKeys, setHasKeys] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  useEffect(() => {
    // Check for API keys
    const checkKeys = () => {
      const anthropicKey = window.sessionStorage.getItem('anthropic_api_key');
      const openaiKey = window.sessionStorage.getItem('openai_api_key');
      const googleKey = window.sessionStorage.getItem('google_api_key');
      setHasKeys(!!anthropicKey || !!openaiKey || !!googleKey);
    };

    // Load models from sessionStorage without making API calls
    const loadModels = () => {
      const savedModels = window.sessionStorage.getItem('available_models');
      if (savedModels) {
        try {
          const parsed = JSON.parse(savedModels);
          console.log('Loaded models from storage:', parsed); // Debug log
          if (parsed.openai?.length > 0 || parsed.anthropic?.length > 0 || parsed.google?.length > 0) {
            setAvailableModels(parsed);
            return;
          }
        } catch (e) {
          console.warn('Failed to parse saved models:', e);
        }
      }
      // Fall back to default models
      setAvailableModels({
        openai: FALLBACK_MODELS.openai,
        anthropic: FALLBACK_MODELS.anthropic,
        google: FALLBACK_MODELS.google,
        lastUpdated: null
      });
    };

    // Initial load
    checkKeys();
    loadModels();

    // Set up storage event listener for updates
    const handleStorageChange = (event: StorageEvent) => {
      // Only respond to events from other tabs/windows
      if (!event.key) return;

      if (event.key === 'available_models') {
        loadModels();
      } else if (event.key.endsWith('_api_key')) {
        checkKeys();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Handle tooltip display
  const handleOptionHover = (event: React.MouseEvent<HTMLOptionElement>, content: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipContent(content);
    setTooltipPosition({
      x: rect.right + 10,
      y: rect.top + (rect.height / 2)
    });
    setShowTooltip(true);
  };

  // Get available models for selected provider
  const providerModels = provider ? availableModels[provider] || [] : [];
  console.log('Available models for provider:', provider, providerModels); // Debug log

  // Handle provider change
  const handleProviderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    console.log('Provider selected:', value); // Debug log
    if (value === '') {
      onProviderChange(null);
    } else if (value === 'openai' || value === 'anthropic' || value === 'google') {
      onProviderChange(value);
      setIsLoadingModels(true);
      // Simulate loading delay for smoother transition
      setTimeout(() => setIsLoadingModels(false), 300);
    }
    onModelChange(null);
  };

  return (
    <div className={`flex flex-col sm:flex-row items-stretch gap-2 ${className}`}>
      {/* Provider Select */}
      <div className="relative flex-1 min-w-[140px]">
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 select-none">
          Provider
        </label>
        <div className="relative">
          <select
            value={provider || ''}
            onChange={handleProviderChange}
            onMouseLeave={() => setShowTooltip(false)}
            className="w-full px-3 py-1.5 pr-8 text-sm text-[var(--text-primary)] rounded-lg
              appearance-none bg-[var(--surface-2)] cursor-pointer border border-[var(--border)]
              focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50
              transition-colors duration-200 hover:border-[var(--primary)]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23666' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: `right 0.5rem center`,
              backgroundRepeat: `no-repeat`,
              backgroundSize: `1.5em 1.5em`,
              paddingLeft: provider ? '2rem' : '0.75rem'
            }}
          >
            <option value="">Select Provider</option>
            {Object.entries(PROVIDER_NAMES).map(([key, name]) => (
              <option
                key={key}
                value={key}
                disabled={!hasKeys}
                className="pl-6"
              >
                {name}
              </option>
            ))}
          </select>
          {provider && (
            <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)]">
              {PROVIDER_ICONS[provider]}
            </div>
          )}
        </div>
      </div>

      {/* Model Select */}
      <div className="relative flex-[2]">
        <label className={`block text-xs font-medium mb-1 select-none transition-colors duration-200 ${
          provider ? 'text-[var(--text-secondary)]' : 'text-[var(--text-secondary)]/50'
        }`}>
          Model
        </label>
        <div className="relative">
          <select
            value={model || ''}
            onChange={(e) => onModelChange(e.target.value || null)}
            onMouseLeave={() => setShowTooltip(false)}
            disabled={!provider || isLoadingModels}
            className={`w-full px-3 py-1.5 pr-8 text-sm rounded-lg appearance-none border
              transition-all duration-200 ease-in-out
              ${provider
                ? 'bg-[var(--surface-2)] text-[var(--text-primary)] border-[var(--border)] hover:border-[var(--primary)]'
                : 'bg-[var(--surface-2)]/50 text-[var(--text-secondary)]/50 border-[var(--border)]/50'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50
              disabled:cursor-not-allowed disabled:hover:border-[var(--border)]`}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23666' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: `right 0.5rem center`,
              backgroundRepeat: `no-repeat`,
              backgroundSize: `1.5em 1.5em`
            }}
          >
            <option value="">
              {!provider
                ? 'Select provider first'
                : isLoadingModels
                ? 'Loading models...'
                : 'Select model'
              }
            </option>
            {!isLoadingModels && providerModels.map((modelId: string) => (
              <option
                key={modelId}
                value={modelId}
                onMouseEnter={(e) => handleOptionHover(e, modelId)}
              >
                {getModelDisplayName(modelId)}
              </option>
            ))}
          </select>
          {isLoadingModels && (
            <div className="absolute right-8 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && tooltipContent && (
        <div
          className="fixed z-50 px-2 py-1 text-xs bg-[var(--surface-3)] border border-[var(--border)]
            rounded-md shadow-lg whitespace-nowrap pointer-events-none text-[var(--text-secondary)]"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translateY(-50%)'
          }}
        >
          {tooltipContent}
        </div>
      )}
    </div>
  );
} 