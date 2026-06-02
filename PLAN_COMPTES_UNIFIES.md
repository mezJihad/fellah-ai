# Plan : Compte unifié WhatsApp ↔ Web

## Intention métier

- **Chat web** : nécessite la création d'un compte pour discuter
- **WhatsApp** : discussion libre au départ, mais une fois la limite atteinte il faut créer un compte
- **Inscription** : email + mot de passe (téléphone WhatsApp facultatif)
- **Liaison compte ↔ WhatsApp** : si le compte existe déjà et a un autre numéro lié → confirmation de changement
- **Plus tard** : abonnements payants qui donnent plus de crédits de discussion

---

## Problèmes actuels à corriger

1. `accounts.phone` stocke le préfixe Twilio (`whatsapp:+212...`) au lieu du numéro propre (`+212...`)
2. Pas de colonne `user_id` → impossible de lier un compte Supabase Auth à un compte WhatsApp
3. Les utilisateurs web ne créent pas de ligne dans `accounts` → pas de subscription, pas de persistance réelle
4. Formulaire d'inscription web sans champ téléphone
5. Cas "numéro déjà lié à un autre compte" non géré

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
```

### Flux WhatsApp
```
1. Premier message → compte auto-créé (phone, user_id=null, tier=free)
2. Sous la limite → discussion normale
3. Limite atteinte → message : "Créez un compte sur mgounai.com pour continuer"
4. Après inscription web avec ce numéro → comptes fusionnés
5. Discussions futures → quota de l'abonnement web appliqué
```

### Flux Web
```
1. Ouverture widget → formulaire de connexion/inscription
2. Inscription : email + mot de passe + téléphone (facultatif)
3. Connexion → chat disponible immédiatement
4. Si téléphone fourni → liaison avec compte WhatsApp existant (ou création)
```

### Liaison compte web ↔ WhatsApp (via /api/auth/link)
```
Cas 1 : Téléphone non fourni
  → compte web créé sans numéro WhatsApp (user_id seulement)

Cas 2 : Téléphone fourni, aucun compte WhatsApp avec ce numéro
  → création/màj du compte avec phone + user_id

Cas 3 : Téléphone fourni, compte WhatsApp existant sans user_id
  → fusion : UPDATE SET user_id = auth.user.id (compte unifié)

Cas 4 : Téléphone fourni, compte web a déjà un AUTRE numéro lié
  → retourner { needsConfirmation: true, currentPhone: '+212...' }
  → widget affiche : "Ce compte est lié au +212... Remplacer par +212... ?"
  → si confirmé → UPDATE phone sur accounts

Cas 5 : Téléphone fourni, déjà lié à un AUTRE compte web (user_id différent)
  → erreur : "Ce numéro est déjà utilisé par un autre compte"
```

---

## Étapes d'implémentation

### Étape 1 — Migration SQL (Supabase dashboard → SQL Editor)

```sql
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE NULL;

-- Nettoyer les numéros existants (supprimer le préfixe whatsapp:)
UPDATE accounts SET phone = REPLACE(phone, 'whatsapp:', '') WHERE phone LIKE 'whatsapp:%';
```

### Étape 2 — Modifier `src/lib/conversationStore.ts`

Ajouter les fonctions de lookup par `user_id` pour les utilisateurs web :

```typescript
export async function getOrCreateAccountByUserId(userId: string): Promise<string>
export async function getHistoryByUserId(userId: string): Promise<ChatMessage[]>
export async function saveHistoryByUserId(userId: string, messages: ChatMessage[]): Promise<void>
```

`getOrCreateAccount(phone)` reste inchangée — le webhook WhatsApp continue à l'utiliser.

### Étape 3 — Modifier `src/lib/subscriptionStore.ts`

- `checkAccess(phone)` : normaliser (`.replace('whatsapp:', '')`) avant upsert
- `incrementMessageCount(phone)` : même normalisation
- Message quota atteint :

```
"Vous avez atteint la limite de votre abonnement gratuit.
Créez un compte sur mgounai.com pour continuer vos discussions.
Utilisez votre numéro de téléphone lors de l'inscription pour récupérer votre historique."
```

### Étape 4 — Nouveau `src/app/api/auth/link/route.ts`

```
POST /api/auth/link
Headers: Authorization: Bearer <token>
Body: { phone?: string, confirmChange?: boolean }

Réponses possibles :
- { success: true }                                    → lien effectué
- { needsConfirmation: true, currentPhone: string }    → demande confirmation changement
- { error: 'number_taken' }                            → numéro pris par un autre compte
- { success: true, phoneLinked: false }                → inscription sans téléphone OK
```

Logique complète (voir Cas 1 à 5 dans la section Architecture ci-dessus).

### Étape 5 — Modifier `src/app/api/chat/route.ts`

```typescript
// Remplacer le hack web_agri_<uuid> :
const history = await getHistoryByUserId(user.id);
// utiliser account.id comme sessionId stable pour runAgent
```

### Étape 6 — Modifier `src/components/ChatWidget.tsx`

**Formulaire d'inscription** : ajouter champ téléphone facultatif + nouvel état `'confirm-phone-change'`

```typescript
const [phone, setPhone] = useState('');

// Après signUp réussi, si téléphone fourni :
const linkRes = await fetch('/api/auth/link', { body: { phone } });
const linkData = await linkRes.json();

if (linkData.needsConfirmation) {
  // Afficher : "Ce compte est lié au +212... Remplacer par +212... ?"
  setAuthMode('confirm-phone-change');
  setPendingPhone(phone);
  setCurrentPhone(linkData.currentPhone);
} else if (linkData.error === 'number_taken') {
  setAuthError('Ce numéro est déjà utilisé par un autre compte.');
} else {
  setAuthMode('confirm'); // email de confirmation Supabase
}
```

**Nouvel état `confirm-phone-change`** : afficher les deux numéros + boutons Confirmer / Annuler.
Si confirmé → rappeler `/api/auth/link` avec `{ phone, confirmChange: true }`.

### Étape 7 — Modifier `src/app/api/whatsapp-webhook/route.ts`

```typescript
// Normaliser le sender avant tous les appels
const senderNormalized = sender.replace('whatsapp:', '');
// Utiliser senderNormalized pour checkAccess, getHistory, runAgent, incrementMessageCount
```

---

## Fichiers à modifier

| Fichier | Action |
|---|---|
| Supabase SQL Editor | ADD COLUMN user_id + UPDATE phone (strip whatsapp:) |
| `src/lib/conversationStore.ts` | Ajouter fonctions *ByUserId |
| `src/lib/subscriptionStore.ts` | Normaliser phone + améliorer message quota |
| `src/app/api/auth/link/route.ts` | CRÉER — gestion des 5 cas de liaison |
| `src/app/api/chat/route.ts` | Utiliser getHistoryByUserId |
| `src/components/ChatWidget.tsx` | Téléphone facultatif + confirmation changement numéro |
| `src/app/api/whatsapp-webhook/route.ts` | Normaliser phone |

## Ce qu'on ne fait PAS maintenant

- Stripe / abonnements payants (étape suivante)
- Page profil pour modifier le téléphone après inscription
- Fusion des historiques web/WhatsApp (conversations séparées par canal)

---

## Vérification end-to-end

1. **WhatsApp nouveau numéro** → discussions libres → compte `phone=+212...`, `user_id=null`
2. **Quota atteint** → message avec lien mgounai.com
3. **Inscription web sans téléphone** → compte web seul, chat web fonctionne
4. **Inscription web avec téléphone (Cas 3)** → fusion avec compte WhatsApp → `user_id` posé
5. **Inscription web avec téléphone déjà sur autre compte (Cas 5)** → message d'erreur clair
6. **Changement de numéro (Cas 4)** → widget affiche confirmation → après confirmation, numéro mis à jour
7. **Chat web** → `getHistoryByUserId` → conversations persistées correctement
