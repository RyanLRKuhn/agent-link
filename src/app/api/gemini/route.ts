import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    console.log('Received request to /api/gemini');
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
    if (!model?.startsWith('gemini-')) {
      return new Response(
        JSON.stringify({ error: 'Invalid model specified' }),
        { status: 400 }
      );
    }

    console.log(`Making request to Google AI API with model ${model}...`);
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelInstance = genAI.getGenerativeModel({ model });

    try {
      const result = await modelInstance.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('Received response from Google AI API');
      return new Response(
        JSON.stringify({
          response: text,
          usage: {
            // Note: Gemini doesn't provide token counts directly
            input_tokens: Math.ceil(prompt.length / 4),
            output_tokens: Math.ceil(text.length / 4)
          },
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );

    } catch (error: any) {
      console.error('Google AI API error:', error);

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