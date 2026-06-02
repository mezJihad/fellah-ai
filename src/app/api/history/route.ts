import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrCreateAccountByUserId, getHistoryByAccountId } from '@/lib/conversationStore';

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

    const accountId = await getOrCreateAccountByUserId(user.id);
    const history = await getHistoryByAccountId(accountId, expertId);

    const messages = history.map(msg => ({
      role: (msg.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
      text: msg.parts[0]?.text ?? '',
    }));

    return NextResponse.json({ messages });
  } catch (err) {
    console.error('❌ /api/history:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
