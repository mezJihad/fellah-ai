import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrCreateAccountByUserId, getHistoryByAccountId } from '@/lib/conversationStore';

const PAGE_SIZE = 30;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const expertId = searchParams.get('expertId');
    if (!expertId) return NextResponse.json({ error: 'expertId manquant' }, { status: 400 });

    const limit = Math.min(parseInt(searchParams.get('limit') ?? String(PAGE_SIZE)), 100);
    const beforeIndexParam = searchParams.get('beforeIndex');

    const accountId = await getOrCreateAccountByUserId(user.id);
    const allHistory = await getHistoryByAccountId(accountId, expertId);
    const total = allHistory.length;

    // Slice from the end: beforeIndex is the exclusive upper bound in the full array
    const endIdx = beforeIndexParam !== null ? Math.min(parseInt(beforeIndexParam), total) : total;
    const startIdx = Math.max(0, endIdx - limit);

    const messages = allHistory.slice(startIdx, endIdx).map(msg => ({
      role: (msg.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
      text: msg.parts[0]?.text ?? '',
    }));

    return NextResponse.json({ messages, startIndex: startIdx, hasMore: startIdx > 0 });
  } catch (err) {
    console.error('❌ /api/history:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
