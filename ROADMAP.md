# Fellah AI — Roadmap

## 🔴 Bloquant pour la mise en production

- [ ] **Handler GET** — Twilio exige une réponse au GET pour valider l'URL du webhook
- [ ] **Vérification de signature Twilio** — sécuriser le webhook pour n'accepter que les requêtes Twilio

## 🟠 Qualité produit

- [ ] **Détection de langue pour la voix TTS** — voix française (`fr-FR-HenriNeural`) si réponse en français, arabe marocain sinon
- [ ] **Message de bienvenue** — accueillir les nouveaux utilisateurs et expliquer comment utiliser Fellah AI
- [ ] **Support des images** — diagnostic visuel de plantes malades via photo (Gemini Vision)
- [ ] **QR code réel** sur la landing page + vrai numéro WhatsApp dans le bouton CTA

## 🟡 Intelligence agricole marocaine

- [ ] **RAG (base de connaissances locale)** — calendriers agricoles marocains, variétés locales (Picholine, Menara...), maladies par région, prix des marchés
- [ ] **Intégration météo** — données météo de la région de l'agriculteur pour des conseils adaptés
- [ ] **Prompt système amélioré** — affiner avec des connaissances agricoles marocaines précises (INRA Maroc, Agri-Maroc...)

## 🟢 Nice to have

- [ ] **Dashboard admin** — visualiser les conversations, questions fréquentes, erreurs
- [ ] **Nettoyage des audios en mémoire** — purge si Twilio ne fetch pas l'audio dans un délai donné
- [ ] **Tests automatisés** — simuler des payloads Twilio sans passer par WhatsApp

## ✅ Terminé

- [x] Landing page (français, CTA WhatsApp)
- [x] Webhook WhatsApp (POST)
- [x] Transcription vocale Groq Whisper (audio → texte, en arrière-plan)
- [x] LLM Gemini avec fallback OpenAI
- [x] Synthèse vocale Azure TTS `ar-MA-JamalNeural` (texte → MP3)
- [x] Audio servi en mémoire via `/api/audio/[id]` (aucun fichier sur disque)
- [x] Nettoyage markdown avant TTS (étoiles, #, tirets)
- [x] Historique de conversation par utilisateur
- [x] Persistance des conversations — Supabase (accounts + conversations)
- [x] Déploiement — Hetzner CX23 Helsinki, Node.js 22, PM2, Caddy SSL
- [x] Domaine mgounai.com + HTTPS automatique via Caddy/Let's Encrypt
- [x] Webhook Twilio mis à jour → https://mgounai.com/api/whatsapp-webhook
