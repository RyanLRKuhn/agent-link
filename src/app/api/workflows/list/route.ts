import { NextResponse } from 'next/server';
import { listWorkflows } from '@/lib/workflows';
import { debug } from '@/lib/workflows';

export async function GET() {
  try {
    // Log environment state in development
    if (process.env.NODE_ENV === 'development') {
      debug();
    }

    // Get workflows using server-side function
    const workflows = await listWorkflows();

    // Return response with no-cache headers
    return new NextResponse(JSON.stringify(workflows), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error listing workflows:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list workflows' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
} 