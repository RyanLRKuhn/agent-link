export interface WorkflowModuleData {
  id: string;
  title: string;
  selectedModel: string;
  prompt: string;
}

export const AVAILABLE_MODELS = [
  'Claude Sonnet 4',
  'GPT-4',
  'Claude Haiku'
] as const; 