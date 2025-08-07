import { NextRequest } from 'next/server';
import OpenAI from 'openai';

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

export async function POST(request: NextRequest) {
  try {
    const { anthropicApiKey, openaiApiKey } = await request.json();
    const models: { openai: string[]; anthropic: string[] } = {
      openai: [],
      anthropic: []
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
      // We could validate the API key here with a simple request if needed
      models.anthropic = ANTHROPIC_MODELS;
      console.log('Added Anthropic models:', models.anthropic.length);
    }

    // Check if we have any models at all
    if (models.openai.length === 0 && models.anthropic.length === 0) {
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