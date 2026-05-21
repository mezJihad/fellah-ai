import { supabase } from './supabase';

export type ChatMessage = { role: 'user' | 'model'; parts: { text: string }[] };

async function getOrCreateAccount(phone: string): Promise<string> {
  const { data, error } = await supabase
    .from('accounts')
    .upsert({ phone }, { onConflict: 'phone' })
    .select('id')
    .single();

  if (error || !data) throw new Error(`Supabase account upsert failed: ${error?.message}`);
  return data.id as string;
}

export async function getHistory(phone: string): Promise<ChatMessage[]> {
  const accountId = await getOrCreateAccount(phone);

  const { data } = await supabase
    .from('conversations')
    .select('messages')
    .eq('account_id', accountId)
    .single();

  return (data?.messages as ChatMessage[]) ?? [];
}

export async function saveHistory(phone: string, messages: ChatMessage[]): Promise<void> {
  const accountId = await getOrCreateAccount(phone);

  await supabase
    .from('conversations')
    .upsert(
      { account_id: accountId, messages, updated_at: new Date().toISOString() },
      { onConflict: 'account_id' }
    );
}
