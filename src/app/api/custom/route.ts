import { NextRequest, NextResponse } from 'next/server';
import get from 'lodash.get';

// Types for provider configuration
interface ProviderConfig {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT';
  auth: {
    type: 'bearer' | 'query' | 'header';
    key: string;
  };
  headers?: Record<string, string>;
  responsePath: string;
  requestTemplate?: {
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

// Helper to build request URL with query params
function buildUrl(baseUrl: string, queryParams: Record<string, string> = {}): string {
  const url = new URL(baseUrl);
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  return url.toString();
}

// Helper to replace template variables in strings and objects
function replaceTemplateVars(template: any, vars: Record<string, string>): any {
  if (typeof template === 'string') {
    return Object.entries(vars).reduce(
      (str, [key, value]) => str.replace(new RegExp(`{{${key}}}`, 'g'), value),
      template
    );
  }
  
  if (typeof template === 'object' && template !== null) {
    return Object.entries(template).reduce((obj, [key, value]) => ({
      ...obj,
      [key]: replaceTemplateVars(value, vars)
    }), Array.isArray(template) ? [] : {});
  }
  
  return template;
}

// Main API route handler
export async function POST(request: NextRequest) {
  console.log('Received custom LLM provider request');
  
  try {
    // Parse and validate request body
    const body: RequestBody = await request.json();
    const { prompt, apiKey, model, providerConfig } = body;

    if (!prompt || !apiKey || !model || !providerConfig) {
      console.error('Missing required fields in request');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!providerConfig.endpoint || !providerConfig.auth || !providerConfig.responsePath) {
      console.error('Invalid provider configuration');
      return NextResponse.json(
        { error: 'Invalid provider configuration' },
        { status: 400 }
      );
    }

    // Prepare request variables
    const templateVars = {
      prompt,
      model,
      apiKey
    };

    // Build request URL with query parameters
    const queryParams = providerConfig.requestTemplate?.query 
      ? replaceTemplateVars(providerConfig.requestTemplate.query, templateVars)
      : {};
    
    // Add API key to query params if auth type is 'query'
    if (providerConfig.auth.type === 'query') {
      queryParams[providerConfig.auth.key] = apiKey;
    }

    const url = buildUrl(providerConfig.endpoint, queryParams);

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...providerConfig.headers
    };

    // Add API key to headers based on auth type
    if (providerConfig.auth.type === 'bearer') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (providerConfig.auth.type === 'header') {
      headers[providerConfig.auth.key] = apiKey;
    }

    // Prepare request body
    const requestBody = providerConfig.requestTemplate?.body
      ? replaceTemplateVars(providerConfig.requestTemplate.body, templateVars)
      : { prompt };

    console.log('Making request to provider:', {
      url: providerConfig.endpoint,
      method: providerConfig.method || 'POST',
      headers: { ...headers, Authorization: '[REDACTED]' }
    });

    // Make request to provider
    const response = await fetch(url, {
      method: providerConfig.method || 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error('Provider API error:', {
        status: response.status,
        statusText: response.statusText
      });

      // Try to parse error response
      let errorDetail;
      try {
        errorDetail = await response.json();
      } catch {
        errorDetail = await response.text();
      }

      return NextResponse.json(
        {
          error: 'Provider API error',
          status: response.status,
          detail: errorDetail
        },
        { status: response.status }
      );
    }

    // Parse response
    const responseData = await response.json();
    const result = get(responseData, providerConfig.responsePath);

    if (result === undefined) {
      console.error('Could not find response at specified path:', {
        path: providerConfig.responsePath,
        response: responseData
      });
      return NextResponse.json(
        { error: 'Invalid response format from provider' },
        { status: 502 }
      );
    }

    console.log('Successfully processed provider response');
    return NextResponse.json({ response: result });

  } catch (error) {
    console.error('Unexpected error in custom provider route:', error);
    return NextResponse.json(
      { error: 'Internal server error', detail: (error as Error).message },
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