import { NextResponse } from 'next/server';
import { audioStore } from '@/lib/audioStore';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const buffer = audioStore.get(id);

  if (!buffer) {
    return new NextResponse('Not found', { status: 404 });
  }

  audioStore.delete(id);

  return new Response(buffer.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length.toString(),
    },
  });
}
