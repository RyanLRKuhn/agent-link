import { v4 as uuidv4 } from 'uuid';

// Types
export interface CustomProvider {
  id: string;
  name: string;
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT';
  auth: {
    type: 'bearer' | 'query' | 'header';
    key: string;
  };
  headers?: Record<string, string>;
  requestTemplate: {
    body?: Record<string, any>;
    query?: Record<string, string>;
  };
  responsePath: string;
  models?: string[]; // Optional list of supported models
  description?: string;
  createdAt: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Constants
const STORAGE_KEY = 'customProviders';
const REQUIRED_FIELDS = ['name', 'endpoint', 'auth', 'requestTemplate', 'responsePath'] as const;

// Helper function to safely access sessionStorage
const getStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
};

// Validation function
export function validateProviderConfig(config: Partial<CustomProvider>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check required fields
  REQUIRED_FIELDS.forEach(field => {
    if (!config[field]) {
      errors.push({
        field,
        message: `${field} is required`
      });
    }
  });

  // Validate auth configuration
  if (config.auth) {
    if (!['bearer', 'query', 'header'].includes(config.auth.type)) {
      errors.push({
        field: 'auth.type',
        message: 'Invalid auth type. Must be "bearer", "query", or "header"'
      });
    }
    if (!config.auth.key) {
      errors.push({
        field: 'auth.key',
        message: 'Auth key is required'
      });
    }
  }

  // Validate request template
  if (config.requestTemplate) {
    if (typeof config.requestTemplate !== 'object') {
      errors.push({
        field: 'requestTemplate',
        message: 'requestTemplate must be an object'
      });
    }
  }

  // Validate response path
  if (config.responsePath && typeof config.responsePath !== 'string') {
    errors.push({
      field: 'responsePath',
      message: 'responsePath must be a string'
    });
  }

  // Validate HTTP method if provided
  if (config.method && !['GET', 'POST', 'PUT'].includes(config.method)) {
    errors.push({
      field: 'method',
      message: 'Invalid HTTP method. Must be "GET", "POST", or "PUT"'
    });
  }

  return errors;
}

// Save a new custom provider
export function saveCustomProvider(config: Omit<CustomProvider, 'id' | 'createdAt'>): CustomProvider {
  const storage = getStorage();
  if (!storage) throw new Error('Cannot access sessionStorage');

  // Validate config
  const errors = validateProviderConfig(config);
  if (errors.length > 0) {
    throw new Error(`Invalid provider configuration: ${JSON.stringify(errors)}`);
  }

  // Create new provider with ID and timestamp
  const provider: CustomProvider = {
    ...config,
    id: uuidv4(),
    createdAt: Date.now()
  };

  // Get existing providers
  const existingProviders = getCustomProviders();
  
  // Check for duplicate names
  if (existingProviders.some(p => p.name === provider.name)) {
    throw new Error(`Provider with name "${provider.name}" already exists`);
  }

  // Save updated list
  storage.setItem(STORAGE_KEY, JSON.stringify([...existingProviders, provider]));

  // Dispatch storage event for cross-tab sync
  window.dispatchEvent(new StorageEvent('storage', {
    key: STORAGE_KEY,
    newValue: storage.getItem(STORAGE_KEY)
  }));

  return provider;
}

// Get all custom providers
export function getCustomProviders(): CustomProvider[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const data = storage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading custom providers:', error);
    return [];
  }
}

// Delete a custom provider
export function deleteCustomProvider(id: string): boolean {
  const storage = getStorage();
  if (!storage) throw new Error('Cannot access sessionStorage');

  const providers = getCustomProviders();
  const updatedProviders = providers.filter(p => p.id !== id);

  if (updatedProviders.length === providers.length) {
    return false; // No provider found with given ID
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(updatedProviders));

  // Dispatch storage event for cross-tab sync
  window.dispatchEvent(new StorageEvent('storage', {
    key: STORAGE_KEY,
    newValue: storage.getItem(STORAGE_KEY)
  }));

  return true;
}

// Update an existing custom provider
export function updateCustomProvider(
  id: string,
  updates: Partial<Omit<CustomProvider, 'id' | 'createdAt'>>
): CustomProvider {
  const storage = getStorage();
  if (!storage) throw new Error('Cannot access sessionStorage');

  const providers = getCustomProviders();
  const providerIndex = providers.findIndex(p => p.id === id);

  if (providerIndex === -1) {
    throw new Error(`Provider with ID "${id}" not found`);
  }

  const currentProvider = providers[providerIndex];
  const updatedProvider = {
    ...currentProvider,
    ...updates
  };

  // Validate updated config
  const errors = validateProviderConfig(updatedProvider);
  if (errors.length > 0) {
    throw new Error(`Invalid provider configuration: ${JSON.stringify(errors)}`);
  }

  // Check for duplicate names (excluding current provider)
  if (updates.name && updates.name !== currentProvider.name) {
    if (providers.some(p => p.id !== id && p.name === updates.name)) {
      throw new Error(`Provider with name "${updates.name}" already exists`);
    }
  }

  providers[providerIndex] = updatedProvider;
  storage.setItem(STORAGE_KEY, JSON.stringify(providers));

  // Dispatch storage event for cross-tab sync
  window.dispatchEvent(new StorageEvent('storage', {
    key: STORAGE_KEY,
    newValue: storage.getItem(STORAGE_KEY)
  }));

  return updatedProvider;
}

// Helper to merge custom providers with built-in providers
export function mergeWithBuiltInProviders(
  builtInProviders: Record<string, string[]>
): Record<string, string[]> {
  const customProviders = getCustomProviders();
  
  return {
    ...builtInProviders,
    ...Object.fromEntries(
      customProviders.map(provider => [
        provider.name,
        provider.models || []
      ])
    )
  };
}

// Get a specific provider by ID
export function getCustomProviderById(id: string): CustomProvider | null {
  const providers = getCustomProviders();
  return providers.find(p => p.id === id) || null;
}

// Example usage:
/*
const exampleProvider: Omit<CustomProvider, 'id' | 'createdAt'> = {
  name: 'Custom Google AI',
  endpoint: 'https://generativelanguage.googleapis.com/v1/models/{{model}}:generateContent',
  method: 'POST',
  auth: {
    type: 'query',
    key: 'key'
  },
  requestTemplate: {
    body: {
      contents: [{
        parts: [{
          text: "{{prompt}}"
        }]
      }]
    }
  },
  responsePath: 'candidates[0].content.parts[0].text',
  models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
  description: 'Custom Google AI provider configuration'
};
*/ 