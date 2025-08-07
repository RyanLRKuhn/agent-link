import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Hardcoded Anthropic models since they don't have a models API
const ANTHROPIC_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-haiku-20240307',
  'claude-3-opus-20240229'
];

// OpenAI model prefixes we want to include
const ALLOWED_MODEL_PREFIXES = [
  'gpt-4',
  'gpt-3.5-turbo'
];

interface GoogleAIModel {
  name: string;
  version: string;
  displayName: string;
  description: string;
  supportedGenerationMethods: string[];
  temperature?: {
    minValue?: number;
    maxValue?: number;
    defaultValue?: number;
  };
}

async function fetchGoogleAIModels(apiKey: string): Promise<string[]> {
  try {
    console.log('Fetching Google AI models...');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
      { 
        headers: { 
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Google AI API error response:', error);
      throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Raw Google AI models response:', data);

    if (!data.models || !Array.isArray(data.models)) {
      console.warn('Unexpected Google AI models response format:', data);
      return [];
    }

    console.log('Google AI models:', data.models);

    // Filter for generative models that support text generation
    const filteredModels = data.models
      .filter((model: GoogleAIModel) => {
        const isGenerative = model.supportedGenerationMethods?.includes('generateContent');
        const isTextModel = !model.name.includes('vision');
        console.log(`Model ${model.name}: generative=${isGenerative}, text=${isTextModel}`);
        return isGenerative && isTextModel;
      })
      .map((model: GoogleAIModel) => {
        // Extract model name from format "models/gemini-pro"
        const modelName = model.name.split('/').pop();
        console.log('Found model:', modelName);
        return modelName;
      })
      .filter(Boolean);

    console.log('Filtered Google AI models:', filteredModels);
    return filteredModels;

  } catch (error) {
    console.error('Error fetching Google AI models:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { anthropicApiKey, openaiApiKey, googleApiKey } = await request.json(); // Changed from googleaiApiKey
    console.log('Received API keys:', {
      anthropic: !!anthropicApiKey,
      openai: !!openaiApiKey,
      google: !!googleApiKey
    });

    const models: { openai: string[]; anthropic: string[]; google: string[] } = {
      openai: [],
      anthropic: [],
      google: []
    };

    // Fetch OpenAI models if API key is provided
    if (openaiApiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiApiKey });
        const response = await openai.models.list();
        
        // Filter for chat models and sort by ID
        models.openai = response.data
          .filter(model => 
            ALLOWED_MODEL_PREFIXES.some(prefix => model.id.startsWith(prefix)) &&
            !model.id.includes('instruct') // Exclude instruct models
          )
          .map(model => model.id)
          .sort();

        console.log('Successfully fetched OpenAI models:', models.openai.length);
      } catch (error: any) {
        console.error('Error fetching OpenAI models:', error);
        if (error?.status === 401) {
          return new Response(
            JSON.stringify({ error: 'Invalid OpenAI API key' }),
            { status: 401 }
          );
        }
        // Don't fail completely, just return empty array for OpenAI
        console.warn('Could not fetch OpenAI models, continuing with empty list');
      }
    }

    // Add Anthropic models if API key is provided
    if (anthropicApiKey) {
      models.anthropic = ANTHROPIC_MODELS;
      console.log('Added Anthropic models:', models.anthropic.length);
    }

    // Fetch Google AI models if API key is provided
    if (googleApiKey) {
      try {
        models.google = await fetchGoogleAIModels(googleApiKey);
        console.log('Successfully fetched Google AI models:', models.google.length);
      } catch (error: any) {
        console.error('Error fetching Google AI models:', error);
        if (error.message?.includes('API key not valid')) {
          return new Response(
            JSON.stringify({ error: 'Invalid Google AI API key' }),
            { status: 401 }
          );
        }
        // Don't fail completely, just return empty array for Google AI
        console.warn('Could not fetch Google AI models, continuing with empty list');
      }
    }

    // Check if we have any models at all
    if (models.openai.length === 0 && models.anthropic.length === 0 && models.google.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No API keys provided or all keys were invalid' }),
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify(models),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Route handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Invalid request format' }),
      { status: 400 }
    );
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405 }
  );
} 