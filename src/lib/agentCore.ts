import { GoogleGenerativeAI, type Part } from '@google/generative-ai';
import OpenAI from 'openai';
import { getHistory, saveHistory, type ChatMessage } from './conversationStore';
import { retrieveContext } from './ragStore';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

export type ExpertConfig = {
  id: string;
  name: string;
  icon: string;
  description: string;
  systemInstruction: string;
};

export const EXPERTS: Record<string, ExpertConfig> = {
  agri: {
    id: 'agri',
    name: 'Mgoun AGRI',
    icon: '🌾',
    description: 'Expert en agriculture marocaine — traitements, engrais, irrigation, variétés locales, calendriers agricoles.',
    systemInstruction:
      "Tu es Mgoun AGRI, un assistant agricole expert pour les agriculteurs marocains. IMPORTANT : 1) Réponds TOUJOURS dans la même langue que l'utilisateur (français, arabe, darija, anglais). 2) Comporte-toi comme un vrai expert : si une question nécessite du contexte pour être précise (ex: type de sol, culture en bour ou irriguée, variété, région), pose d'abord ces questions à l'agriculteur au lieu de donner une réponse générique. 3) Ne donne PAS de longs détails superflus. Sois concis et va droit au but.",
  },
};

async function fallbackToOpenAI(systemInstruction: string, history: ChatMessage[]): Promise<string> {
  const openaiHistory: { role: string; content: string }[] = [
    { role: 'system', content: systemInstruction },
    ...history.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.parts[0].text,
    })),
  ];
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: openaiHistory as never,
    max_tokens: 800,
  });
  return response.choices[0].message.content || "Désolé, j'ai eu un problème. Veuillez réessayer.";
}

export async function runAgent(
  expert: ExpertConfig,
  sessionId: string,
  userText: string,
  imageData?: { mimeType: string; base64: string }
): Promise<string> {
  console.log(`🧠 [${expert.id}] Requête : "${userText.slice(0, 80)}"`);

  let history = await getHistory(sessionId);

  const ragContext = await retrieveContext(userText);
  if (ragContext) console.log('📖 Contexte RAG injecté.');
  const systemWithContext = ragContext
    ? `${expert.systemInstruction}\n\nCONTEXTE DE LA BASE DE CONNAISSANCES (utilise ces informations en priorité) :\n${ragContext}`
    : expert.systemInstruction;

  const currentParts: Part[] = [];
  if (userText) currentParts.push({ text: userText });
  if (imageData) {
    console.log('🖼️ Analyse image via Gemini Vision...');
    currentParts.push({ inlineData: { mimeType: imageData.mimeType, data: imageData.base64 } });
    if (!userText) currentParts.push({ text: 'Analyse cette image.' });
  }

  let llmResponseText = '';
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemWithContext,
    });
    const result = await model.generateContent({
      contents: [...history, { role: 'user' as const, parts: currentParts }],
      generationConfig: {
        maxOutputTokens: 2000,
        // @ts-ignore — thinkingConfig supported by gemini-2.5-flash, not yet in SDK types
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    llmResponseText = result.response.text();
    console.log(`✅ [${expert.id}] Réponse Gemini générée.`);
  } catch (error) {
    console.error(`❌ [${expert.id}] Erreur Gemini (fallback OpenAI):`, error);
    try {
      llmResponseText = await fallbackToOpenAI(expert.systemInstruction, [
        ...history,
        { role: 'user', parts: [{ text: userText || '[Image envoyée]' }] },
      ]);
      console.log(`✅ [${expert.id}] Réponse OpenAI fallback générée.`);
    } catch (fallbackError) {
      console.error(`❌ [${expert.id}] Erreur critique OpenAI:`, fallbackError);
      llmResponseText = 'Désolé, le service est temporairement indisponible. Veuillez réessayer.';
    }
  }

  const savedUserText = imageData ? `[Photo envoyée] ${userText || ''}`.trim() : userText;
  history.push({ role: 'user', parts: [{ text: savedUserText }] });
  history.push({ role: 'model', parts: [{ text: llmResponseText }] });
  if (history.length > 10) history = history.slice(history.length - 10);
  await saveHistory(sessionId, history);

  return llmResponseText;
}
