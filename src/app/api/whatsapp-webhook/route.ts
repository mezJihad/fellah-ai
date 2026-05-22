import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, type Part } from '@google/generative-ai';
import OpenAI from 'openai';
import twilio from 'twilio';
import Groq from 'groq-sdk';
import crypto from 'crypto';
import { audioStore } from '@/lib/audioStore';
import { getHistory, saveHistory, type ChatMessage } from '@/lib/conversationStore';
import { retrieveContext } from '@/lib/ragStore';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

const SYSTEM_INSTRUCTION = "Tu es Mgoun AGRI, un assistant agricole expert pour les agriculteurs marocains. IMPORTANT : 1) Réponds TOUJOURS dans la même langue que l'utilisateur (français, arabe, darija, anglais). 2) Comporte-toi comme un vrai expert : si une question nécessite du contexte pour être précise (ex: type de sol, culture en bour ou irriguée, variété, région), pose d'abord ces questions à l'agriculteur au lieu de donner une réponse générique. 3) Ne donne PAS de longs détails superflus. Sois concis et va droit au but.";

const WELCOME_MESSAGE = `🌾 Bienvenue sur Mgoun AGRI !
أهلاً بك في Mgoun AGRI ! 🌿
Welcome to Mgoun AGRI!

Je suis votre expert IA en agriculture marocaine.
اسألني بالدارجة أو العربية أو الفرنسية أو الإنجليزية.
Ask me anything in Darija, Arabic, French or English.`;

// Voix Azure TTS par langue
const TTS_VOICES = {
  'ar-MA': { lang: 'ar-MA', name: 'ar-MA-MounaNeural' },
  'fr-FR': { lang: 'fr-FR', name: 'fr-FR-HenriNeural' },
  'en-US': { lang: 'en-US', name: 'en-US-GuyNeural' },
};

// ============================================================================
// 🌍 DÉTECTION DE LANGUE
// ============================================================================
function detectLanguage(text: string): keyof typeof TTS_VOICES {
  if (/[؀-ۿ]/.test(text)) return 'ar-MA';
  if (/[àâäéèêëîïôùûüç]|\b(je|tu|il|nous|vous|ils|est|sont|avec|pour|sur|dans|par|les|des|une|qui|que|pas|plus|très|bien|mais)\b/i.test(text)) return 'fr-FR';
  return 'en-US';
}

// ============================================================================
// 🧠 FONCTION DE SECOURS (OPENAI)
// ============================================================================
async function fallbackToOpenAI(history: ChatMessage[]): Promise<string> {
  const openaiHistory: { role: string; content: string }[] = [
    { role: 'system', content: SYSTEM_INSTRUCTION }
  ];
  for (const msg of history) {
    openaiHistory.push({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.parts[0].text
    });
  }
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: openaiHistory as never,
    max_tokens: 800,
  });
  return response.choices[0].message.content || "Désolé, j'ai eu un problème. Veuillez réessayer.";
}

// ============================================================================
// 📥 TÉLÉCHARGEMENT MEDIA TWILIO (audio + images)
// ============================================================================
async function downloadTwilioMedia(mediaUrl: string): Promise<Buffer> {
  const authHeader = 'Basic ' + Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
  ).toString('base64');
  const response = await fetch(mediaUrl, { headers: { Authorization: authHeader } });
  if (!response.ok) throw new Error(`Échec téléchargement Twilio media: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

// ============================================================================
// 🎙️ TRANSCRIPTION AUDIO (GROQ WHISPER)
// ============================================================================
async function transcribeAudio(mediaUrl: string): Promise<string> {
  const buffer = await downloadTwilioMedia(mediaUrl);
  const audioFile = new File([new Uint8Array(buffer)], 'audio.ogg', { type: 'audio/ogg' });
  const { text } = await groq.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-large-v3-turbo',
    response_format: 'json',
  });
  return text;
}

// ============================================================================
// 🧹 NETTOYAGE MARKDOWN POUR TTS
// ============================================================================
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .replace(/__([^_]*)__/g, '$1')
    .replace(/_([^_]*)_/g, '$1')
    .replace(/#{1,6}\s+/gm, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-•*]\s+/gm, '')
    .replace(/[\uD800-\uDFFF]./g, '')
    .replace(/\n{3,}/g, '\n')
    .trim();
}

// ============================================================================
// 🔊 SYNTHÈSE VOCALE (AZURE TTS) — avec détection de langue
// ============================================================================
async function generateSpeech(text: string, baseUrl: string): Promise<string> {
  const cleanText = stripMarkdown(text);
  const lang = detectLanguage(text);
  const voice = TTS_VOICES[lang];
  const azureKey = process.env.AZURE_SPEECH_KEY || '';
  const azureRegion = process.env.AZURE_SPEECH_REGION || 'francecentral';

  const ssml = `<speak version='1.0' xml:lang='${voice.lang}'>
    <voice name='${voice.name}'>
      ${cleanText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
    </voice>
  </speak>`;

  const response = await fetch(
    `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azureKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
      },
      body: ssml,
    }
  );

  if (!response.ok) throw new Error(`Azure TTS: ${response.status} ${response.statusText}`);

  const audioBuffer = await response.arrayBuffer();
  const id = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  audioStore.set(id, Buffer.from(audioBuffer));
  return `${baseUrl}/api/audio/${id}`;
}

// ============================================================================
// 📱 TRAITEMENT EN ARRIÈRE-PLAN
// ============================================================================
async function processMessageInBackground(
  sender: string,
  incomingText: string,
  mediaUrl: string | null,
  mediaContentType: string | null,
  baseUrl: string
) {
  const isAudio = !!mediaUrl && !!mediaContentType?.startsWith('audio/');
  const isImage = !!mediaUrl && !!mediaContentType?.startsWith('image/');

  let history = await getHistory(sender);
  const isNewUser = history.length === 0;

  // Message de bienvenue pour les nouveaux utilisateurs
  if (isNewUser) {
    try {
      await twilioClient.messages.create({
        body: WELCOME_MESSAGE,
        from: process.env.WHATSAPP_PHONE_NUMBER,
        to: sender,
      });
      console.log(`👋 Message de bienvenue envoyé à ${sender}`);
    } catch (err) {
      console.error('❌ Erreur envoi bienvenue:', err);
    }
  }

  let userText = incomingText;

  // Transcription audio
  if (isAudio && mediaUrl) {
    console.log('🎙️ Transcription audio via Groq Whisper...');
    try {
      userText = await transcribeAudio(mediaUrl);
      console.log(`📝 Transcription: "${userText}"`);
    } catch (err) {
      console.error('❌ Erreur transcription:', err);
      userText = '[Impossible de transcrire le message vocal. Veuillez réécrire en texte.]';
    }
  }

  console.log(`🧠 Requête LLM : "${userText}"`);

  // Récupération du contexte RAG
  const ragContext = await retrieveContext(userText);
  const systemWithContext = ragContext
    ? `${SYSTEM_INSTRUCTION}\n\nCONTEXTE DE LA BASE DE CONNAISSANCES (utilise ces informations en priorité) :\n${ragContext}`
    : SYSTEM_INSTRUCTION;

  if (ragContext) console.log('📖 Contexte RAG injecté.');

  // Construction du contenu Gemini (avec image si besoin)
  let llmResponseText = '';
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemWithContext,
    });

    // Contenu du message courant
    const currentParts: Part[] = [];
    if (userText) currentParts.push({ text: userText });

    if (isImage && mediaUrl && mediaContentType) {
      console.log('🖼️ Analyse image via Gemini Vision...');
      const imageBuffer = await downloadTwilioMedia(mediaUrl);
      currentParts.push({ inlineData: { mimeType: mediaContentType, data: imageBuffer.toString('base64') } });
      if (!userText) currentParts.push({ text: 'Analyse cette image.' });
    }

    const contents = [
      ...history,
      { role: 'user' as const, parts: currentParts },
    ];

    const result = await model.generateContent({
      contents,
      generationConfig: {
        maxOutputTokens: 2000,
        // @ts-ignore — thinkingConfig supported by gemini-2.5-flash, not yet in SDK types
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    llmResponseText = result.response.text();
    console.log('✅ Réponse Gemini générée.');
  } catch (error) {
    console.error('❌ Erreur Gemini (fallback OpenAI):', error);
    try {
      const historyWithCurrent: ChatMessage[] = [
        ...history,
        { role: 'user', parts: [{ text: userText || '[Image envoyée]' }] },
      ];
      llmResponseText = await fallbackToOpenAI(historyWithCurrent);
      console.log('✅ Réponse OpenAI fallback générée.');
    } catch (fallbackError) {
      console.error('❌ Erreur critique OpenAI:', fallbackError);
      llmResponseText = 'Désolé, le service est temporairement indisponible. Veuillez réessayer.';
    }
  }

  // Sauvegarde dans l'historique (texte uniquement, pas l'image)
  const savedUserText = isImage ? `[Photo envoyée] ${userText || ''}`.trim() : userText;
  history.push({ role: 'user', parts: [{ text: savedUserText }] });
  history.push({ role: 'model', parts: [{ text: llmResponseText }] });
  if (history.length > 10) history = history.slice(history.length - 10);
  await saveHistory(sender, history);

  // Génération audio si message entrant était audio
  let generatedAudioUrl: string | null = null;
  if (isAudio) {
    console.log('🔊 Génération TTS...');
    try {
      generatedAudioUrl = await generateSpeech(llmResponseText, baseUrl);
      console.log(`🔊 Audio généré : ${generatedAudioUrl}`);
    } catch (err) {
      console.error('❌ Erreur Azure TTS:', err);
    }
  }

  // Envoi via Twilio
  try {
    const messageOptions: { body: string; from: string | undefined; to: string; mediaUrl?: string[] } = {
      body: llmResponseText,
      from: process.env.WHATSAPP_PHONE_NUMBER,
      to: sender,
    };
    if (generatedAudioUrl) messageOptions.mediaUrl = [generatedAudioUrl];
    await twilioClient.messages.create(messageOptions);
    console.log(`📤 Message envoyé à ${sender}`);
  } catch (error) {
    console.error('❌ Erreur envoi Twilio:', error);
  }
}

// ============================================================================
const TWIML_EMPTY = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
const TWIML_HEADERS = { 'Content-Type': 'text/xml; charset=utf-8' };

// ✅ HANDLER GET — validation URL webhook par Twilio
export async function GET() {
  return new NextResponse(TWIML_EMPTY, { headers: TWIML_HEADERS });
}

// 📱 WEBHOOK WHATSAPP
export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // 🔐 Vérification de signature Twilio
    const authToken = process.env.TWILIO_AUTH_TOKEN || '';
    const signature = request.headers.get('x-twilio-signature') || '';
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
    const url = `${proto}://${host}/api/whatsapp-webhook`;

    const params: Record<string, string> = {};
    formData.forEach((value, key) => { params[key] = value.toString(); });

    const isValid = twilio.validateRequest(authToken, signature, url, params);
    if (!isValid) {
      console.warn('⚠️ Signature Twilio invalide — requête rejetée');
      return new NextResponse('Forbidden', { status: 403 });
    }

    const incomingText = (formData.get('Body') as string) || '';
    const mediaUrl = (formData.get('MediaUrl0') as string) || null;
    const mediaContentType = (formData.get('MediaContentType0') as string) || null;
    const sender = formData.get('From') as string;

    const mediaType = mediaContentType?.startsWith('audio/') ? '🎙️ Audio'
      : mediaContentType?.startsWith('image/') ? '🖼️ Image'
      : '📝 Texte';
    console.log(`📩 ${mediaType} de ${sender}`);

    const baseUrl = `${proto}://${host}`;

    processMessageInBackground(sender, incomingText, mediaUrl, mediaContentType, baseUrl).catch(console.error);

    return new NextResponse(TWIML_EMPTY, { headers: TWIML_HEADERS });
  } catch (error) {
    console.error('❌ Erreur Webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
