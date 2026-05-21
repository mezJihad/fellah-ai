import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import twilio from 'twilio';
import Groq from 'groq-sdk';
import crypto from 'crypto';
import { audioStore } from '@/lib/audioStore';
import { getHistory, saveHistory, type ChatMessage } from '@/lib/conversationStore';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

const SYSTEM_INSTRUCTION = "Tu es Fellah AI, un assistant agricole expert pour les agriculteurs marocains. IMPORTANT : 1) Réponds TOUJOURS dans la même langue que l'utilisateur (français, arabe, darija). 2) Comporte-toi comme un vrai expert : si une question nécessite du contexte pour être précise (ex: type de sol, culture en bour ou irriguée, variété, région), pose d'abord ces questions à l'agriculteur au lieu de donner une réponse générique. 3) Ne donne PAS de longs détails superflus. Sois concis et va droit au but.";

// ============================================================================
// 🧠 FONCTION DE SECOURS (OPENAI)
// Utilisée si Gemini n'est pas disponible (Erreur 503, etc.)
// ============================================================================
async function fallbackToOpenAI(history: ChatMessage[]): Promise<string> {
  // Convertir l'historique Gemini vers le format OpenAI
  const openaiHistory: any[] = [
    { role: "system", content: SYSTEM_INSTRUCTION }
  ];

  for (const msg of history) {
    openaiHistory.push({
      role: msg.role === "model" ? "assistant" : "user",
      content: msg.parts[0].text
    });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: openaiHistory,
    max_tokens: 800,
  });

  return response.choices[0].message.content || "Désolé, j'ai eu un problème de connexion avec mon cerveau. Veuillez réessayer.";
}

// ============================================================================
// 🎙️ TRANSCRIPTION AUDIO (GROQ WHISPER)
// Télécharge l'audio depuis Twilio et le transcrit en texte
// ============================================================================
async function transcribeAudio(mediaUrl: string): Promise<string> {
  const authHeader = 'Basic ' + Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
  ).toString('base64');

  const response = await fetch(mediaUrl, {
    headers: { 'Authorization': authHeader }
  });

  if (!response.ok) {
    throw new Error(`Échec téléchargement audio Twilio: ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const audioFile = new File([audioBuffer], 'audio.ogg', { type: 'audio/ogg' });

  const { text } = await groq.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-large-v3-turbo',
    response_format: 'json',
  });

  return text;
}

// ============================================================================
// 🧹 NETTOYAGE MARKDOWN POUR TTS
// Retire les symboles markdown qui seraient lus à voix haute (*, #, -, etc.)
// ============================================================================
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]*)\*\*/g, '$1')          // **gras**
    .replace(/\*([^*]*)\*/g, '$1')              // *italique*
    .replace(/__([^_]*)__/g, '$1')              // __gras__
    .replace(/_([^_]*)_/g, '$1')               // _italique_
    .replace(/#{1,6}\s+/gm, '')                 // # titres
    .replace(/`{1,3}[^`]*`{1,3}/g, '')         // `code`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // [texte](url)
    .replace(/^[-•*]\s+/gm, '')                 // - listes
    .replace(/[\uD800-\uDFFF]./g, '')           // emojis (surrogate pairs)
    .replace(/\n{3,}/g, '\n')                   // lignes vides excessives
    .trim();
}

// ============================================================================
// 🔊 SYNTHÈSE VOCALE (AZURE TTS)
// Génère un fichier MP3 depuis le texte et retourne son URL publique
// ============================================================================
async function generateSpeech(text: string, baseUrl: string): Promise<string> {
  const cleanText = stripMarkdown(text);
  const azureKey = process.env.AZURE_SPEECH_KEY || '';
  const azureRegion = process.env.AZURE_SPEECH_REGION || 'francecentral';

  const ssml = `<speak version='1.0' xml:lang='ar-MA'>
    <voice name='ar-MA-JamalNeural'>
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

  if (!response.ok) {
    throw new Error(`Azure TTS: ${response.status} ${response.statusText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const id = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  audioStore.set(id, Buffer.from(audioBuffer));

  return `${baseUrl}/api/audio/${id}`;
}

// ============================================================================
// 📱 TRAITEMENT EN ARRIÈRE-PLAN
// Fonction asynchrone qui s'occupe de l'IA et de l'envoi du message via Twilio
// ============================================================================
async function processMessageInBackground(sender: string, messageOrMediaUrl: string, isIncomingAudio: boolean, baseUrl: string) {
  let transcription = messageOrMediaUrl;

  if (isIncomingAudio) {
    console.log('🎙️ Audio reçu, téléchargement et transcription via Groq Whisper...');
    try {
      transcription = await transcribeAudio(messageOrMediaUrl);
      console.log(`📝 Transcription Groq: "${transcription}"`);
    } catch (err) {
      console.error('❌ Erreur transcription Groq:', err);
      transcription = "[Désolé, impossible de transcrire votre message vocal. Veuillez réessayer ou écrire votre question en texte.]";
    }
  }
  let llmResponseText = "";
  
  console.log(`🧠 Envoi de la requête au LLM : "${transcription}"`);

  // Récupération de l'historique depuis Supabase
  let history = await getHistory(sender);
  
  // Ajouter le nouveau message
  history.push({ role: 'user', parts: [{ text: transcription }] });

  // Limiter l'historique aux 10 derniers messages pour éviter les requêtes trop lourdes
  if (history.length > 10) history = history.slice(history.length - 10);

  try {
    // Tentative avec le cerveau principal : Gemini (Maintenant la version Flash performante)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION
    });

    const result = await model.generateContent({
      contents: history,
      generationConfig: { maxOutputTokens: 800 }
    });
    
    llmResponseText = result.response.text();
    console.log('✅ Réponse Gemini générée en arrière-plan.');

  } catch (error) {
    console.error('❌ Erreur Gemini (Activation du Fallback vers OpenAI):', error);
    try {
      // Tentative avec le cerveau de secours : OpenAI
      llmResponseText = await fallbackToOpenAI(history);
      console.log('✅ Réponse de secours OpenAI générée en arrière-plan.');
    } catch (fallbackError) {
      console.error('❌ Erreur critique : OpenAI a également échoué', fallbackError);
      llmResponseText = "Désolé, nos cerveaux (Gemini et OpenAI) sont temporairement indisponibles. Veuillez réessayer dans un instant.";
    }
  }
  
  // Sauvegarder la réponse dans Supabase
  history.push({ role: 'model', parts: [{ text: llmResponseText }] });
  await saveHistory(sender, history);

  // 4. Déterminer le format de réponse (Texte ou Audio+Texte)
  let generatedAudioUrl: string | null = null;
  if (isIncomingAudio) {
    console.log('🔊 Génération de la réponse vocale avec Azure TTS...');
    try {
      generatedAudioUrl = await generateSpeech(llmResponseText, baseUrl);
      console.log(`🔊 Audio généré : ${generatedAudioUrl}`);
    } catch (err) {
      console.error('❌ Erreur Azure TTS (réponse texte uniquement):', err);
    }
  } else {
    console.log('📱 Entrée Texte détectée. Réponse en texte uniquement.');
  }

  // 5. Envoi proactif via l'API REST de Twilio
  try {
    const messageOptions: any = {
      body: llmResponseText,
      from: process.env.WHATSAPP_PHONE_NUMBER,
      to: sender
    };
    
    if (generatedAudioUrl) {
        messageOptions.mediaUrl = [generatedAudioUrl];
    }
    
    await twilioClient.messages.create(messageOptions);
    console.log(`📤 Message envoyé asynchrone à ${sender}`);
  } catch (error) {
    console.error('❌ Erreur Twilio lors de l\'envoi asynchrone:', error);
  }
}

// ============================================================================
// 📱 WEBHOOK WHATSAPP (Point d'entrée principal - Synchrone)
// ============================================================================
export async function POST(request: Request) {
  try {
    // 1. Lire les données envoyées par WhatsApp
    const formData = await request.formData();
    const incomingMsg = formData.get('Body') as string;
    const mediaUrl = formData.get('MediaUrl0') as string;
    const sender = formData.get('From') as string; // Ex: "whatsapp:+212600000000"

    console.log(`📩 Nouveau message de ${sender}:`, mediaUrl ? 'Audio detecté' : `Texte ("${incomingMsg}")`);

    const isIncomingAudio = !!mediaUrl;

    // Reconstruit l'URL publique depuis les headers ngrok (pour servir l'audio TTS)
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${proto}://${host}`;

    console.log(isIncomingAudio ? '🎙️ Message vocal détecté.' : '📝 Message texte reçu.');

    // 🚀 Lancement de la tâche en arrière-plan SANS attendre sa fin (pas de "await")
    processMessageInBackground(sender, isIncomingAudio ? mediaUrl : incomingMsg, isIncomingAudio, baseUrl).catch(console.error);

    // ⚡ RETOUR IMMÉDIAT À TWILIO (Évite le timeout de 15s)
    let twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
      </Response>
    `;

    return new NextResponse(twimlResponse, {
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    });

  } catch (error) {
    console.error('❌ Erreur Webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
