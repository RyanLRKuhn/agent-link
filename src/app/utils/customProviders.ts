import { v4 as uuidv4 } from 'uuid';

// Helper to safely access sessionStorage
const getStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
};

export interface CustomProvider {
  id: string;
  name: string;
  type: 'custom';
  endpoint: string;
  auth: {
    type: 'bearer' | 'query' | 'header';
    key: string; // The name/location of the auth (e.g. "Authorization", "key", "x-api-key")
    value: string; // The actual API key value
  };
  requestTemplate: {
    body?: Record<string, any>;
    query?: Record<string, string>;
  };
  responsePath: string;
  models?: string[];
  createdAt: string;
  lastTested?: string;
  lastTestResult?: {
    success: boolean;
    message: string;
    timestamp: string;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

// Basic validation with essential checks only
export function validateProviderConfig(config: Partial<CustomProvider>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Provider Name - required, not empty
  if (!config.name?.trim()) {
    errors.push({ field: 'name', message: 'Provider name is required' });
  }

  // Endpoint - required, valid URL format
  if (!config.endpoint?.trim()) {
    errors.push({ field: 'endpoint', message: 'Endpoint URL is required' });
  } else {
    try {
      new URL(config.endpoint);
    } catch (error) {
      errors.push({ field: 'endpoint', message: 'Invalid URL format' });
    }
  }

  // Auth - required fields only
  if (!config.auth) {
    errors.push({ field: 'auth', message: 'Authentication configuration is required' });
  } else {
    if (!['bearer', 'query', 'header'].includes(config.auth.type)) {
      errors.push({ field: 'auth.type', message: 'Invalid authentication type' });
    }
    if (!config.auth.key?.trim()) {
      errors.push({ field: 'auth.key', message: 'Authentication key name is required' });
    }
    if (!config.auth.value?.trim()) {
      errors.push({ field: 'auth.value', message: 'API key is required' });
    }
  }

  // Request Template - required, valid JSON
  if (!config.requestTemplate) {
    errors.push({ field: 'requestTemplate', message: 'Request template is required' });
  } else {
    try {
      if (typeof config.requestTemplate !== 'object') {
        throw new Error();
      }
    } catch (error) {
      errors.push({ field: 'requestTemplate', message: 'Invalid JSON format' });
    }
  }

  // Response Path - required, not empty
  if (!config.responsePath?.trim()) {
    errors.push({ field: 'responsePath', message: 'Response path is required' });
  }

  // Models - required, at least one
  if (!config.models?.length) {
    errors.push({ field: 'models', message: 'At least one model is required' });
  }

  return errors;
}

// Get all custom providers
export function getCustomProviders(): CustomProvider[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const stored = storage.getItem('customProviders');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load custom providers:', error);
    return [];
  }
}

// Save a new custom provider
export function saveCustomProvider(config: Omit<CustomProvider, 'id' | 'createdAt'>): CustomProvider {
  const storage = getStorage();
  if (!storage) {
    throw new Error('Browser storage is not available');
  }

  const providers = getCustomProviders();
  
  // Validate config
  const errors = validateProviderConfig(config);
  if (errors.length > 0) {
    throw new Error(`Invalid provider configuration:\n${errors.map(e => `- ${e.field}: ${e.message}`).join('\n')}`);
  }

  const newProvider: CustomProvider = {
    ...config,
    id: uuidv4(),
    type: 'custom',
    createdAt: new Date().toISOString()
  };

  providers.push(newProvider);
  storage.setItem('customProviders', JSON.stringify(providers));

  return newProvider;
}

// Update an existing custom provider
export function updateCustomProvider(id: string, updates: Partial<CustomProvider>): CustomProvider {
  const storage = getStorage();
  if (!storage) {
    throw new Error('Browser storage is not available');
  }

  const providers = getCustomProviders();
  const index = providers.findIndex(p => p.id === id);
  if (index === -1) throw new Error('Provider not found');

  const updatedProvider = { ...providers[index], ...updates };
  
  // Validate updated config
  const errors = validateProviderConfig(updatedProvider);
  if (errors.length > 0) {
    throw new Error(`Invalid provider configuration:\n${errors.map(e => `- ${e.field}: ${e.message}`).join('\n')}`);
  }

  providers[index] = updatedProvider;
  storage.setItem('customProviders', JSON.stringify(providers));

  return updatedProvider;
}

// Delete a custom provider
export function deleteCustomProvider(id: string): void {
  const storage = getStorage();
  if (!storage) return;

  const providers = getCustomProviders().filter(p => p.id !== id);
  storage.setItem('customProviders', JSON.stringify(providers));
}

// Export providers to JSON file
export function exportProviders(selectedIds?: string[]): string {
  const providers = getCustomProviders();
  const toExport = selectedIds 
    ? providers.filter(p => selectedIds.includes(p.id))
    : providers;

  return JSON.stringify(toExport, null, 2);
}

// Import providers from JSON
export function importProviders(json: string): { imported: number; errors: string[] } {
  const storage = getStorage();
  if (!storage) {
    throw new Error('Browser storage is not available');
  }

  try {
    const result = { imported: 0, errors: [] as string[] };
    const providers = getCustomProviders();
    const imported = JSON.parse(json);

    if (!Array.isArray(imported)) {
      throw new Error('Invalid import format: must be an array of providers');
    }

    for (const provider of imported) {
      try {
        // Validate imported provider
        const errors = validateProviderConfig(provider);
        if (errors.length > 0) {
          throw new Error(`Invalid provider configuration:\n${errors.map(e => `- ${e.field}: ${e.message}`).join('\n')}`);
        }

        // Check for duplicates
        if (providers.some(p => p.name === provider.name)) {
          result.errors.push(`Provider "${provider.name}" already exists`);
          continue;
        }

        // Add as new provider
        const newProvider: CustomProvider = {
          ...provider,
          id: uuidv4(),
          type: 'custom',
          createdAt: new Date().toISOString()
        };

        providers.push(newProvider);
        result.imported++;
      } catch (error) {
        result.errors.push(`Failed to import provider "${provider.name}": ${(error as Error).message}`);
      }
    }

    if (result.imported > 0) {
      storage.setItem('customProviders', JSON.stringify(providers));
    }

    return result;
  } catch (error) {
    throw new Error(`Failed to parse import file: ${(error as Error).message}`);
  }
}

// Update test result for a provider
export function updateProviderTestResult(id: string, success: boolean, message: string): void {
  const storage = getStorage();
  if (!storage) return;

  const providers = getCustomProviders();
  const index = providers.findIndex(p => p.id === id);
  if (index === -1) return;

  providers[index] = {
    ...providers[index],
    lastTested: new Date().toISOString(),
    lastTestResult: {
      success,
      message,
      timestamp: new Date().toISOString()
    }
  };

  storage.setItem('customProviders', JSON.stringify(providers));
} 
