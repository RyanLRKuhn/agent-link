export interface WorkflowModuleData {
  id: string;
  title: string;
  prompt: string;
  provider: string | { id: string; name: string; type: 'custom' } | null;
  selectedModel: string | null;
}

export interface WorkflowMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowResult {
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

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  results: WorkflowResult[];
  startTime: string;
  endTime?: string;
  error?: string;
  status: 'running' | 'completed' | 'failed';
} 