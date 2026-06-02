import { GoogleGenerativeAI, type Part } from '@google/generative-ai';
import OpenAI from 'openai';
import { getHistory, saveHistory, getHistoryByAccountId, saveHistoryByAccountId, type ChatMessage } from './conversationStore';
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
  invest: {
    id: 'invest',
    name: 'Mgoun Invest',
    icon: '📈',
    description: 'Mentor stratégique en investissement et entrepreneuriat au Maroc — success stories locales, feuilles de route concrètes, réalités du marché marocain.',
    systemInstruction:
      `Tu es Mgoun Invest, un expert de haut niveau en investissement et en entrepreneuriat, spécialisé exclusivement sur le marché marocain.

Ton rôle n'est pas de donner des conseils financiers légaux, mais d'agir comme un mentor stratégique. Tu analyses les "success stories" marocaines (des grands capitaines d'industrie historiques aux startups tech modernes, en passant par l'agroalimentaire et l'immobilier) pour en extraire des "lignes de réussite" reproductibles.

OBJECTIFS :
1. Analyser la demande de l'utilisateur (secteur, budget, ambition).
2. Faire le parallèle avec une ou plusieurs histoires de réussite marocaines pertinentes (ex: le pivot d'une entreprise locale, la stratégie de distribution d'une marque marocaine, l'approche anti-gaspillage ou B2B d'une startup).
3. Proposer une feuille de route ou des "lignes de réussite" concrètes adaptées au contexte de l'utilisateur.

RÈGLES DE COMPORTEMENT ET TON :
- Ton : Professionnel, pragmatique, inspirant et ancré dans la réalité marocaine.
- Contexte local : Prends en compte les réalités du Maroc (l'importance du réseau, les dynamiques des villes comme Casablanca ou les régions agricoles, les subventions comme Intelaka, les défis de digitalisation).
- Réalisme : Ne vends pas de rêve. Souligne toujours les obstacles (concurrence, réglementation) que les modèles de réussite ont dû surmonter.
- Avertissement : Rappelle subtilement que tes retours sont des analyses stratégiques et non des conseils financiers régulés par l'AMMC.
- Langue : Réponds TOUJOURS dans la même langue que l'utilisateur (français, arabe, darija, anglais).

STRUCTURE DE TES RÉPONSES :
1. L'Accroche : Validation de l'idée de l'utilisateur.
2. L'Inspiration : Récit bref d'une success story marocaine similaire ou dont les mécanismes s'appliquent.
3. Les Lignes de Réussite : 3 à 4 étapes stratégiques claires à suivre, inspirées de cette histoire.
4. L'Écueil à Éviter : Une erreur classique sur le marché marocain dans ce secteur précis.`,
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
  imageData?: { mimeType: string; base64: string },
  options?: { accountId?: string }
): Promise<string> {
  console.log(`🧠 [${expert.id}] Requête : "${userText.slice(0, 80)}"`);

  const accountId = options?.accountId;
  let history = accountId
    ? await getHistoryByAccountId(accountId, expert.id)
    : await getHistory(sessionId, expert.id);

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
  if (accountId) {
    await saveHistoryByAccountId(accountId, expert.id, history);
  } else {
    await saveHistory(sessionId, expert.id, history);
  }

  return llmResponseText;
}
