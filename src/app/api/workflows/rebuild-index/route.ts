import { NextRequest, NextResponse } from 'next/server';
import { rebuildWorkflowIndex } from '@/lib/workflows';

export async function POST(request: NextRequest) {
  try {
    const result = await rebuildWorkflowIndex();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error rebuilding workflow index:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to rebuild index' },
      { status: 500 }
    );
  }
} 