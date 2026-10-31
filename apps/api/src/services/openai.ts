import OpenAI from 'openai';
import { config } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

let openaiClient: OpenAI | null = null;
let geminiClient: OpenAI | null = null;

export function getActiveAIProvider(): 'gemini' | 'openai' {
  if (config.geminiApiKey && config.geminiApiKey.trim() !== '') {
    return 'gemini';
  }
  if (config.openaiApiKey && config.openaiApiKey.trim() !== '') {
    return 'openai';
  }
  return config.aiProvider || 'gemini';
}

export function getActiveChatModel(): string {
  const provider = getActiveAIProvider();
  return provider === 'gemini' ? (config.geminiChatModel || 'gemini-3.5-flash-lite') : (config.openaiChatModel || 'gpt-4o-mini');
}

export function getActiveEmbeddingModel(): string {
  const provider = getActiveAIProvider();
  return provider === 'gemini' ? (config.geminiEmbeddingModel || 'gemini-embedding-001') : (config.openaiEmbeddingModel || 'text-embedding-3-small');
}

export function getAIClient(): OpenAI {
  const provider = getActiveAIProvider();

  if (provider === 'gemini') {
    if (!config.geminiApiKey || config.geminiApiKey.trim() === '') {
      throw new AppError(
        'AI_NOT_CONFIGURED',
        'Google Gemini API key is not configured. Please set GEMINI_API_KEY in .env or the Settings panel.',
        503
      );
    }
    if (!geminiClient) {
      geminiClient = new OpenAI({
        apiKey: config.geminiApiKey.trim(),
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      });
    }
    return geminiClient;
  }

  // OpenAI fallback
  if (!config.openaiApiKey || config.openaiApiKey.trim() === '') {
    throw new AppError(
      'AI_NOT_CONFIGURED',
      'AI API key is not configured. Please set GEMINI_API_KEY or OPENAI_API_KEY in .env or Settings.',
      503
    );
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: config.openaiApiKey.trim() });
  }
  return openaiClient;
}

// Backward-compatible alias
export const getOpenAIClient = getAIClient;

export function isAIConfigured(): boolean {
  const provider = getActiveAIProvider();
  if (provider === 'gemini') {
    return Boolean(config.geminiApiKey && config.geminiApiKey.trim() !== '');
  }
  return Boolean(config.openaiApiKey && config.openaiApiKey.trim() !== '');
}

// Backward-compatible alias
export const isOpenAIConfigured = isAIConfigured;

export function setRuntimeAIKey(provider: 'gemini' | 'openai', apiKey: string, chatModel?: string) {
  if (provider === 'gemini') {
    config.geminiApiKey = apiKey.trim();
    if (chatModel) config.geminiChatModel = chatModel.trim();
    config.aiProvider = 'gemini';
    geminiClient = new OpenAI({
      apiKey: config.geminiApiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });
  } else {
    config.openaiApiKey = apiKey.trim();
    if (chatModel) config.openaiChatModel = chatModel.trim();
    config.aiProvider = 'openai';
    openaiClient = new OpenAI({ apiKey: config.openaiApiKey });
  }
}

export async function createChatCompletionWithFallback(options: {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  response_format?: { type: 'json_object' };
}): Promise<string> {
  const client = getAIClient();
  const provider = getActiveAIProvider();

  // Try configured model first, then known robust Gemini models if provider is Gemini
  const candidates =
    provider === 'gemini'
      ? [
          config.geminiChatModel || 'gemini-3.5-flash-lite',
          'gemini-3.5-flash-lite',
          'gemma-4-26b-a4b-it',
          'gemma-4-31b-it',
          'gemini-flash-latest',
        ]
      : [config.openaiChatModel || 'gpt-4o-mini', 'gpt-4o'];

  // Deduplicate
  const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));
  let lastError: any = null;

  for (const model of uniqueCandidates) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        ...(options.response_format ? { response_format: options.response_format } : {}),
      });

      const reply = response.choices[0]?.message?.content?.trim();
      if (reply) {
        return reply;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Model candidate '${model}' failed (${err.message}). Trying next candidate...`);
    }
  }

  throw lastError || new Error('All AI model candidates failed to respond.');
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getAIClient();
  const provider = getActiveAIProvider();

  const candidateModels =
    provider === 'gemini'
      ? [config.geminiEmbeddingModel || 'gemini-embedding-001', 'gemini-embedding-001', 'text-embedding-004']
      : [config.openaiEmbeddingModel || 'text-embedding-3-small'];

  const uniqueCandidates = Array.from(new Set(candidateModels.filter(Boolean)));
  let lastError: any = null;

  for (const model of uniqueCandidates) {
    try {
      const response = await client.embeddings.create({
        model,
        input: text.replace(/\n+/g, ' '),
      });
      const emb = response.data[0]?.embedding;
      if (emb && emb.length > 0) {
        return emb;
      }
    } catch (error: any) {
      lastError = error;
      console.warn(`Embedding candidate '${model}' failed (${error.message}). Trying next candidate...`);
    }
  }

  console.error(`${provider.toUpperCase()} embedding generation failed across all candidates:`, lastError);
  throw new AppError('EMBEDDING_FAILED', `Failed to generate vector embedding: ${lastError?.message || 'Unknown error'}`, 502);
}

function parseJSONFromCompletion(raw: string): any {
  if (!raw) return {};
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/(\{|\[)[\s\S]*(\}|\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Fallback
      }
    }
    return {};
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
  if (!isAIConfigured()) {
    return [];
  }

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
    const raw = await createChatCompletionWithFallback({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const parsed = parseJSONFromCompletion(raw);
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
    const raw = await createChatCompletionWithFallback({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const parsed = parseJSONFromCompletion(raw);
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
