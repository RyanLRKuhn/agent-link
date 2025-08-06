import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, apiKey, isTest } = body;

    // Validate request
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // For test connection requests, we just verify the API key
    if (isTest) {
      try {
        const anthropic = new Anthropic({ apiKey });
        // Make a minimal request to verify the key
        await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1,
          messages: [{ role: "user", content: "test" }],
        });
        return NextResponse.json({ status: 'valid' });
      } catch (error: any) {
        if (error.status === 401) {
          return NextResponse.json(
            { error: 'Invalid API key' },
            { status: 401 }
          );
        }
        throw error;
      }
    }

    // Regular prompt request
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // Make request to Anthropic API
    const completion = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Return the response with metadata
    if (completion.content[0].type === 'text') {
      return NextResponse.json({
        response: completion.content[0].text,
        usage: {
          input_tokens: completion.usage.input_tokens,
          output_tokens: completion.usage.output_tokens,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      throw new Error('Unexpected response type from Claude API');
    }

  } catch (error: any) {
    console.error('Error calling Claude API:', error);

    // Handle specific API errors
    if (error.status === 401) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    if (error.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    if (error.status === 413) {
      return NextResponse.json(
        { error: 'Request too large. Please reduce the prompt size.' },
        { status: 413 }
      );
    }

    if (error.status === 400) {
      return NextResponse.json(
        { error: error.message || 'Invalid request to Claude API' },
        { status: 400 }
      );
    }

    // Network or other errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Network error. Please check your connection and try again.' },
        { status: 503 }
      );
    }

    // Generic error handler
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
} 