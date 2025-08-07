import { NextRequest, NextResponse } from 'next/server';
import { getWorkflow, saveWorkflow, deleteWorkflow, updateWorkflowMetadata } from '@/lib/workflows';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflow = await getWorkflow(params.id);
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { modules, name, description } = body;

    if (!modules || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const workflow = await saveWorkflow(modules, name, description, params.id);
    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name && description === undefined) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    const workflow = await updateWorkflowMetadata(params.id, { name, description });
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Error updating workflow metadata:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow metadata' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteWorkflow(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
} 