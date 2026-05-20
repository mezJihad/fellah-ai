import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import twilio from 'twilio';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Stockage en mémoire de l'historique des conversations (Détruit au redémarrage du serveur)
type ChatMessage = { role: "user" | "model", parts: { text: string }[] };
const conversationHistory = new Map<string, ChatMessage[]>();

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
// 📱 TRAITEMENT EN ARRIÈRE-PLAN
// Fonction asynchrone qui s'occupe de l'IA et de l'envoi du message via Twilio
// ============================================================================
async function processMessageInBackground(sender: string, transcription: string, isIncomingAudio: boolean) {
  let llmResponseText = "";
  
  console.log(`🧠 Envoi de la requête au LLM : "${transcription}"`);

  // Récupération de l'historique ou création d'un nouveau
  let history = conversationHistory.get(sender) || [];
  
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
  
  // Sauvegarder la réponse dans l'historique
  history.push({ role: 'model', parts: [{ text: llmResponseText }] });
  conversationHistory.set(sender, history);

  // 4. Déterminer le format de réponse (Texte ou Audio+Texte)
  let generatedAudioUrl = null;
  if (isIncomingAudio) {
    console.log('🔊 Entrée Audio détectée. Génération de la réponse vocale avec Azure AI...');
    generatedAudioUrl = "https://example.com/audio/response.mp3";
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

    let transcription = incomingMsg;
    let isIncomingAudio = !!mediaUrl;

    // 2. Traitement Audio
    if (isIncomingAudio) {
      console.log('🎙️ Audio reçu, téléchargement et transcription via Groq...');
      transcription = "Simulation: [Audio transcrit en Darija via Groq Whisper]";
    } else {
      console.log('📝 Message texte reçu.');
    }

    // 🚀 Lancement de la tâche en arrière-plan SANS attendre sa fin (pas de "await")
    processMessageInBackground(sender, transcription, isIncomingAudio).catch(console.error);

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
