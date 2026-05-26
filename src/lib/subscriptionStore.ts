import { supabase } from './supabase';

const FREE_TIER_LIMIT = parseInt(process.env.FREE_TIER_LIMIT ?? '100', 10);

const MSG_SUSPENDED =
  "Votre accès Mgoun AI a été suspendu. Contactez-nous sur mgounai.com pour plus d'informations.";

const MSG_LIMIT_REACHED =
  `Vous avez atteint la limite de votre abonnement gratuit (${FREE_TIER_LIMIT} messages/mois). 🌾 Passez à l'abonnement Pro sur mgounai.com pour continuer sans limite.`;

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function checkAccess(phone: string): Promise<{ allowed: boolean; reason?: string }> {
  const { data, error } = await supabase
    .from('accounts')
    .upsert({ phone }, { onConflict: 'phone' })
    .select('subscription_tier, subscription_status, monthly_message_count, message_month')
    .single();

  if (error || !data) {
    console.error('❌ subscriptionStore.checkAccess:', error);
    return { allowed: true }; // fail open — ne pas bloquer si Supabase est indisponible
  }

  if (data.subscription_status === 'suspended') {
    return { allowed: false, reason: MSG_SUSPENDED };
  }

  if (data.subscription_tier === 'free') {
    const month = currentMonth();
    const usedThisMonth = data.message_month === month ? (data.monthly_message_count as number) : 0;
    if (usedThisMonth >= FREE_TIER_LIMIT) {
      return { allowed: false, reason: MSG_LIMIT_REACHED };
    }
  }

  return { allowed: true };
}

export async function incrementMessageCount(phone: string): Promise<void> {
  const month = currentMonth();

  const { data } = await supabase
    .from('accounts')
    .select('id, message_count, monthly_message_count, message_month')
    .eq('phone', phone)
    .single();

  if (!data) return;

  const isNewMonth = data.message_month !== month;

  await supabase
    .from('accounts')
    .update({
      message_count: (data.message_count as number) + 1,
      monthly_message_count: isNewMonth ? 1 : (data.monthly_message_count as number) + 1,
      message_month: month,
    })
    .eq('id', data.id);
}
