import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const rawPhone: string | undefined = body.phone;
    const confirmChange: boolean = body.confirmChange ?? false;

    // Cas 1 : Pas de téléphone fourni → compte web seul
    if (!rawPhone) {
      await supabase
        .from('accounts')
        .upsert({ user_id: user.id }, { onConflict: 'user_id' });
      return NextResponse.json({ success: true, phoneLinked: false });
    }

    const phone = rawPhone.replace('whatsapp:', '').trim();

    // Récupérer le compte web actuel (par user_id)
    const { data: webAccount } = await supabase
      .from('accounts')
      .select('id, phone')
      .eq('user_id', user.id)
      .maybeSingle();

    // Cas 4 : Le compte web a déjà un AUTRE numéro lié → confirmation
    if (webAccount?.phone && webAccount.phone !== phone && !confirmChange) {
      return NextResponse.json({ needsConfirmation: true, currentPhone: webAccount.phone });
    }

    // Chercher un compte WhatsApp existant avec ce numéro
    const { data: waAccount } = await supabase
      .from('accounts')
      .select('id, user_id')
      .eq('phone', phone)
      .maybeSingle();

    // Cas 5 : Le numéro est déjà lié à un AUTRE compte web
    if (waAccount?.user_id && waAccount.user_id !== user.id) {
      return NextResponse.json({ error: 'number_taken' }, { status: 409 });
    }

    if (waAccount) {
      // Cas 3 : Compte WhatsApp existant sans user_id (ou confirmChange cas 4)
      // → fusion : on lui attribue le user_id
      await supabase
        .from('accounts')
        .update({ user_id: user.id })
        .eq('id', waAccount.id);

      // Si le compte web existait séparément : migrer ses conversations web vers B puis supprimer A
      if (webAccount && webAccount.id !== waAccount.id) {
        await supabase
          .from('conversations')
          .update({ account_id: waAccount.id })
          .eq('account_id', webAccount.id)
          .eq('channel', 'web');
        await supabase.from('accounts').delete().eq('id', webAccount.id);
      }
    } else {
      // Cas 2 : Aucun compte WhatsApp avec ce numéro → créer ou mettre à jour
      if (webAccount) {
        await supabase
          .from('accounts')
          .update({ phone })
          .eq('id', webAccount.id);
      } else {
        await supabase
          .from('accounts')
          .upsert({ user_id: user.id, phone }, { onConflict: 'user_id' });
      }
    }

    return NextResponse.json({ success: true, phoneLinked: true });
  } catch (err) {
    console.error('❌ /api/auth/link:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
