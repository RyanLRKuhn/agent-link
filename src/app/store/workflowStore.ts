import { create } from 'zustand';
import { WorkflowModuleData } from '../types/workflow';

export interface WorkflowResult {
  agentIndex: number;
  input: string;
  output: string;
  timestamp: string;
  moduleId: string;
  formattedPrompt: string;
  executionTime: number;
}

interface AgentStatus {
  moduleId: string;
  isComplete: boolean;
  isExecuting: boolean;
  error: string | null;
  executionTime?: number;
  retryCount?: number;
}

interface WorkflowState {
  isRunning: boolean;
  currentAgentIndex: number;
  results: WorkflowResult[];
  error: string | null;
  agentStatus: Record<string, AgentStatus>;
  failedAgentIndex: number;
  // Actions
  startWorkflow: (modules: WorkflowModuleData[], startFromIndex?: number) => Promise<void>;
  stopWorkflow: () => void;
  updateCurrentAgent: (index: number) => void;
  addResult: (result: WorkflowResult) => void;
  setError: (error: string | null, agentIndex: number) => void;
  resetWorkflow: () => void;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const formatPrompt = (
  agentIndex: number,
  agentPrompt: string,
  previousOutput: string | null,
  userInput: string | null
): string => {
  if (agentIndex === 0) {
    // First agent - process user input
    return `USER INPUT: ${userInput || 'None provided'}\n\nYOUR ROLE: ${agentPrompt}\n\nProvide your response based on the user input and your defined role.`;
  } else {
    // Subsequent agents - process previous agent's output
    return `CONTENT TO PROCESS: ${previousOutput}\n\nYOUR ROLE: ${agentPrompt}\n\nProcess the content according to your defined role.`;
  }
};

const executeAgent = async (
  module: WorkflowModuleData,
  agentIndex: number,
  previousOutput: string | null,
  retryCount: number = 0
): Promise<{ response: string; formattedPrompt: string }> => {
  const apiKey = sessionStorage.getItem('anthropic_api_key');
  if (!apiKey) {
    throw new Error('API key required. Please add your API key in settings.');
  }

  try {
    const formattedPrompt = formatPrompt(
      agentIndex,
      module.prompt,
      previousOutput,
      agentIndex === 0 ? module.prompt : null
    );

    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: formattedPrompt,
        apiKey,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle rate limits with exponential backoff
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        await sleep(delay);
        return executeAgent(module, agentIndex, previousOutput, retryCount + 1);
      }
      throw new Error(data.error || 'Failed to execute agent');
    }

    return {
      response: data.response,
      formattedPrompt
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('fetch') && retryCount < MAX_RETRIES) {
      // Retry network errors
      await sleep(RETRY_DELAY);
      return executeAgent(module, agentIndex, previousOutput, retryCount + 1);
    }
    throw error;
  }
};

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  isRunning: false,
  currentAgentIndex: -1,
  results: [],
  error: null,
  agentStatus: {},
  failedAgentIndex: -1,

  startWorkflow: async (modules: WorkflowModuleData[], startFromIndex = 0) => {
    const store = get();
    if (store.isRunning) return;

    // Keep existing results if retrying from a failed agent
    const existingResults = startFromIndex > 0 ? store.results.slice(0, startFromIndex) : [];
    const existingStatus = startFromIndex > 0 ? store.agentStatus : {};

    set({
      isRunning: true,
      currentAgentIndex: startFromIndex,
      error: null,
      failedAgentIndex: -1,
      results: existingResults,
      agentStatus: {
        ...existingStatus,
        ...modules.slice(startFromIndex).reduce((acc, module) => ({
          ...acc,
          [module.id]: {
            moduleId: module.id,
            isComplete: false,
            isExecuting: false,
            error: null,
            retryCount: 0
          }
        }), {})
      }
    });

    try {
      let previousOutput = startFromIndex > 0 && existingResults.length > 0
        ? existingResults[existingResults.length - 1].output
        : null;

      for (let i = startFromIndex; i < modules.length; i++) {
        const module = modules[i];
        const startTime = Date.now();

        set((state) => ({
          currentAgentIndex: i,
          agentStatus: {
            ...state.agentStatus,
            [module.id]: {
              ...state.agentStatus[module.id],
              isExecuting: true,
              error: null
            }
          }
        }));

        try {
          const { response, formattedPrompt } = await executeAgent(module, i, previousOutput);
          previousOutput = response;
          const executionTime = Date.now() - startTime;

          const result: WorkflowResult = {
            agentIndex: i,
            moduleId: module.id,
            input: module.prompt,
            output: response,
            formattedPrompt,
            timestamp: new Date().toISOString(),
            executionTime
          };

          set((state) => ({
            results: [...state.results, result],
            agentStatus: {
              ...state.agentStatus,
              [module.id]: {
                ...state.agentStatus[module.id],
                isExecuting: false,
                isComplete: true,
                executionTime
              }
            }
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          set((state) => ({
            agentStatus: {
              ...state.agentStatus,
              [module.id]: {
                ...state.agentStatus[module.id],
                isExecuting: false,
                error: errorMessage,
                retryCount: (state.agentStatus[module.id].retryCount || 0) + 1
              }
            },
            error: errorMessage,
            failedAgentIndex: i,
            isRunning: false
          }));
          return; // Stop workflow but preserve previous results
        }
      }

      // Workflow completed successfully
      set({
        isRunning: false,
        currentAgentIndex: -1,
        error: null,
        failedAgentIndex: -1
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to execute workflow',
        isRunning: false,
        currentAgentIndex: -1
      });
    }
  },

  stopWorkflow: () => set({
    isRunning: false,
    currentAgentIndex: -1,
    error: 'Workflow cancelled by user'
  }),

  updateCurrentAgent: (index: number) => set({
    currentAgentIndex: index
  }),

  addResult: (result: WorkflowResult) => set((state) => ({
    results: [...state.results, result]
  })),

  setError: (error: string | null, agentIndex: number) => set({
    error,
    isRunning: false,
    currentAgentIndex: -1,
    failedAgentIndex: agentIndex
  }),

  resetWorkflow: () => set({
    isRunning: false,
    currentAgentIndex: -1,
    results: [],
    error: null,
    agentStatus: {},
    failedAgentIndex: -1
  })
})); 