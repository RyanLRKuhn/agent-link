import { NextRequest, NextResponse } from 'next/server';
import get from 'lodash.get';

export interface ProviderConfig {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT';
  auth: {
    type: 'bearer' | 'query' | 'header';
    key: string;
  };
  headers?: Record<string, string>;
  responsePath: string;
  requestTemplate: Record<string, any> | {
    body?: Record<string, any>;
    query?: Record<string, string>;
  };
}

interface RequestBody {
  prompt: string;
  apiKey: string;
  model: string;
  providerConfig: ProviderConfig;
}

/**
 * Replace template variables in a string or object
 * @param template The template string or object
 * @param variables The variables to replace
 * @returns The template with variables replaced
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
  auth: ProviderConfig['auth'],
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
  providerConfig: ProviderConfig,
  apiKey: string
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...providerConfig.headers
  };

  // Add authentication header based on auth type
  if (providerConfig.auth.type === 'bearer') {
    headers[providerConfig.auth.key || 'Authorization'] = `Bearer ${apiKey}`;
  } else if (providerConfig.auth.type === 'header') {
    headers[providerConfig.auth.key] = apiKey;
  }
  // Note: 'query' type is handled in URL building

  return headers;
}

export async function POST(request: NextRequest) {
  console.log('Received custom LLM provider request');
  try {
    const body: RequestBody = await request.json();
    const { prompt, apiKey, model, providerConfig } = body;

    // Validate required fields
    if (!prompt) throw new Error('Prompt is required');
    if (!apiKey) throw new Error('API key is required');
    if (!model) throw new Error('Model is required');
    if (!providerConfig) throw new Error('Provider configuration is required');
    if (!providerConfig.endpoint) throw new Error('Provider endpoint is required');
    if (!providerConfig.auth) throw new Error('Provider authentication is required');
    if (!providerConfig.responsePath) throw new Error('Response path is required');
    if (!providerConfig.requestTemplate) throw new Error('Request template is required');

    // Variables available for template replacement
    const templateVars = {
      prompt,
      model,
      api_key: apiKey
    };

    // Replace variables in endpoint URL
    const baseUrl = replaceTemplateVars(providerConfig.endpoint, templateVars);

    // Replace variables in query parameters and build URL
    const queryParams = 'query' in providerConfig.requestTemplate && providerConfig.requestTemplate.query
      ? replaceTemplateVars(providerConfig.requestTemplate.query, templateVars)
      : {};

    const url = buildRequestUrl(baseUrl, queryParams, providerConfig.auth, apiKey);

    // Build headers with proper authentication
    const headers = buildRequestHeaders(providerConfig, apiKey);

    // Build request body - handle both direct template and nested body formats
    const requestBody = 'body' in providerConfig.requestTemplate
      ? replaceTemplateVars(providerConfig.requestTemplate.body, templateVars)
      : replaceTemplateVars(providerConfig.requestTemplate, templateVars);

    // Log request details (with sensitive data redacted)
    console.log('Making request to:', url.replace(apiKey, '[REDACTED]'));
    console.log('With headers:', { 
      ...headers, 
      Authorization: headers.Authorization ? '[REDACTED]' : undefined,
      [providerConfig.auth.key]: '[REDACTED]'
    });
    console.log('With body:', requestBody);

    // Make request to provider
    const response = await fetch(url, {
      method: providerConfig.method || 'POST',
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
    const result = get(responseData, providerConfig.responsePath);
    if (result === undefined) {
      throw new Error(`Could not find response at path: ${providerConfig.responsePath}`);
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

// Example Google AI config for testing:
/*
const googleConfig: ProviderConfig = {
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
  responsePath: 'candidates[0].content.parts[0].text'
};
*/ 