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
 * Log KV connection details (safely)
 */
function logConnectionDetails() {
  const url = process.env.KV_REST_API_URL || '';
  if (!url) {
    console.warn('⚠️ KV_REST_API_URL not set');
    return;
  }

  try {
    const parsedUrl = new URL(url);
    // Mask most of the host but show enough to identify instance
    const maskedHost = `${parsedUrl.host.slice(0, 4)}...${parsedUrl.host.slice(-8)}`;
    console.log(`KV Connection: ${parsedUrl.protocol}//${maskedHost}`);
  } catch (error) {
    console.warn('⚠️ Invalid KV_REST_API_URL format');
  }
}

/**
 * Check TTL for a key
 */
async function checkKeyTTL(key: string): Promise<{ ttl: number | null; error?: string }> {
  try {
    const ttl = await kv.ttl(key);
    return { ttl };
  } catch (error) {
    return { 
      ttl: null,
      error: error instanceof Error ? error.message : 'Unknown error checking TTL'
    };
  }
}

const WORKFLOW_INDEX_KEY = 'workflow_index';

/**
 * Add workflow ID to index
 */
async function addToIndex(workflowId: string): Promise<void> {
  try {
    console.log(`Adding workflow ${workflowId} to index...`);
    await kv.sadd(WORKFLOW_INDEX_KEY, workflowId);
    console.log(`✓ Added to index successfully`);
  } catch (error) {
    console.error(`❌ Error adding to index:`, error);
    throw error;
  }
}

/**
 * Remove workflow ID from index
 */
async function removeFromIndex(workflowId: string): Promise<void> {
  try {
    console.log(`Removing workflow ${workflowId} from index...`);
    await kv.srem(WORKFLOW_INDEX_KEY, workflowId);
    console.log(`✓ Removed from index successfully`);
  } catch (error) {
    console.error(`❌ Error removing from index:`, error);
    throw error;
  }
}

/**
 * Get all workflow IDs from index
 */
async function getIndexedIds(): Promise<string[]> {
  try {
    console.log(`Fetching workflow IDs from index...`);
    const ids = await kv.smembers(WORKFLOW_INDEX_KEY) as string[];
    
    // Filter out any empty or invalid IDs
    const validIds = ids.filter(id => id && id.trim().length > 0);
    
    console.log(`✓ Found ${validIds.length} valid indexed workflows`);
    if (validIds.length !== ids.length) {
      console.warn(`⚠️ Filtered out ${ids.length - validIds.length} invalid IDs`);
    }
    
    return validIds;
  } catch (error) {
    console.error(`❌ Error fetching index:`, error);
    throw error;
  }
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
  const startTime = Date.now();
  try {
    // Get credentials with fallbacks
    getKVCredentials();
    logConnectionDetails();

    const now = new Date().toISOString();
    const workflow: StoredWorkflow = {
      id: existingId || uuidv4(),
      name,
      description,
      modules: modules.map(sanitizeModule),
      createdAt: existingId ? (await getWorkflow(existingId))?.createdAt || now : now,
      updatedAt: now
    };

    const key = `workflow:${workflow.id}`;
    console.log(`\nSaving workflow to KV storage...`);
    console.log(`Key: ${key}`);
    console.log(`Name: ${workflow.name}`);
    console.log(`Modules: ${workflow.modules.length}`);

    // Save workflow and update index
    const saveStart = Date.now();
    console.log('KV.set parameters:', {
      key,
      valueSize: JSON.stringify(workflow).length,
      options: 'No TTL/expiration set'
    });

    await Promise.all([
      kv.set(key, workflow),
      addToIndex(workflow.id)
    ]);

    const saveTime = Date.now() - saveStart;
    console.log(`✓ Workflow and index saved successfully (${saveTime}ms)`);

    // Check TTL after save
    const ttlStart = Date.now();
    const { ttl, error: ttlError } = await checkKeyTTL(key);
    const ttlTime = Date.now() - ttlStart;

    if (ttlError) {
      console.warn(`⚠️ Error checking TTL: ${ttlError} (${ttlTime}ms)`);
    } else {
      console.log(`TTL check (${ttlTime}ms):`, ttl === -1 ? 'No expiration' : `Expires in ${ttl}s`);
    }

    const totalTime = Date.now() - startTime;
    console.log(`Total operation time: ${totalTime}ms\n`);

    return workflow;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Error saving workflow (${totalTime}ms):`, error);
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
  const startTime = Date.now();
  try {
    console.log('\nFetching workflow list using index...');
    logConnectionDetails();

    // Get all workflow IDs from index
    const idsStart = Date.now();
    const workflowIds = await getIndexedIds();
    const idsTime = Date.now() - idsStart;
    console.log(`Found ${workflowIds.length} indexed workflows (${idsTime}ms)`);

    // Check TTL for each workflow
    console.log('\nChecking TTLs...');
    const ttlResults = await Promise.all(
      workflowIds.map(async (id) => {
        const key = `workflow:${id}`;
        const { ttl, error } = await checkKeyTTL(key);
        return {
          key,
          id,
          ttl,
          error,
          hasExpiration: ttl !== -1 && ttl !== null
        };
      })
    );

    const expiringKeys = ttlResults.filter(r => r.hasExpiration);
    if (expiringKeys.length > 0) {
      console.warn('⚠️ Found keys with expiration:', expiringKeys);
    }

    // Fetch all workflows in parallel
    const fetchStart = Date.now();
    const workflows = await Promise.all(
      workflowIds.map(async id => {
        try {
          console.log(`\nFetching workflow: ${id}`);
          const fetchStartTime = Date.now();
          const workflow = await getWorkflow(id);
          const fetchTime = Date.now() - fetchStartTime;

          if (!workflow) {
            console.warn(`❌ Missing workflow for ID: ${id} (${fetchTime}ms)`);
            // Remove from index if workflow doesn't exist
            await removeFromIndex(id);
            return null;
          }

          console.log(`✓ Fetched workflow: ${workflow.name} (${fetchTime}ms)`);
          return workflow;
        } catch (error) {
          console.warn(`❌ Error fetching workflow ${id}:`, error);
          return null;
        }
      })
    );

    const fetchTime = Date.now() - fetchStart;

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

    const totalTime = Date.now() - startTime;
    console.log(`\nWorkflow List Summary:`);
    console.log(`Total indexed IDs: ${workflowIds.length}`);
    console.log(`Valid workflows: ${workflowList.length}`);
    console.log(`Failed/missing: ${workflowIds.length - workflowList.length}`);
    console.log(`\nTiming:`);
    console.log(`Get indexed IDs: ${idsTime}ms`);
    console.log(`Fetch workflows: ${fetchTime}ms`);
    console.log(`Total time: ${totalTime}ms\n`);

    // Add TTL info to summary
    console.log(`\nTTL Summary:`);
    console.log(`Keys with no expiration: ${ttlResults.filter(r => r.ttl === -1).length}`);
    console.log(`Keys with expiration: ${expiringKeys.length}`);
    console.log(`Failed TTL checks: ${ttlResults.filter(r => r.error).length}`);

    return workflowList;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Error fetching workflow list (${totalTime}ms):`, error);
    throw error;
  }
}

/**
 * Delete a workflow by ID
 */
export async function deleteWorkflow(id: string): Promise<void> {
  try {
    console.log(`Deleting workflow ${id}...`);
    await Promise.all([
      kv.del(`workflow:${id}`),
      removeFromIndex(id)
    ]);
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
 * Rebuild workflow index from existing keys
 */
export async function rebuildWorkflowIndex(): Promise<{
  indexed: number;
  total: number;
  errors: Array<{ id: string; error: string }>;
}> {
  const startTime = Date.now();
  console.log('\nRebuilding workflow index...');
  
  try {
    // Get all workflow keys
    console.log('Fetching all workflow keys...');
    const keys = await kv.keys('workflow:*');
    const workflowIds = keys
      .filter(key => key !== WORKFLOW_INDEX_KEY)
      .map(key => key.replace('workflow:', ''))
      .filter(id => id && id.trim().length > 0); // Filter out empty/invalid IDs
    
    console.log(`Found ${workflowIds.length} workflow keys`);

    // Clear existing index
    console.log('Clearing existing index...');
    await kv.del(WORKFLOW_INDEX_KEY);

    // Add each valid workflow to index
    const errors: Array<{ id: string; error: string }> = [];
    let indexed = 0;

    for (const id of workflowIds) {
      try {
        // Verify workflow exists and is valid
        const workflow = await getWorkflow(id);
        if (!workflow || !workflow.id || !workflow.name) {
          errors.push({ id, error: 'Invalid workflow data' });
          continue;
        }

        // Add to index
        await addToIndex(id);
        indexed++;
      } catch (error) {
        errors.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`\nIndex Rebuild Summary:`);
    console.log(`Total workflows found: ${workflowIds.length}`);
    console.log(`Successfully indexed: ${indexed}`);
    console.log(`Failed to index: ${errors.length}`);
    console.log(`Total time: ${totalTime}ms`);

    if (errors.length > 0) {
      console.warn('\nErrors:', errors);
    }

    return {
      indexed,
      total: workflowIds.length,
      errors
    };
  } catch (error) {
    console.error('Error rebuilding index:', error);
    throw error;
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