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
    return NextResponse.json(workflows);
  } catch (error) {
    console.error('Error listing workflows:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list workflows' },
      { status: 500 }
    );
  }
} 