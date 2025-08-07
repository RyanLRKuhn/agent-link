import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

export interface StoredProvider {
  id: string;
  name: string;
  endpoint: string;
  auth: {
    type: 'bearer' | 'query' | 'header';
    key: string;
  };
  requestTemplate: Record<string, any> | {
    body?: Record<string, any>;
    query?: Record<string, string>;
  };
  responsePath: string;
  models: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProviderWithAuth extends StoredProvider {
  auth: {
    type: 'bearer' | 'query' | 'header';
    key: string;
    value: string;
  };
}

/**
 * Sanitize a provider by removing sensitive data
 */
function sanitizeProvider(provider: ProviderWithAuth): StoredProvider {
  const { auth, ...rest } = provider;
  return {
    ...rest,
    auth: {
      type: auth.type,
      key: auth.key
    }
  };
}

/**
 * Save a provider to Vercel KV storage
 */
export async function saveProvider(
  provider: ProviderWithAuth,
  existingId?: string
): Promise<StoredProvider> {
  const now = new Date().toISOString();
  const sanitized = sanitizeProvider(provider);
  
  const storedProvider: StoredProvider = {
    ...sanitized,
    id: existingId || provider.id || uuidv4(),
    createdAt: existingId ? (await getProvider(existingId))?.createdAt || now : now,
    updatedAt: now
  };

  // Save to KV storage
  await kv.set(`provider:${storedProvider.id}`, storedProvider);

  // Update provider list
  const providerList = await listProviders();
  if (!providerList.some(p => p.id === storedProvider.id)) {
    await kv.set('provider:list', [...providerList, {
      id: storedProvider.id,
      name: storedProvider.name,
      createdAt: storedProvider.createdAt,
      updatedAt: storedProvider.updatedAt
    }]);
  } else {
    await kv.set('provider:list', providerList.map(p => 
      p.id === storedProvider.id 
        ? {
            id: storedProvider.id,
            name: storedProvider.name,
            createdAt: storedProvider.createdAt,
            updatedAt: storedProvider.updatedAt
          }
        : p
    ));
  }

  return storedProvider;
}

/**
 * Get a provider by ID from Vercel KV storage
 */
export async function getProvider(id: string): Promise<StoredProvider | null> {
  return kv.get<StoredProvider>(`provider:${id}`);
}

/**
 * List all saved providers (without sensitive data)
 */
export async function listProviders(): Promise<Array<Pick<StoredProvider, 'id' | 'name' | 'createdAt' | 'updatedAt'>>> {
  const list = await kv.get<Array<Pick<StoredProvider, 'id' | 'name' | 'createdAt' | 'updatedAt'>>>('provider:list');
  return list || [];
}

/**
 * Delete a provider by ID
 */
export async function deleteProvider(id: string): Promise<void> {
  // Delete the provider
  await kv.del(`provider:${id}`);

  // Update provider list
  const providerList = await listProviders();
  await kv.set('provider:list', providerList.filter(p => p.id !== id));
}

/**
 * Update provider metadata (name only)
 */
export async function updateProviderMetadata(
  id: string,
  updates: { name: string }
): Promise<StoredProvider | null> {
  const provider = await getProvider(id);
  if (!provider) return null;

  const updatedProvider: StoredProvider = {
    ...provider,
    name: updates.name,
    updatedAt: new Date().toISOString()
  };

  await kv.set(`provider:${id}`, updatedProvider);

  // Update provider list
  const providerList = await listProviders();
  await kv.set('provider:list', providerList.map(p => 
    p.id === id 
      ? {
          id: p.id,
          name: updates.name,
          createdAt: p.createdAt,
          updatedAt: updatedProvider.updatedAt
        }
      : p
  ));

  return updatedProvider;
}

/**
 * Save providers referenced in a workflow
 */
export async function saveWorkflowProviders(modules: Array<{ provider: any }>): Promise<void> {
  const customProviders = modules
    .map(m => m.provider)
    .filter((p): p is ProviderWithAuth => p && typeof p === 'object' && 'type' in p && p.type === 'custom');

  await Promise.all(
    customProviders.map(provider => saveProvider(provider))
  );
} 