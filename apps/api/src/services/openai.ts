import OpenAI from 'openai';
import { config } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!config.openaiApiKey || config.openaiApiKey.trim() === '') {
    throw new AppError(
      'AI_NOT_CONFIGURED',
      'OpenAI API key is not configured on this server',
      503
    );
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return openaiClient;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(config.openaiApiKey && config.openaiApiKey.trim() !== '');
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  try {
    const response = await client.embeddings.create({
      model: config.openaiEmbeddingModel,
      input: text.replace(/\n+/g, ' '),
    });
    return response.data[0]?.embedding ?? [];
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    console.error('OpenAI embedding generation failed:', error);
    throw new AppError('EMBEDDING_FAILED', `Failed to generate vector embedding: ${error.message}`, 502);
  }
}

export interface ExtractedMemoryItem {
  content: string;
  kind: 'fact' | 'decision' | 'preference' | 'note' | 'rule' | 'general';
  importance: number;
  confidence: number;
}

export async function extractMemoriesFromTurn(
  userMessage: string,
  assistantReply: string
): Promise<ExtractedMemoryItem[]> {
  if (!isOpenAIConfigured()) {
    return [];
  }

  const client = getOpenAIClient();
  const prompt = `You are a memory extraction assistant. Analyze this conversation turn between a User and an Assistant.
Identify any durable, important information worth remembering for the future (such as user preferences, technical decisions, established rules, project facts, or instructions).
Only extract durable knowledge, not transient pleasantries or temporary questions.

User: ${userMessage}
Assistant: ${assistantReply}

Respond ONLY with a valid JSON array of objects. Each object must have:
- "content": concise statement of the extracted memory
- "kind": one of "fact", "decision", "preference", "note", "rule", "general"
- "importance": integer from 1 to 5 (5 is critical)
- "confidence": number from 0.1 to 1.0

If nothing durable is present, respond with an empty JSON array: []`;

  try {
    const response = await client.chat.completions.create({
      model: config.openaiChatModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content?.trim() || '{}';
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : (parsed.memories || parsed.items || []);
    return list.filter((item: any) => item && typeof item.content === 'string' && item.content.length > 0);
  } catch (error) {
    console.warn('Memory extraction encountered an error (continuing without error):', error);
    return [];
  }
}

export interface FusionResult {
  synthesis: string;
  citedSourceIds: string[];
  conflictGroups: Array<{
    topic?: string;
    memoryIds: string[];
    description: string;
  }>;
}

export async function synthesizeMemories(
  memories: Array<{ id: string; content: string; kind?: string }>,
  topic?: string
): Promise<FusionResult> {
  const client = getOpenAIClient();

  const memoryListing = memories
    .map((m) => `[ID: ${m.id}] (${m.kind || 'general'}) ${m.content}`)
    .join('\n');

  const prompt = `You are an AI synthesis engine analyzing a team's verified memories.
${topic ? `Focus Topic: "${topic}"\n` : ''}
Here are the memories:
${memoryListing}

Tasks:
1. Synthesize the core insights, agreements, and decisions into a clear, cohesive summary.
2. Track which memory IDs you actively use in the synthesis.
3. Identify any contradictory or conflicting statements among the memories. Group any opposing memories by topic and describe the nature of their disagreement.

Respond with a JSON object strictly following this structure:
{
  "synthesis": "Comprehensive synthesis text...",
  "citedSourceIds": ["id1", "id2"],
  "conflictGroups": [
    {
      "topic": "Conflicting topic title",
      "memoryIds": ["id1", "id2"],
      "description": "Explanation of the disagreement between these sources"
    }
  ]
}`;

  try {
    const response = await client.chat.completions.create({
      model: config.openaiChatModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
    return {
      synthesis: parsed.synthesis || 'No synthesis generated.',
      citedSourceIds: Array.isArray(parsed.citedSourceIds) ? parsed.citedSourceIds : [],
      conflictGroups: Array.isArray(parsed.conflictGroups) ? parsed.conflictGroups : [],
    };
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    console.error('Synthesis failed:', error);
    throw new AppError('SYNTHESIS_FAILED', `Memory synthesis failed: ${error.message}`, 502);
  }
}
