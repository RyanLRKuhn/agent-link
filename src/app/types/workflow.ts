export interface WorkflowModuleData {
  id: string;
  title: string;
  selectedModel: string;
  prompt: string;
}

export interface WorkflowResult {
  agentIndex: number;
  input: string;
  output: string;
  timestamp: string;
  executionTime: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

// Internal model IDs used by the APIs
export const MODEL_IDS = {
  CLAUDE_SONNET: 'claude-3-5-sonnet-20241022',
  CLAUDE_HAIKU: 'claude-3-haiku-20240307',
  CLAUDE_OPUS: 'claude-3-opus-20240229',
  GPT4: 'gpt-4-0125-preview',
  GPT4_MINI: 'gpt-4-turbo-preview',
} as const;

// Available models for selection (fallback list)
export const AVAILABLE_MODELS = [
  MODEL_IDS.CLAUDE_SONNET,
  MODEL_IDS.GPT4,
  MODEL_IDS.GPT4_MINI,
] as const;

// Display name patterns for dynamic model matching
const MODEL_DISPLAY_PATTERNS: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  // OpenAI Models
  [/^gpt-4-\d{4}-preview$/, () => "GPT-4o"],
  [/^gpt-4-turbo-preview$/, () => "GPT-4o Mini"],
  [/^gpt-4-\d{4}-vision-preview$/, () => "GPT-4o Vision"],
  [/^gpt-4-32k-\d{4}-preview$/, () => "GPT-4o 32k"],
  [/^gpt-3.5-turbo-\d{4}$/, (match) => `GPT-3.5 Turbo (${match[0].split('-')[3]})`],
  
  // Anthropic Models
  [/^claude-3-opus-\d+$/, () => "Claude 3 Opus"],
  [/^claude-3-sonnet-\d+$/, () => "Claude 3 Sonnet"],
  [/^claude-3-haiku-\d+$/, () => "Claude 3 Haiku"],
  [/^claude-2.1$/, () => "Claude 2.1"],
  [/^claude-2.0$/, () => "Claude 2.0"],
  [/^claude-instant-1.2$/, () => "Claude Instant"],
];

// Static display names for known models
const STATIC_DISPLAY_NAMES: Record<string, string> = {
  [MODEL_IDS.CLAUDE_SONNET]: "Claude 3 Sonnet",
  [MODEL_IDS.CLAUDE_HAIKU]: "Claude 3 Haiku",
  [MODEL_IDS.CLAUDE_OPUS]: "Claude 3 Opus",
  [MODEL_IDS.GPT4]: "GPT-4o",
  [MODEL_IDS.GPT4_MINI]: "GPT-4o Mini",
};

/**
 * Get a user-friendly display name for a model ID
 * @param modelId The raw model identifier
 * @returns A user-friendly display name
 */
export function getModelDisplayName(modelId: string): string {
  // Check static mappings first
  if (modelId in STATIC_DISPLAY_NAMES) {
    return STATIC_DISPLAY_NAMES[modelId];
  }

  // Try pattern matching
  for (const [pattern, formatter] of MODEL_DISPLAY_PATTERNS) {
    const match = modelId.match(pattern);
    if (match) {
      return formatter(match);
    }
  }

  // Fallback: clean up the raw ID
  return modelId
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'); // Format dates YYYY-MM-DD
} 