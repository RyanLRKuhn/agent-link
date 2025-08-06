import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Helper function to safely parse JSON request body
async function parseRequest(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Request body:', { ...body, apiKey: '[REDACTED]' });
    return body;
  } catch (error) {
    console.error('Failed to parse request body:', error);
    throw new Error('Invalid JSON in request body');
  }
}

// Helper function to validate request data
function validateRequest(prompt?: string, apiKey?: string) {
  const errors = [];
  if (!prompt) errors.push('Prompt is required');
  if (!apiKey) errors.push('API key is required');
  return errors;
}

// Helper function to create error response
function createErrorResponse(message: string, status: number = 400) {
  console.error(`Error response (${status}):`, message);
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export async function POST(request: NextRequest) {
  console.log('Received POST request to /api/claude');
  
  try {
    // Parse request body
    const { prompt, apiKey } = await parseRequest(request);
    
    // Validate request data
    const validationErrors = validateRequest(prompt, apiKey);
    if (validationErrors.length > 0) {
      return createErrorResponse(validationErrors.join(', '));
    }

    console.log('Creating Anthropic client...');
    const anthropic = new Anthropic({
      apiKey,
    });

    console.log('Sending request to Claude API...');
    try {
      const completion = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      console.log('Received response from Claude API:', {
        contentTypes: completion.content.map(c => c.type),
        usage: completion.usage,
      });

      // Find text content in response
      const textContent = completion.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        console.error('No text content in Claude response:', completion.content);
        return createErrorResponse('Unexpected response format from Claude API', 500);
      }

      // Construct successful response
      const response = {
        response: textContent.text,
        usage: {
          input_tokens: completion.usage?.input_tokens,
          output_tokens: completion.usage?.output_tokens,
        },
        timestamp: new Date().toISOString(),
      };
      
      console.log('Sending successful response:', {
        ...response,
        response: response.response.substring(0, 50) + '...',
      });

      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );

    } catch (error: any) {
      console.error('Claude API error:', {
        name: error.name,
        message: error.message,
        status: error.status,
        stack: error.stack,
      });

      // Handle specific API errors
      if (error.status === 401) {
        return createErrorResponse('Invalid API key', 401);
      }
      if (error.status === 429) {
        return createErrorResponse('Rate limit exceeded. Please try again later.', 429);
      }
      if (error.status === 413) {
        return createErrorResponse('Request too large', 413);
      }
      if (error.status === 400) {
        return createErrorResponse(error.message || 'Invalid request to Claude API', 400);
      }

      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return createErrorResponse('Network error connecting to Claude API', 503);
      }

      // Generic error handler
      return createErrorResponse(
        'An unexpected error occurred while calling Claude API',
        500
      );
    }
  } catch (error) {
    console.error('Route handler error:', error);
    return createErrorResponse(
      'Internal server error processing request',
      500
    );
  }
}

export async function GET() {
  return createErrorResponse('Method not allowed', 405);
} 