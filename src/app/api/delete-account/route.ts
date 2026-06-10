import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify the token and get the user identity
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);
  if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Admin client (service role) to bypass RLS and delete auth user
  const admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find the account row linked to this auth user
  const { data: account } = await admin
    .from('accounts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (account?.id) {
    // Delete conversations first (may not cascade automatically)
    await admin.from('conversations').delete().eq('account_id', account.id);
    await admin.from('accounts').delete().eq('id', account.id);
  }

  // Delete the Supabase Auth user
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('deleteUser error:', deleteError);
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
