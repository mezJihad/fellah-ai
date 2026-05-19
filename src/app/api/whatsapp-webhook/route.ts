import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ============================================================================
// 📱 WEBHOOK WHATSAPP (Point d'entrée principal)
// Ce fichier gère les requêtes entrantes de WhatsApp (ex: via Twilio ou Meta API)
// ============================================================================

export async function POST(request: Request) {
  try {
    // 1. Lire les données envoyées par WhatsApp (Formulaire ou JSON selon le provider)
    const formData = await request.formData();
    const incomingMsg = formData.get('Body') as string;
    const mediaUrl = formData.get('MediaUrl0') as string;
    const sender = formData.get('From') as string; // Ex: "whatsapp:+212600000000"

    console.log(`📩 Nouveau message de ${sender}:`, mediaUrl ? 'Audio detecté' : `Texte ("${incomingMsg}")`);

    let transcription = incomingMsg;
    let isIncomingAudio = false;

    // 2. Traitement selon le type de message (Audio ou Texte)
    if (mediaUrl) {
      isIncomingAudio = true;
      console.log('🎙️ Audio reçu, téléchargement et transcription via Groq...');
      // 📝 TODO: 
      // - Télécharger l'audio depuis mediaUrl
      // - Envoyer à Groq API: fetch('https://api.groq.com/openai/v1/audio/transcriptions', ...)
      transcription = "Simulation: [Audio transcrit en Darija via Groq Whisper]";
    } else {
      // C'est un message texte, on le garde tel quel
      console.log('📝 Message texte reçu.');
    }

    // 3. Appel au "Cerveau" : LLM (Gemini) + Base de données RAG
    console.log(`🧠 Envoi de la requête au LLM : "${transcription}"`);
    
    let llmResponseText = "";
    try {
      // Configuration du modèle avec un prompt système pour lui donner son rôle
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: "Tu es Fellah AI, un assistant agricole expert pour les agriculteurs marocains. Tu réponds aux questions de manière simple, directe et bienveillante, de préférence en Darija marocaine (en caractères latins ou arabes selon la question). Tes conseils doivent respecter les bonnes pratiques agricoles."
      });

      const result = await model.generateContent(transcription);
      llmResponseText = result.response.text();
      console.log('✅ Réponse Gemini générée.');
    } catch (error) {
      console.error('❌ Erreur Gemini:', error);
      llmResponseText = "Désolé, j'ai eu un problème de connexion avec mon cerveau. Veuillez réessayer.";
    }

    // 4. Déterminer le format de réponse (Texte ou Audio+Texte)
    // Règle métier : Si l'utilisateur a envoyé un audio, on lui répond par Audio + Texte.
    let generatedAudioUrl = null;

    if (isIncomingAudio) {
      console.log('🔊 Entrée Audio détectée. Génération de la réponse vocale avec Azure AI...');
      // 📝 TODO:
      // - Appeler l'API Microsoft Azure Cognitive Services Speech avec `llmResponseText`
      // - Enregistrer le fichier audio généré sur un stockage (S3, Vercel Blob, etc.)
      generatedAudioUrl = "https://example.com/audio/response.mp3";
    } else {
      console.log('📱 Entrée Texte détectée. Réponse en texte uniquement.');
    }

    // 5. Renvoyer la réponse à WhatsApp (via Twilio TwiML)
    // Twilio permet d'envoyer un message texte, et optionnellement un média (audio)
    let twimlResponse = `
      <Response>
        <Message>
          <Body>${llmResponseText}</Body>
          ${generatedAudioUrl ? `<Media>${generatedAudioUrl}</Media>` : ''}
        </Message>
      </Response>
    `;

    return new NextResponse(twimlResponse, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('❌ Erreur Webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
