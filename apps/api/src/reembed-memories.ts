import mongoose from 'mongoose';
import { config } from './config/env.js';
import { Memory } from './models/index.js';
import { generateEmbedding, isOpenAIConfigured } from './services/openai.js';

async function main() {
  console.log('--- TeamBrain Memory Re-embedding Tool ---');
  console.log(`Connecting to database at ${config.mongodbUri}...`);
  await mongoose.connect(config.mongodbUri);

  if (!isOpenAIConfigured()) {
    console.error('ERROR: OPENAI_API_KEY is not configured. Cannot generate embeddings.');
    process.exit(1);
  }

  console.log(`Using embedding model: ${config.openaiEmbeddingModel}`);

  // Fetch all personal and shared memories
  const memories = await Memory.find({
    status: { $in: ['personal', 'shared'] },
  });

  console.log(`Found ${memories.length} personal/shared memories to re-embed.`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < memories.length; i++) {
    const mem = memories[i];
    if (!mem) continue;
    try {
      console.log(`[${i + 1}/${memories.length}] Embedding memory ${mem._id}...`);
      const embedding = await generateEmbedding(mem.content);
      mem.embedding = embedding;
      await mem.save();
      updated++;
    } catch (err: any) {
      console.error(`Failed to embed memory ${mem._id}:`, err.message);
      failed++;
    }
  }

  console.log(`Finished: ${updated} memories updated successfully, ${failed} failed.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error in re-embedding script:', err);
  process.exit(1);
});
