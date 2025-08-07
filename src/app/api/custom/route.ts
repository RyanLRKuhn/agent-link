import { NextRequest, NextResponse } from 'next/server';
import get from 'lodash.get';
import { getProvider } from '@/lib/providers';
import type { StoredProvider } from '@/lib/providers';

export interface RequestBody {
  prompt: string;
  apiKey: string;
  model: string;
  providerId: string;
}

/**
 * Replace template variables in a string or object
 */
function replaceTemplateVars(template: any, variables: Record<string, string>): any {
  if (typeof template === 'string') {
    return Object.entries(variables).reduce((result, [key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      return result.replace(regex, value);
    }, template);
  }

  if (Array.isArray(template)) {
    return template.map(item => replaceTemplateVars(item, variables));
  }

  if (typeof template === 'object' && template !== null) {
    return Object.entries(template).reduce((result, [key, value]) => ({
      ...result,
      [key]: replaceTemplateVars(value, variables)
    }), {});
  }

  return template;
}

/**
 * Build URL with query parameters, handling auth and template variables
 */
function buildRequestUrl(
  baseUrl: string, 
  queryParams: Record<string, string> = {},
  auth: StoredProvider['auth'],
  apiKey: string
): string {
  const url = new URL(baseUrl);

  // Add configured query parameters
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  // Add API key as query parameter if auth type is 'query'
  if (auth.type === 'query') {
    url.searchParams.append(auth.key, apiKey);
  }

  return url.toString();
}

/**
 * Build request headers, handling auth and custom headers
 */
function buildRequestHeaders(
  provider: StoredProvider,
  apiKey: string
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  // Add authentication header based on auth type
  if (provider.auth.type === 'bearer') {
    headers[provider.auth.key || 'Authorization'] = `Bearer ${apiKey}`;
  } else if (provider.auth.type === 'header') {
    headers[provider.auth.key] = apiKey;
  }

  return headers;
}

export async function POST(request: NextRequest) {
  console.log('Received custom LLM provider request');
  try {
    const body: RequestBody = await request.json();
    const { prompt, apiKey, model, providerId } = body;

    // Validate required fields
    if (!prompt) throw new Error('Prompt is required');
    if (!apiKey) throw new Error('API key is required');
    if (!model) throw new Error('Model is required');
    if (!providerId) throw new Error('Provider ID is required');

    // Load provider config
    const provider = await getProvider(providerId);
    if (!provider) {
      throw new Error('Provider configuration not found');
    }

    // Variables available for template replacement
    const templateVars = {
      prompt,
      model,
      api_key: apiKey
    };

    // Replace variables in endpoint URL
    const baseUrl = replaceTemplateVars(provider.endpoint, templateVars);

    // Replace variables in query parameters and build URL
    const queryParams = 'query' in provider.requestTemplate && provider.requestTemplate.query
      ? replaceTemplateVars(provider.requestTemplate.query, templateVars)
      : {};

    const url = buildRequestUrl(baseUrl, queryParams, provider.auth, apiKey);

    // Build headers with proper authentication
    const headers = buildRequestHeaders(provider, apiKey);

    // Build request body - handle both direct template and nested body formats
    const requestBody = 'body' in provider.requestTemplate
      ? replaceTemplateVars(provider.requestTemplate.body, templateVars)
      : replaceTemplateVars(provider.requestTemplate, templateVars);

    // Log request details (with sensitive data redacted)
    console.log('Making request to:', url.replace(apiKey, '[REDACTED]'));
    console.log('With headers:', { 
      ...headers, 
      Authorization: headers.Authorization ? '[REDACTED]' : undefined,
      [provider.auth.key]: '[REDACTED]'
    });
    console.log('With body:', requestBody);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Provider API error:', errorData);

      // Improved error message that includes the provider's error details
      const errorMessage = errorData?.error?.message || 
                          errorData?.message || 
                          `Provider API error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    console.log('Provider API response:', responseData);

    // Extract response using the specified path
    const result = get(responseData, provider.responsePath);
    if (result === undefined) {
      throw new Error(`Could not find response at path: ${provider.responsePath}`);
    }

    return NextResponse.json({ response: result });

  } catch (error) {
    console.error('Error in custom provider route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 