import { useEffect, useState } from 'react';
import { MODEL_IDS, getModelDisplayName } from '../types/workflow';

interface ModelSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

interface AvailableModels {
  openai: string[];
  anthropic: string[];
  lastUpdated: string | null;
}

// Fallback models if no models are available
const FALLBACK_MODELS = {
  openai: [MODEL_IDS.GPT4, MODEL_IDS.GPT4_MINI],
  anthropic: [MODEL_IDS.CLAUDE_SONNET],
  lastUpdated: null
};

export default function ModelSelect({ value, onChange, className = '' }: ModelSelectProps) {
  const [availableModels, setAvailableModels] = useState<AvailableModels>(FALLBACK_MODELS);
  const [isConfigured, setIsConfigured] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Load models from sessionStorage
    const loadModels = () => {
      const savedModels = sessionStorage.getItem('available_models');
      if (savedModels) {
        const parsed = JSON.parse(savedModels);
        if (parsed.openai?.length > 0 || parsed.anthropic?.length > 0) {
          setAvailableModels(parsed);
          setIsConfigured(true);
          return;
        }
      }
      // Fall back to default models
      setAvailableModels(FALLBACK_MODELS);
      setIsConfigured(false);
    };

    // Load initially
    loadModels();

    // Set up storage event listener for updates
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'available_models') {
        loadModels();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Handle tooltip display
  const handleOptionHover = (event: React.MouseEvent<HTMLOptionElement>, modelId: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipContent(modelId);
    setTooltipPosition({
      x: rect.right + 10,
      y: rect.top + (rect.height / 2)
    });
    setShowTooltip(true);
  };

  // Check if any API keys are configured
  const hasKeys = !!sessionStorage.getItem('anthropic_api_key') || !!sessionStorage.getItem('openai_api_key');

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`premium-input px-3 py-1.5 text-sm text-[var(--text-primary)] rounded-lg
          appearance-none bg-[var(--surface-2)] cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-blue-500/30
          pr-8 relative ${className}`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23666' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: `right 0.5rem center`,
          backgroundRepeat: `no-repeat`,
          backgroundSize: `1.5em 1.5em`
        }}
      >
        {!hasKeys ? (
          <option value="" disabled>Configure API keys in Settings</option>
        ) : (
          <>
            {/* OpenAI Models */}
            {availableModels.openai.length > 0 && (
              <optgroup label="OpenAI Models">
                {availableModels.openai.map(modelId => (
                  <option
                    key={modelId}
                    value={modelId}
                    onMouseEnter={(e) => handleOptionHover(e, modelId)}
                  >
                    {getModelDisplayName(modelId)}
                  </option>
                ))}
              </optgroup>
            )}

            {/* Anthropic Models */}
            {availableModels.anthropic.length > 0 && (
              <optgroup label="Anthropic Models">
                {availableModels.anthropic.map(modelId => (
                  <option
                    key={modelId}
                    value={modelId}
                    onMouseEnter={(e) => handleOptionHover(e, modelId)}
                  >
                    {getModelDisplayName(modelId)}
                  </option>
                ))}
              </optgroup>
            )}

            {/* Show message if no models available */}
            {availableModels.openai.length === 0 && availableModels.anthropic.length === 0 && (
              <option value="" disabled>No models available</option>
            )}
          </>
        )}
      </select>

      {/* Tooltip */}
      {showTooltip && tooltipContent && (
        <div
          className="absolute z-50 px-2 py-1 text-xs bg-[var(--surface-3)] border border-[var(--border)]
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