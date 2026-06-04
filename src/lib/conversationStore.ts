import { supabase } from './supabase';

export type ChatMessage = { role: 'user' | 'model'; parts: { text: string }[] };

// ── Lookup par téléphone (WhatsApp) ─────────────────────────────────────────

async function getOrCreateAccount(phone: string): Promise<string> {
  const { data, error } = await supabase
    .from('accounts')
    .upsert({ phone }, { onConflict: 'phone' })
    .select('id')
    .single();

  if (error || !data) throw new Error(`Supabase account upsert failed: ${error?.message}`);
  return data.id as string;
}

export async function getHistory(phone: string, expertId: string): Promise<ChatMessage[]> {
  const accountId = await getOrCreateAccount(phone);
  const { data, error } = await supabase
    .from('conversations')
    .select('messages')
    .eq('account_id', accountId)
    .eq('channel', 'whatsapp')
    .eq('expert_id', expertId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.error('getHistory error:', error);
  return (data?.messages as ChatMessage[]) ?? [];
}

export async function saveHistory(phone: string, expertId: string, messages: ChatMessage[]): Promise<void> {
  const accountId = await getOrCreateAccount(phone);
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('account_id', accountId)
    .eq('channel', 'whatsapp')
    .eq('expert_id', expertId)
    .limit(1)
    .maybeSingle();

  const payload = { messages, updated_at: new Date().toISOString() };
  const { error } = existing?.id
    ? await supabase.from('conversations').update(payload).eq('id', existing.id)
    : await supabase.from('conversations').insert({ account_id: accountId, channel: 'whatsapp', expert_id: expertId, ...payload });

  if (error) console.error('saveHistory error:', error);
}

// ── Expert actif sur WhatsApp (par téléphone) ───────────────────────────────

export async function getAccountExpert(phone: string): Promise<string | null> {
  const accountId = await getOrCreateAccount(phone);
  const { data } = await supabase
    .from('accounts')
    .select('current_expert_id')
    .eq('id', accountId)
    .single();
  return (data?.current_expert_id as string | null) ?? null;
}

export async function setAccountExpert(phone: string, expertId: string | null): Promise<void> {
  const accountId = await getOrCreateAccount(phone);
  await supabase
    .from('accounts')
    .update({ current_expert_id: expertId })
    .eq('id', accountId);
}

// ── Lookup par user_id Supabase Auth (Web) ───────────────────────────────────

export async function getOrCreateAccountByUserId(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('accounts')
    .upsert({ user_id: userId }, { onConflict: 'user_id' })
    .select('id')
    .single();

  if (error || !data) throw new Error(`Supabase account upsert by user_id failed: ${error?.message}`);
  return data.id as string;
}

export async function getHistoryByAccountId(accountId: string, expertId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('messages')
    .eq('account_id', accountId)
    .eq('channel', 'web')
    .eq('expert_id', expertId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.error('getHistoryByAccountId error:', error);
  return (data?.messages as ChatMessage[]) ?? [];
}

export async function saveHistoryByAccountId(accountId: string, expertId: string, messages: ChatMessage[]): Promise<void> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('account_id', accountId)
    .eq('channel', 'web')
    .eq('expert_id', expertId)
    .limit(1)
    .maybeSingle();

  const payload = { messages, updated_at: new Date().toISOString() };
  const { error } = existing?.id
    ? await supabase.from('conversations').update(payload).eq('id', existing.id)
    : await supabase.from('conversations').insert({ account_id: accountId, channel: 'web', expert_id: expertId, ...payload });

  if (error) console.error('saveHistoryByAccountId error:', error);
}
