import { NextRequest } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    console.log('Received request to /api/openai');
    const { prompt, apiKey, model } = await request.json();

    if (!apiKey) {
      console.log('API key missing');
      return new Response(
        JSON.stringify({ error: 'API key is required' }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate model
    if (!model?.startsWith('gpt-')) {
      return new Response(
        JSON.stringify({ error: 'Invalid model specified' }), 
        { status: 400 }
      );
    }

    console.log(`Making request to OpenAI API with model ${model}...`);
    const openai = new OpenAI({ apiKey });

    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      });

      console.log('Received response from OpenAI API');
      return new Response(
        JSON.stringify({
          response: completion.choices[0].message.content,
          usage: {
            input_tokens: completion.usage?.prompt_tokens,
            output_tokens: completion.usage?.completion_tokens,
          },
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error: any) {
      console.error('OpenAI API error:', error);

      // Handle specific API errors
      if (error.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key' }), 
          { status: 401 }
        );
      }
      if (error.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), 
          { status: 429 }
        );
      }
      if (error.status === 413) {
        return new Response(
          JSON.stringify({ error: 'Request too large' }), 
          { status: 413 }
        );
      }
      
      return new Response(
        JSON.stringify({ error: error.message || 'Failed to process request' }), 
        { status: 500 }
      );
    }
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