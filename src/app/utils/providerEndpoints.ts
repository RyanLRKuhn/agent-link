import { Provider, isBuiltInProvider } from '../types/workflow';

/**
 * Get the correct API endpoint for a given provider
 * @param provider The provider to get the endpoint for
 * @returns The API endpoint URL
 */
export function getProviderEndpoint(provider: Provider | null): string {
  if (!provider) {
    throw new Error('Provider is required');
  }

  // Handle built-in providers
  if (isBuiltInProvider(provider)) {
    switch (provider) {
      case 'anthropic':
        return '/api/claude';
      case 'openai':
        return '/api/openai';
      case 'google':
        return '/api/gemini';
      default:
        throw new Error(`Unknown built-in provider: ${provider}`);
    }
  }

  // Handle custom providers
  return '/api/custom';
} 