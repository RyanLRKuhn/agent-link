import { NextRequest, NextResponse } from 'next/server';
import { listProviders, saveProvider } from '@/lib/providers';

export async function GET() {
  try {
    const providers = await listProviders();
    return NextResponse.json(providers);
  } catch (error) {
    console.error('Error listing providers:', error);
    return NextResponse.json(
      { error: 'Failed to list providers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const provider = await saveProvider(body);
    return NextResponse.json(provider, { status: 201 });
  } catch (error) {
    console.error('Error creating provider:', error);
    return NextResponse.json(
      { error: 'Failed to create provider' },
      { status: 500 }
    );
  }
} 