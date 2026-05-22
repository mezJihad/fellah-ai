import { supabase } from './supabase';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function retrieveContext(question: string, matchCount = 4): Promise<string> {
  try {
    const result = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: question,
      dimensions: 768,
    });
    const embedding = result.data[0].embedding;

    const { data, error } = await supabase.rpc('match_knowledge_chunks', {
      query_embedding: embedding,
      match_count: matchCount,
      similarity_threshold: 0.65,
    });

    if (error || !data || data.length === 0) return '';

    const context = (data as { content: string; culture: string; category: string }[])
      .map(chunk => `[${chunk.culture} — ${chunk.category}]\n${chunk.content}`)
      .join('\n\n---\n\n');

    return context;
  } catch (err) {
    console.error('❌ Erreur RAG retrieval:', err);
    return '';
  }
}
