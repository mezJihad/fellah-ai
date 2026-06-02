# Plan : Compte unifié WhatsApp ↔ Web

## Contexte

Actuellement, les comptes WhatsApp et web sont deux silos séparés qui ne se connaissent pas :
- WhatsApp : compte dans la table `accounts` identifié par le numéro de téléphone (format `whatsapp:+212...`)
- Web : pas de ligne dans `accounts` — le chat web utilise un identifiant hack (`web_agri_<uuid>`) sans vraie persistance

L'objectif : un seul compte par utilisateur, identifiable par son téléphone ET/OU son email. Quand le quota WhatsApp est atteint, le bot envoie un lien vers mgounai.com. L'utilisateur crée un compte web avec son numéro de téléphone → les deux comptes fusionnent → l'abonnement payant s'applique aux deux canaux.

---

## Problèmes actuels à corriger

1. `accounts.phone` stocke le préfixe Twilio (`whatsapp:+212...`) au lieu du numéro propre (`+212...`)
2. Pas de colonne `user_id` → impossible de lier un compte Supabase Auth à un compte WhatsApp
3. Les utilisateurs web ne créent pas de ligne dans `accounts` → pas de subscription, pas de persistance réelle
4. Formulaire d'inscription web sans numéro de téléphone

---

## Architecture cible

```
accounts table
├── id UUID (PK)
├── phone TEXT UNIQUE NULL       ← numéro E.164 : +212612345678 (sans préfixe whatsapp:)
├── user_id UUID UNIQUE NULL     ← Supabase Auth user.id (NEW)
├── subscription_tier            ← 'free' | 'pro'
├── subscription_status          ← 'active' | 'suspended'
├── message_count, monthly_message_count, message_month
└── created_at

Flux WhatsApp :
  téléphone → accounts(phone) → subscription check → runAgent

Flux Web :
  Supabase Auth → accounts(user_id) → runAgent

Lien :
  signup web avec téléphone → accounts(phone) existant → UPDATE SET user_id = auth.user.id
  → compte unifié : subscription valable sur les deux canaux
```

---

## Étapes d'implémentation

### Étape 1 — Migration SQL (Supabase dashboard → SQL Editor)

```sql
-- Ajouter la colonne user_id
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE NULL;

-- Nettoyer les numéros existants (supprimer le préfixe whatsapp:)
UPDATE accounts SET phone = REPLACE(phone, 'whatsapp:', '') WHERE phone LIKE 'whatsapp:%';
```

### Étape 2 — Modifier `src/lib/conversationStore.ts`

Ajouter deux nouvelles fonctions à côté des existantes :

```typescript
// Récupère ou crée un compte par user_id (pour les utilisateurs web)
export async function getOrCreateAccountByUserId(userId: string): Promise<string>
// Retourne account.id (UUID)

// Variantes getHistory/saveHistory par user_id
export async function getHistoryByUserId(userId: string): Promise<ChatMessage[]>
export async function saveHistoryByUserId(userId: string, messages: ChatMessage[]): Promise<void>
```

`getOrCreateAccount(phone)` reste inchangée mais on enlève le préfixe `whatsapp:` en entrée.

### Étape 3 — Modifier `src/lib/subscriptionStore.ts`

- `checkAccess(phone)` : normaliser le téléphone (`.replace('whatsapp:', '')`) avant le upsert
- `incrementMessageCount(phone)` : même normalisation
- Message quota atteint : inclure une instruction claire avec le lien et le numéro à utiliser lors de l'inscription

```
MSG_LIMIT_REACHED = "Vous avez atteint la limite de votre abonnement gratuit.
Inscrivez-vous sur mgounai.com avec votre numéro de téléphone pour continuer.
🌾 Abonnement Pro disponible sur mgounai.com"
```

### Étape 4 — Nouveau `src/app/api/auth/link/route.ts`

Endpoint appelé après l'inscription web pour lier le compte auth au compte WhatsApp :

```typescript
POST /api/auth/link
Headers: Authorization: Bearer <access_token>
Body: { phone: string }  // ex: "+212612345678"

Logique :
1. Valider le token → obtenir user.id
2. Normaliser le téléphone (E.164)
3. Chercher un compte existant avec ce phone
4. Si trouvé → UPDATE SET user_id = auth.user.id (fusion des comptes)
5. Si non trouvé → créer un compte avec phone + user_id
6. Retourner { success: true }
```

### Étape 5 — Modifier `src/app/api/chat/route.ts`

Remplacer l'identifiant hack `web_agri_<user.id>` par un vrai account_id :

```typescript
// Avant (hack) :
const sessionId = `web_${expertId}_${user.id}`;
const reply = await runAgent(expert, sessionId, message.trim());

// Après :
const history = await getHistoryByUserId(user.id);
// passer history directement à runAgent ou utiliser l'account.id
```

Également : vérifier que l'utilisateur web a un compte actif (sinon créer automatiquement avec `subscription_tier='free'`).

### Étape 6 — Modifier `src/components/ChatWidget.tsx`

Ajouter un champ téléphone **obligatoire** dans le formulaire d'inscription (mode `signup`) :

```typescript
// Nouveau state
const [phone, setPhone] = useState('');

// Nouveau champ dans le formulaire signup
<input type="tel" placeholder="Numéro WhatsApp (ex: +212612345678)" value={phone} ... />

// Dans signup() :
if (!phone) { setAuthError('Numéro de téléphone requis.'); return; }
const { error } = await supabase.auth.signUp({ email, password });
if (!error) {
  // Appeler /api/auth/link pour lier le compte
  const { data: { session } } = await supabase.auth.getSession();
  await fetch('/api/auth/link', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  setAuthMode('confirm');
}
```

Note : si Supabase Auth exige une confirmation email, le `getSession()` après signUp sera null → stocker le téléphone en attendant la confirmation et appeler `/api/auth/link` lors de la première connexion. Solution simplifiée : désactiver la confirmation email dans Supabase (Authentication → Providers → Email → "Confirm email" OFF).

### Étape 7 — Modifier `src/app/api/whatsapp-webhook/route.ts`

- Normaliser le phone avant `checkAccess` : `sender.replace('whatsapp:', '')`
- Passer le phone normalisé à `runAgent` et `getHistory`
- S'assurer que `getHistory(senderNormalized)` fonctionne avec le nouveau format

---

## Fichiers à modifier

| Fichier | Action |
|---|---|
| Supabase SQL Editor | Migration : ADD COLUMN user_id + UPDATE phone |
| `src/lib/conversationStore.ts` | Ajouter getOrCreateAccountByUserId, getHistoryByUserId, saveHistoryByUserId |
| `src/lib/subscriptionStore.ts` | Normaliser phone, améliorer message quota atteint |
| `src/app/api/auth/link/route.ts` | CRÉER — endpoint de liaison compte |
| `src/app/api/chat/route.ts` | Utiliser getHistoryByUserId + account réel |
| `src/components/ChatWidget.tsx` | Ajouter champ téléphone obligatoire + appel /api/auth/link |
| `src/app/api/whatsapp-webhook/route.ts` | Normaliser phone (strip whatsapp:) |

## Ce qu'on ne fait PAS maintenant

- Stripe / paiement réel (étape suivante)
- Page profil pour modifier le téléphone après inscription
- Fusion des historiques web/WhatsApp (les conversations restent séparées par canal)

---

## Vérification end-to-end

1. **WhatsApp nouveau numéro** → message reçu → compte créé avec `phone=+212...`, `user_id=null`
2. **Quota WhatsApp atteint** (`FREE_TIER_LIMIT=2`) → message de refus avec lien mgounai.com
3. **Inscription web** avec le même numéro → `/api/auth/link` → `UPDATE accounts SET user_id=...` → ligne `accounts` unifiée avec phone ET user_id
4. **Chat web** → `getHistoryByUserId` → trouve le compte par user_id → chat fonctionne
5. **WhatsApp après inscription** → compte trouvé par phone → subscription_tier du compte unifié appliqué
