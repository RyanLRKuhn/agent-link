import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const config = await request.json();

    // Basic validation
    if (!config.name) throw new Error('Provider name is required');
    if (!config.endpoint) throw new Error('Endpoint URL is required');
    if (!config.auth?.type) throw new Error('Authentication type is required');
    if (!config.auth?.key) throw new Error('Authentication key is required');
    if (!config.responsePath) throw new Error('Response path is required');

    // Validate request template
    try {
      if (typeof config.requestTemplate !== 'object') {
        throw new Error('Request template must be a valid JSON object');
      }
    } catch (error) {
      throw new Error('Invalid request template format');
    }

    // Validate models
    if (!Array.isArray(config.models) || config.models.length === 0) {
      throw new Error('At least one model must be specified');
    }

    // Validate endpoint URL
    try {
      new URL(config.endpoint);
    } catch (error) {
      throw new Error('Invalid endpoint URL');
    }

    // Validate auth type
    if (!['bearer', 'query', 'header'].includes(config.auth.type)) {
      throw new Error('Invalid authentication type');
    }

    // All validation passed
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Custom provider test error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
} 