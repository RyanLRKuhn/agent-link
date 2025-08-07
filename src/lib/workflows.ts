import { kv } from '@vercel/kv';
import { WorkflowModuleData } from '../types/workflow';
import { v4 as uuidv4 } from 'uuid';

/**
 * Debug environment variables and configuration
 */
function debugEnvironment() {
  console.log('\n🔍 Environment Debug Information:');

  // Check specific variables with fallbacks
  const urlCandidates = [
    'KV_REST_API_URL',
    'KV_URL',
    'REDIS_URL',
    'UPSTASH_REDIS_REST_URL'
  ];

  const tokenCandidates = [
    'KV_REST_API_TOKEN',
    'KV_TOKEN',
    'REDIS_TOKEN',
    'UPSTASH_REDIS_REST_TOKEN'
  ];

  console.log('\n🔍 Variable Resolution:');
  console.log('URL Resolution:');
  for (const candidate of urlCandidates) {
    console.log(`- ${candidate}: ${process.env[candidate] ? '✓ Found' : '✗ Missing'}`);
  }

  console.log('Token Resolution:');
  for (const candidate of tokenCandidates) {
    console.log(`- ${candidate}: ${process.env[candidate] ? '✓ Found' : '✗ Missing'}`);
  }

  // Log final resolved values (presence only, not actual values)
  const resolvedUrl = urlCandidates.find(key => process.env[key]);
  const resolvedToken = tokenCandidates.find(key => process.env[key]);

  console.log('\n✨ Final Resolution:');
  console.log('URL:', resolvedUrl ? `Using ${resolvedUrl}` : 'No URL found');
  console.log('Token:', resolvedToken ? `Using ${resolvedToken}` : 'No token found');
  console.log(''); // Empty line for spacing
}

// Run environment debugging immediately
debugEnvironment();

/**
 * Test the KV connection by setting and getting a test value
 */
export async function testKVConnection(): Promise<{ success: boolean; error?: string }> {
  const testKey = `test:${Date.now()}`;
  const testValue = { test: true, timestamp: Date.now() };

  try {
    // Test set operation
    await kv.set(testKey, testValue);
    console.log('KV set operation successful');

    // Test get operation
    const retrieved = await kv.get(testKey);
    console.log('KV get operation successful:', retrieved);

    // Test delete operation
    await kv.del(testKey);
    console.log('KV delete operation successful');

    return { success: true };
  } catch (error) {
    console.error('KV connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

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
 * Get environment variables with fallbacks
 */
function getKVCredentials(): { url: string; token: string } {
  const url = process.env.KV_REST_API_URL || 
              process.env.KV_URL || 
              process.env.REDIS_URL ||
              process.env.UPSTASH_REDIS_REST_URL;

  const token = process.env.KV_REST_API_TOKEN || 
                process.env.KV_TOKEN || 
                process.env.REDIS_TOKEN ||
                process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error('Missing required KV credentials. Available environment variables:\n' +
      Object.keys(process.env)
        .filter(key => /^(KV_|REDIS_|VERCEL_)/.test(key))
        .map(key => `${key}=${process.env[key] ? '[MASKED]' : '[NOT SET]'}`)
        .join('\n')
    );
  }

  return { url, token };
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
  try {
    // Get credentials with fallbacks
    getKVCredentials();

    const now = new Date().toISOString();
    const workflow: StoredWorkflow = {
      id: existingId || uuidv4(),
      name,
      description,
      modules: modules.map(sanitizeModule),
      createdAt: existingId ? (await getWorkflow(existingId))?.createdAt || now : now,
      updatedAt: now
    };

    console.log(`Saving workflow ${workflow.id}...`);

    // Save workflow directly - no list maintenance
    await kv.set(`workflow:${workflow.id}`, workflow);
    console.log(`Workflow ${workflow.id} saved successfully`);

    return workflow;
  } catch (error) {
    console.error('Error in saveWorkflow:', error);
    throw error;
  }
}

/**
 * Get a workflow by ID from Vercel KV storage
 */
export async function getWorkflow(id: string): Promise<StoredWorkflow | null> {
  try {
    console.log(`Fetching workflow ${id}...`);
    const workflow = await kv.get<StoredWorkflow>(`workflow:${id}`);
    console.log(`Workflow ${id} ${workflow ? 'found' : 'not found'}`);
    return workflow || null;
  } catch (error) {
    console.error(`Error fetching workflow ${id}:`, error);
    throw new Error(
      `Failed to fetch workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * List all saved workflows (without full module data)
 */
export async function listWorkflows(): Promise<Array<Omit<StoredWorkflow, 'modules'>>> {
  try {
    console.log('Fetching workflow list...');

    // Get all workflow keys
    const keys = await kv.keys('workflow:*');
    console.log(`Found ${keys.length} workflow keys`);

    // Filter out the old list key and extract IDs
    const workflowIds = keys
      .filter(key => key !== 'workflow:list')
      .map(key => key.replace('workflow:', ''));

    // Fetch all workflows in parallel
    const workflows = await Promise.all(
      workflowIds.map(async id => {
        try {
          const workflow = await getWorkflow(id);
          if (!workflow) {
            console.warn(`Missing workflow for ID: ${id}`);
            return null;
          }
          return workflow;
        } catch (error) {
          console.warn(`Error fetching workflow ${id}:`, error);
          return null;
        }
      })
    );

    // Filter out nulls and extract metadata
    const workflowList = workflows
      .filter((w): w is StoredWorkflow => w !== null)
      .map(({ id, name, description, createdAt, updatedAt }) => ({
        id,
        name,
        description,
        createdAt,
        updatedAt
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    console.log(`Returning ${workflowList.length} workflows`);
    return workflowList;
  } catch (error) {
    console.error('Error fetching workflow list:', error);
    throw new Error(
      `Failed to fetch workflow list: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete a workflow by ID
 */
export async function deleteWorkflow(id: string): Promise<void> {
  try {
    console.log(`Deleting workflow ${id}...`);
    await kv.del(`workflow:${id}`);
    console.log(`Workflow ${id} deleted`);
  } catch (error) {
    console.error(`Error deleting workflow ${id}:`, error);
    throw new Error(
      `Failed to delete workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Update workflow metadata (name, description)
 */
export async function updateWorkflowMetadata(
  id: string,
  updates: { name?: string; description?: string }
): Promise<StoredWorkflow | null> {
  try {
    console.log(`Updating workflow ${id} metadata...`);
    const workflow = await getWorkflow(id);
    if (!workflow) {
      console.log(`Workflow ${id} not found for update`);
      return null;
    }

    const updatedWorkflow: StoredWorkflow = {
      ...workflow,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`workflow:${id}`, updatedWorkflow);
    console.log(`Workflow ${id} updated successfully`);

    return updatedWorkflow;
  } catch (error) {
    console.error(`Error updating workflow ${id} metadata:`, error);
    throw new Error(
      `Failed to update workflow metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * One-time cleanup function to remove old workflow list
 */
export async function cleanupOldWorkflowList(): Promise<void> {
  try {
    console.log('Cleaning up old workflow list...');
    await kv.del('workflow:list');
    console.log('Old workflow list removed successfully');
  } catch (error) {
    console.error('Error cleaning up old workflow list:', error);
    // Don't throw - this is a cleanup operation
  }
}

// Export the debug function for external use
export const debug = debugEnvironment; 