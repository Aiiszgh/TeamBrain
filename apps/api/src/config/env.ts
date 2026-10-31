import dotenv from 'dotenv';
dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:5173',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/teambrain',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_at_least_32_characters_long_for_security_testing',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  aiProvider: (process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : (process.env.OPENAI_API_KEY ? 'openai' : 'gemini'))) as 'gemini' | 'openai',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiChatModel: process.env.GEMINI_CHAT_MODEL || 'gemini-1.5-flash',
  geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiChatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
  openaiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  mongodbVectorIndex: process.env.MONGODB_VECTOR_INDEX || 'team_memory_vector',
};
