import { NextResponse } from 'next/server';
import twilio from 'twilio';
import Groq from 'groq-sdk';
import crypto from 'crypto';
import { audioStore } from '@/lib/audioStore';
import { getHistory } from '@/lib/conversationStore';
import { EXPERTS, runAgent } from '@/lib/agentCore';
import { checkAccess, incrementMessageCount } from '@/lib/subscriptionStore';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

const WELCOME_MESSAGE = `🌾 Bienvenue sur Mgoun AGRI !
أهلاً بك في Mgoun AGRI ! 🌿
Welcome to Mgoun AGRI!

Je suis votre expert IA en agriculture marocaine.
اسألني بالدارجة أو العربية أو الفرنسية أو الإنجليزية.
Ask me anything in Darija, Arabic, French or English.`;

const TTS_VOICES = {
  'ar-MA': { lang: 'ar-MA', name: 'ar-MA-MounaNeural' },
  'fr-FR': { lang: 'fr-FR', name: 'fr-FR-HenriNeural' },
  'en-US': { lang: 'en-US', name: 'en-US-GuyNeural' },
};

function detectLanguage(text: string): keyof typeof TTS_VOICES {
  if (/[؀-ۿ]/.test(text)) return 'ar-MA';
  if (/[àâäéèêëîïôùûüç]|\b(je|tu|il|nous|vous|ils|est|sont|avec|pour|sur|dans|par|les|des|une|qui|que|pas|plus|très|bien|mais)\b/i.test(text)) return 'fr-FR';
  return 'en-US';
}

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

async function downloadTwilioMedia(mediaUrl: string): Promise<Buffer> {
  const authHeader = 'Basic ' + Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
  ).toString('base64');
  const response = await fetch(mediaUrl, { headers: { Authorization: authHeader } });
  if (!response.ok) throw new Error(`Échec téléchargement Twilio media: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

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

async function processMessageInBackground(
  sender: string,         // normalized E.164 phone (+212...) — used for DB lookups
  twilioTo: string,       // original Twilio format (whatsapp:+212...) — used for sending
  incomingText: string,
  mediaUrl: string | null,
  mediaContentType: string | null,
  baseUrl: string
) {
  const isAudio = !!mediaUrl && !!mediaContentType?.startsWith('audio/');
  const isImage = !!mediaUrl && !!mediaContentType?.startsWith('image/');

  const history = await getHistory(sender, 'agri');
  if (history.length === 0) {
    try {
      await twilioClient.messages.create({
        body: WELCOME_MESSAGE,
        from: process.env.WHATSAPP_PHONE_NUMBER,
        to: twilioTo,
      });
      console.log(`👋 Message de bienvenue envoyé à ${sender}`);
    } catch (err) {
      console.error('❌ Erreur envoi bienvenue:', err);
    }
  }

  let userText = incomingText;
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

  let imageData: { mimeType: string; base64: string } | undefined;
  if (isImage && mediaUrl && mediaContentType) {
    const imageBuffer = await downloadTwilioMedia(mediaUrl);
    imageData = { mimeType: mediaContentType, base64: imageBuffer.toString('base64') };
  }

  // Vérification de l'abonnement avant tout traitement LLM
  const access = await checkAccess(sender);
  if (!access.allowed) {
    try {
      await twilioClient.messages.create({
        body: access.reason!,
        from: process.env.WHATSAPP_PHONE_NUMBER,
        to: twilioTo,
      });
    } catch (err) {
      console.error('❌ Erreur envoi message refus:', err);
    }
    return;
  }

  const expert = EXPERTS['agri'];
  const llmResponseText = await runAgent(expert, sender, userText, imageData);

  await incrementMessageCount(sender);

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

  try {
    const messageOptions: { body: string; from: string | undefined; to: string; mediaUrl?: string[] } = {
      body: llmResponseText,
      from: process.env.WHATSAPP_PHONE_NUMBER,
      to: twilioTo,
    };
    if (generatedAudioUrl) messageOptions.mediaUrl = [generatedAudioUrl];
    await twilioClient.messages.create(messageOptions);
    console.log(`📤 Message envoyé à ${twilioTo}`);
  } catch (error) {
    console.error('❌ Erreur envoi Twilio:', error);
  }
}

// ============================================================================
const TWIML_EMPTY = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
const TWIML_HEADERS = { 'Content-Type': 'text/xml; charset=utf-8' };

export async function GET() {
  return new NextResponse(TWIML_EMPTY, { headers: TWIML_HEADERS });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

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
    const rawSender = formData.get('From') as string;
    // Normalize: strip "whatsapp:" prefix so we store E.164 (+212...) in DB
    const sender = rawSender.replace('whatsapp:', '');

    const mediaType = mediaContentType?.startsWith('audio/') ? '🎙️ Audio'
      : mediaContentType?.startsWith('image/') ? '🖼️ Image'
      : '📝 Texte';
    console.log(`📩 ${mediaType} de ${rawSender}`);

    processMessageInBackground(sender, rawSender, incomingText, mediaUrl, mediaContentType, `${proto}://${host}`).catch(console.error);

    return new NextResponse(TWIML_EMPTY, { headers: TWIML_HEADERS });
  } catch (error) {
    console.error('❌ Erreur Webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
