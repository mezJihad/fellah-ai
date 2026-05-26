import { NextResponse } from 'next/server';
import { EXPERTS, runAgent } from '@/lib/agentCore';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    // Vérification du token Supabase Auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const { expertId, message } = await request.json();

    if (!expertId || !message?.trim()) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const expert = EXPERTS[expertId];
    if (!expert) {
      return NextResponse.json({ error: 'Expert inconnu' }, { status: 400 });
    }

    // La session est liée à l'utilisateur authentifié, pas à un UUID aléatoire
    const sessionId = `web_${expertId}_${user.id}`;
    const reply = await runAgent(expert, sessionId, message.trim());

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('❌ Chat API error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
