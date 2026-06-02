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
  const { data } = await supabase
    .from('conversations')
    .select('messages')
    .eq('account_id', accountId)
    .eq('channel', 'whatsapp')
    .eq('expert_id', expertId)
    .single();
  return (data?.messages as ChatMessage[]) ?? [];
}

export async function saveHistory(phone: string, expertId: string, messages: ChatMessage[]): Promise<void> {
  const accountId = await getOrCreateAccount(phone);
  await supabase
    .from('conversations')
    .upsert(
      { account_id: accountId, channel: 'whatsapp', expert_id: expertId, messages, updated_at: new Date().toISOString() },
      { onConflict: 'account_id, channel, expert_id' }
    );
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
  const { data } = await supabase
    .from('conversations')
    .select('messages')
    .eq('account_id', accountId)
    .eq('channel', 'web')
    .eq('expert_id', expertId)
    .single();
  return (data?.messages as ChatMessage[]) ?? [];
}

export async function saveHistoryByAccountId(accountId: string, expertId: string, messages: ChatMessage[]): Promise<void> {
  await supabase
    .from('conversations')
    .upsert(
      { account_id: accountId, channel: 'web', expert_id: expertId, messages, updated_at: new Date().toISOString() },
      { onConflict: 'account_id, channel, expert_id' }
    );
}
