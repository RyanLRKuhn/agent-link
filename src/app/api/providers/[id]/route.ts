import { NextRequest, NextResponse } from 'next/server';
import { getProvider, saveProvider, deleteProvider, updateProviderMetadata } from '@/lib/providers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const provider = await getProvider(params.id);
    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(provider);
  } catch (error) {
    console.error('Error fetching provider:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider' },
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
    const provider = await saveProvider(body, params.id);
    return NextResponse.json(provider);
  } catch (error) {
    console.error('Error updating provider:', error);
    return NextResponse.json(
      { error: 'Failed to update provider' },
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
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const provider = await updateProviderMetadata(params.id, { name });
    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(provider);
  } catch (error) {
    console.error('Error updating provider metadata:', error);
    return NextResponse.json(
      { error: 'Failed to update provider metadata' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteProvider(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting provider:', error);
    return NextResponse.json(
      { error: 'Failed to delete provider' },
      { status: 500 }
    );
  }
} 