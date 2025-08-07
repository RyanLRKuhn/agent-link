import { CustomProvider } from '../types/workflow';

export type ProviderTemplate = {
  id: string;
  name: string;
  description: string;
  config: Omit<CustomProvider, 'id' | 'name'> & {
    endpoint: string;
    auth: {
      type: 'bearer' | 'query' | 'header';
      key: string;
    };
    requestTemplate: {
      body?: Record<string, any>;
      query?: Record<string, string>;
    };
    responsePath: string;
    models?: string[];
  };
  documentation: {
    endpoint: string;
    auth: string;
    requestFormat: string;
    responseFormat: string;
    models?: string;
  };
};

export const PROVIDER_TEMPLATES: ProviderTemplate[] = [
  {
    id: 'openai-compatible',
    name: 'OpenAI Compatible',
    description: 'For APIs that follow the OpenAI Chat Completions format',
    config: {
      type: 'custom',
      endpoint: 'https://api.example.com/v1/chat/completions',
      auth: {
        type: 'bearer',
        key: 'Authorization'
      },
      requestTemplate: {
        body: {
          model: '{{model}}',
          messages: [
            {
              role: 'user',
              content: '{{prompt}}'
            }
          ]
        }
      },
      responsePath: 'choices[0].message.content'
    },
    documentation: {
      endpoint: 'The base URL for your API endpoint',
      auth: 'Bearer token authentication (standard OpenAI format)',
      requestFormat: 'OpenAI chat completions format with messages array',
      responseFormat: 'Standard OpenAI response format with choices array',
      models: 'List your compatible model IDs'
    }
  },
  {
    id: 'google-ai',
    name: 'Google AI',
    description: 'Google AI Gemini API format',
    config: {
      type: 'custom',
      endpoint: 'https://generativelanguage.googleapis.com/v1/models/{{model}}:generateContent',
      auth: {
        type: 'query',
        key: 'key'
      },
      requestTemplate: {
        body: {
          contents: [
            {
              parts: [
                {
                  text: '{{prompt}}'
                }
              ]
            }
          ]
        }
      },
      responsePath: 'candidates[0].content.parts[0].text',
      models: [
        'gemini-1.5-pro',
        'gemini-1.5-flash'
      ]
    },
    documentation: {
      endpoint: 'Google AI API endpoint with model parameter',
      auth: 'API key as URL query parameter',
      requestFormat: 'Google AI Gemini request format with contents array',
      responseFormat: 'Gemini response format with candidates array',
      models: 'Available Gemini model versions'
    }
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Create a custom provider configuration from scratch',
    config: {
      type: 'custom',
      endpoint: '',
      auth: {
        type: 'bearer',
        key: 'Authorization'
      },
      requestTemplate: {
        body: {},
        query: {}
      },
      responsePath: '',
      models: []
    },
    documentation: {
      endpoint: 'Your API endpoint URL',
      auth: 'Authentication method and key name',
      requestFormat: 'Request body/query template with {{prompt}} and {{model}} variables',
      responseFormat: 'Path to extract response text (e.g., "response.text" or "data.content")',
      models: 'List of available model IDs'
    }
  }
]; 