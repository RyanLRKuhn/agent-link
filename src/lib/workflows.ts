import { kv } from '@vercel/kv';
import { WorkflowModuleData } from '../types/workflow';
import { v4 as uuidv4 } from 'uuid';
import { saveWorkflowProviders } from './providers';

export interface StoredWorkflow {
  id: string;
  name: string;
  description?: string;
  modules: StoredWorkflowModule[];
  createdAt: string;
  updatedAt: string;
}

export interface StoredWorkflowModule {
  id: string;
  title: string;
  prompt: string;
  provider: string | { id: string; name: string; type: 'custom' } | null;
  selectedModel: string | null;
}

/**
 * Sanitize a workflow module for storage by removing sensitive data
 */
function sanitizeModule(module: WorkflowModuleData): StoredWorkflowModule {
  return {
    id: module.id,
    title: module.title,
    prompt: module.prompt,
    provider: module.provider,
    selectedModel: module.selectedModel
  };
}

/**
 * Save a workflow to Vercel KV storage
 */
export async function saveWorkflow(
  modules: WorkflowModuleData[],
  name: string,
  description?: string,
  existingId?: string
): Promise<StoredWorkflow> {
  // First, save any custom providers used in the workflow
  await saveWorkflowProviders(modules);

  const now = new Date().toISOString();
  const workflow: StoredWorkflow = {
    id: existingId || uuidv4(),
    name,
    description,
    modules: modules.map(sanitizeModule),
    createdAt: existingId ? (await getWorkflow(existingId))?.createdAt || now : now,
    updatedAt: now
  };

  // Save to KV storage
  await kv.set(`workflow:${workflow.id}`, workflow);

  // Update workflow list
  const workflowList = await listWorkflows();
  if (!workflowList.some(w => w.id === workflow.id)) {
    await kv.set('workflow:list', [...workflowList, {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt
    }]);
  } else {
    await kv.set('workflow:list', workflowList.map(w => 
      w.id === workflow.id 
        ? {
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            createdAt: workflow.createdAt,
            updatedAt: workflow.updatedAt
          }
        : w
    ));
  }

  return workflow;
}

/**
 * Get a workflow by ID from Vercel KV storage
 */
export async function getWorkflow(id: string): Promise<StoredWorkflow | null> {
  return kv.get<StoredWorkflow>(`workflow:${id}`);
}

/**
 * List all saved workflows (without full module data)
 */
export async function listWorkflows(): Promise<Array<Omit<StoredWorkflow, 'modules'>>> {
  const list = await kv.get<Array<Omit<StoredWorkflow, 'modules'>>>('workflow:list');
  return list || [];
}

/**
 * Delete a workflow by ID
 */
export async function deleteWorkflow(id: string): Promise<void> {
  // Delete the workflow
  await kv.del(`workflow:${id}`);

  // Update workflow list
  const workflowList = await listWorkflows();
  await kv.set('workflow:list', workflowList.filter(w => w.id !== id));
}

/**
 * Update workflow metadata (name, description)
 */
export async function updateWorkflowMetadata(
  id: string,
  updates: { name?: string; description?: string }
): Promise<StoredWorkflow | null> {
  const workflow = await getWorkflow(id);
  if (!workflow) return null;

  const updatedWorkflow: StoredWorkflow = {
    ...workflow,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  await kv.set(`workflow:${id}`, updatedWorkflow);

  // Update workflow list
  const workflowList = await listWorkflows();
  await kv.set('workflow:list', workflowList.map(w => 
    w.id === id 
      ? {
          id: w.id,
          name: updates.name || w.name,
          description: updates.description !== undefined ? updates.description : w.description,
          createdAt: w.createdAt,
          updatedAt: updatedWorkflow.updatedAt
        }
      : w
  ));

  return updatedWorkflow;
} 