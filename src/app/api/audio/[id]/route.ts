import { NextResponse } from 'next/server';
import { audioStore } from '@/lib/audioStore';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const buffer = audioStore.get(params.id);

  if (!buffer) {
    return new NextResponse('Not found', { status: 404 });
  }

  audioStore.delete(params.id);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length.toString(),
    },
  });
}
