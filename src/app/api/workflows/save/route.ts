import { NextRequest, NextResponse } from 'next/server';
import { saveWorkflow } from '@/lib/workflows';
import { debug } from '@/lib/workflows';

export async function POST(request: NextRequest) {
  try {
    // Log environment state in development
    if (process.env.NODE_ENV === 'development') {
      debug();
    }

    const body = await request.json();
    const { modules, name, description, existingId } = body;

    // Validate required fields
    if (!modules || !Array.isArray(modules)) {
      return NextResponse.json(
        { error: 'Modules array is required' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Workflow name is required' },
        { status: 400 }
      );
    }

    // Save workflow using the server-side function
    const workflow = await saveWorkflow(modules, name, description, existingId);

    // Return the saved workflow
    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error('Error saving workflow:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save workflow' },
      { status: 500 }
    );
  }
} 