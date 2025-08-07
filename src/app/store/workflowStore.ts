import { create } from 'zustand';
import { WorkflowModuleData, WorkflowResult } from '../types/workflow';
import { getProviderEndpoint } from '../utils/providerEndpoints';
import { getCustomProviders } from '../utils/customProviders';
import { isBuiltInProvider, isCustomProvider, CustomProvider } from '../types/workflow';

// Helper to safely access sessionStorage
const getStorageValue = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(key);
};

interface AgentStatus {
  isExecuting: boolean;
  isComplete: boolean;
  error: string | null;
  executionTime?: number;
}

interface AgentResult {
  agentIndex: number;
  input: string;
  output: string;
  executionTime: number;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  timestamp: string;
}

interface WorkflowState {
  isRunning: boolean;
  currentAgentIndex: number;
  startTime: number;
  results: AgentResult[];
  agentStatus: Record<string, AgentStatus>;
  error: string | null;
  failedAgentIndex: number;
  startWorkflow: (modules: WorkflowModuleData[], startIndex?: number) => void;
  stopWorkflow: () => void;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  isRunning: false,
  currentAgentIndex: 0,
  startTime: 0,
  results: [],
  agentStatus: {},
  error: null,
  failedAgentIndex: -1,

  startWorkflow: async (modules: WorkflowModuleData[], startIndex = 0) => {
    set({
      isRunning: true,
      currentAgentIndex: startIndex,
      startTime: Date.now(),
      results: startIndex === 0 ? [] : get().results.slice(0, startIndex),
      error: null,
      failedAgentIndex: -1,
      agentStatus: {}
    });

    try {
      let previousOutput: string | undefined;
      for (let i = startIndex; i < modules.length; i++) {
        const module = modules[i];
        set(state => ({
          currentAgentIndex: i,
          agentStatus: {
            ...state.agentStatus,
            [module.id]: { isExecuting: true, isComplete: false, error: null }
          }
        }));

        try {
          const result = await executeAgent(module, previousOutput);
          previousOutput = result.output;

          set(state => ({
            results: [...state.results, result],
            agentStatus: {
              ...state.agentStatus,
              [module.id]: {
                isExecuting: false,
                isComplete: true,
                error: null,
                executionTime: result.executionTime
              }
            }
          }));
        } catch (error) {
          set(state => ({
            isRunning: false,
            error: (error as Error).message,
            failedAgentIndex: i,
            agentStatus: {
              ...state.agentStatus,
              [module.id]: {
                isExecuting: false,
                isComplete: false,
                error: (error as Error).message
              }
            }
          }));
          return;
        }
      }

      set({ isRunning: false });
    } catch (error) {
      set({
        isRunning: false,
        error: (error as Error).message,
        failedAgentIndex: get().currentAgentIndex
      });
    }
  },

  stopWorkflow: () => {
    set({ isRunning: false });
  }
}));

interface CustomProviderConfig extends CustomProvider {
  auth: {
    type: 'bearer' | 'query' | 'header';
    key: string;
    value: string;
  };
}

async function executeAgent(module: WorkflowModuleData, input?: string, store = useWorkflowStore.getState()): Promise<AgentResult> {
  try {
    if (!module.provider || !module.selectedModel) {
      throw new Error(`Invalid configuration for agent "${module.title}"`);
    }

    const provider = module.provider; // Capture for type narrowing
    const endpoint = getProviderEndpoint(provider);
    console.log(`Executing agent "${module.title}" using endpoint:`, endpoint);

    let apiKey: string | null = null;
    let customProvider: CustomProviderConfig | null = null;

    if (isBuiltInProvider(provider)) {
      apiKey = getStorageValue(`${provider}_api_key`);
      if (!apiKey) {
        throw new Error(`API key not found for ${provider}`);
      }
    } else if (isCustomProvider(provider)) {
      const foundProvider = getCustomProviders().find(p => p.id === provider.id) as CustomProviderConfig;
      if (!foundProvider) {
        throw new Error('Custom provider configuration not found');
      }
      customProvider = foundProvider;
      apiKey = foundProvider.auth.value; // Extract API key from custom provider config
    } else {
      throw new Error('Invalid provider type');
    }

    const prompt = input ? `${module.prompt}\n\nInput: ${input}` : module.prompt;

    // Prepare request payload
    const requestPayload = {
      prompt,
      apiKey, // API key is now always at top level
      model: module.selectedModel,
      ...(customProvider && {
        providerConfig: {
          ...customProvider,
          // Remove auth.value from providerConfig to avoid duplication
          auth: {
            ...customProvider.auth,
            value: undefined // API key is now at top level
          }
        }
      })
    };

    console.log('Making API request to:', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get response');
    }

    const data = await response.json();

    return {
      agentIndex: store.currentAgentIndex,
      input: prompt,
      output: data.response,
      executionTime: Date.now() - store.startTime,
      usage: data.usage,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error(`Error executing agent "${module.title}":`, error);
    throw error;
  }
} 