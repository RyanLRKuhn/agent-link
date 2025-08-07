import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getWorkflow } from '@/lib/workflows';

interface DebugResult {
  timestamp: string;
  connection: {
    url?: string;
    isConfigured: boolean;
  };
  keys: {
    all: string[];
    count: number;
    ttl: Array<{
      key: string;
      ttl: number | null;
      hasExpiration: boolean;
      error?: string;
    }>;
  };
  workflows: {
    successful: Array<{
      key: string;
      id: string;
      name: string;
      updatedAt: string;
    }>;
    failed: Array<{
      key: string;
      error: string;
    }>;
  };
  timing: {
    getKeys: number;
    checkTTL: number;
    fetchWorkflows: number;
    total: number;
  };
}

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

function getMaskedConnectionUrl(): string | undefined {
  const url = process.env.KV_REST_API_URL;
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    // Show just enough of the host to identify the instance
    return `${parsed.protocol}//${parsed.host.slice(0, 4)}...${parsed.host.slice(-8)}`;
  } catch {
    return undefined;
  }
}

export async function GET() {
  try {
    const startTime = Date.now();
    const result: DebugResult = {
      timestamp: new Date().toISOString(),
      connection: {
        url: getMaskedConnectionUrl(),
        isConfigured: Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
      },
      keys: {
        all: [],
        count: 0,
        ttl: []
      },
      workflows: {
        successful: [],
        failed: []
      },
      timing: {
        getKeys: 0,
        checkTTL: 0,
        fetchWorkflows: 0,
        total: 0
      }
    };

    // Get all workflow keys
    console.log('Fetching all workflow keys...');
    const keysStartTime = Date.now();
    const keys = await kv.keys('workflow:*');
    result.timing.getKeys = Date.now() - keysStartTime;
    
    result.keys.all = keys;
    result.keys.count = keys.length;
    console.log(`Found ${keys.length} keys`);

    // Check TTL for all keys
    console.log('\nChecking TTLs...');
    const ttlStartTime = Date.now();
    const ttlChecks = await Promise.all(
      keys.map(async (key) => {
        const { ttl, error } = await checkKeyTTL(key);
        return {
          key,
          ttl,
          hasExpiration: ttl !== -1 && ttl !== null,
          error
        };
      })
    );
    result.timing.checkTTL = Date.now() - ttlStartTime;
    result.keys.ttl = ttlChecks;

    // Log TTL findings
    const expiringKeys = ttlChecks.filter(k => k.hasExpiration);
    if (expiringKeys.length > 0) {
      console.warn('⚠️ Found keys with expiration:', expiringKeys);
    }

    // Try to fetch each workflow
    console.log('\nFetching individual workflows...');
    const fetchStartTime = Date.now();
    
    await Promise.all(
      keys.map(async (key) => {
        const workflowId = key.replace('workflow:', '');
        console.log(`\nFetching workflow: ${key}`);
        
        try {
          const startFetch = Date.now();
          const workflow = await getWorkflow(workflowId);
          const fetchTime = Date.now() - startFetch;
          
          if (!workflow) {
            console.log(`❌ Key exists but workflow not found: ${key}`);
            result.workflows.failed.push({
              key,
              error: 'Workflow not found'
            });
            return;
          }

          console.log(`✓ Successfully fetched workflow: ${workflow.name} (${fetchTime}ms)`);
          result.workflows.successful.push({
            key,
            id: workflow.id,
            name: workflow.name,
            updatedAt: workflow.updatedAt
          });
        } catch (error) {
          console.error(`❌ Error fetching workflow: ${key}`, error);
          result.workflows.failed.push({
            key,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      })
    );

    result.timing.fetchWorkflows = Date.now() - fetchStartTime;
    result.timing.total = Date.now() - startTime;

    // Log summary
    console.log('\nDebug Summary:');
    console.log(`Total keys found: ${result.keys.count}`);
    console.log(`Keys with expiration: ${expiringKeys.length}`);
    console.log(`Successfully fetched: ${result.workflows.successful.length}`);
    console.log(`Failed to fetch: ${result.workflows.failed.length}`);
    console.log('\nTiming:');
    console.log(`Get keys: ${result.timing.getKeys}ms`);
    console.log(`Check TTLs: ${result.timing.checkTTL}ms`);
    console.log(`Fetch workflows: ${result.timing.fetchWorkflows}ms`);
    console.log(`Total time: ${result.timing.total}ms`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in workflow debug:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Debug operation failed' },
      { status: 500 }
    );
  }
} 