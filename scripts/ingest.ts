import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type Chunk = {
  content: string;
  source: string;
  category: string;
  culture: string;
  region: string | null;
};

async function embedChunk(text: string): Promise<number[]> {
  const result = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 768,
  });
  return result.data[0].embedding;
}

async function ingest(category: string) {
  const filePath = join(process.cwd(), 'data', `${category}.json`);
  const chunks: Chunk[] = JSON.parse(readFileSync(filePath, 'utf-8'));

  console.log(`\n📚 Ingestion de ${chunks.length} chunks — catégorie: ${category}\n`);

  let success = 0;
  let errors = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const preview = chunk.content.slice(0, 60).replace(/\n/g, ' ');
    process.stdout.write(`[${i + 1}/${chunks.length}] ${preview}...`);

    try {
      const embedding = await embedChunk(chunk.content);

      const { error } = await supabase.from('knowledge_chunks').insert({
        content: chunk.content,
        source: chunk.source,
        category: chunk.category,
        culture: chunk.culture,
        region: chunk.region,
        embedding,
      });

      if (error) throw error;
      console.log(' ✅');
      success++;
    } catch (err) {
      console.log(' ❌', (err as Error).message);
      errors++;
    }

    // Pause pour éviter le rate limiting Gemini
    if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✅ Terminé — ${success} succès, ${errors} erreurs\n`);
}

const category = process.argv[2];
if (!category) {
  console.error('Usage: npx tsx scripts/ingest.ts <category>');
  console.error('Exemple: npx tsx scripts/ingest.ts maladies');
  process.exit(1);
}

ingest(category).catch(console.error);
