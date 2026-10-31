import { Router, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { config } from '../config/env.js';
import {
  getActiveAIProvider,
  getActiveChatModel,
  getActiveEmbeddingModel,
  isAIConfigured,
  setRuntimeAIKey,
  getAIClient,
} from '../services/openai.js';

const router = Router();

function maskKey(key: string): string {
  if (!key || key.length < 8) return '';
  return key.slice(0, 6) + '...' + key.slice(-4);
}

// GET /ai/config
router.get('/ai/config', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  const provider = getActiveAIProvider();
  const configured = isAIConfigured();
  const activeKey = provider === 'gemini' ? config.geminiApiKey : config.openaiApiKey;

  res.status(200).json({
    provider,
    isConfigured: configured,
    chatModel: getActiveChatModel(),
    embeddingModel: getActiveEmbeddingModel(),
    maskedKey: maskKey(activeKey),
    geminiConfigured: Boolean(config.geminiApiKey && config.geminiApiKey.trim() !== ''),
    openaiConfigured: Boolean(config.openaiApiKey && config.openaiApiKey.trim() !== ''),
  });
});

// POST /ai/config
router.post(
  '/ai/config',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { provider = 'gemini', apiKey, chatModel } = req.body;

      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        throw new AppError('VALIDATION_ERROR', 'API key is required', 400);
      }

      const trimmedKey = apiKey.trim();
      const targetProvider = provider === 'openai' ? 'openai' : 'gemini';

      // Temporarily set runtime key to test live connection
      const prevGeminiKey = config.geminiApiKey;
      const prevOpenaiKey = config.openaiApiKey;
      const prevProvider = config.aiProvider;

      setRuntimeAIKey(targetProvider, trimmedKey, chatModel);

      try {
        // Run test completion
        const client = getAIClient();
        const testModel = targetProvider === 'gemini' ? (chatModel || 'gemini-1.5-flash') : (chatModel || 'gpt-4o-mini');
        
        await client.chat.completions.create({
          model: testModel,
          messages: [{ role: 'user', content: 'Respond with "OK".' }],
          max_tokens: 5,
        });
      } catch (testErr: any) {
        // Revert on error
        config.geminiApiKey = prevGeminiKey;
        config.openaiApiKey = prevOpenaiKey;
        config.aiProvider = prevProvider;
        throw new AppError(
          'API_VALIDATION_FAILED',
          `Failed to authenticate with ${targetProvider.toUpperCase()}: ${testErr.message || 'Invalid API Key'}`,
          400
        );
      }

      // Live verification passed! Persist to root .env file if it exists
      try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf8');
          if (targetProvider === 'gemini') {
            if (envContent.includes('GEMINI_API_KEY=')) {
              envContent = envContent.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${trimmedKey}`);
            } else {
              envContent += `\nGEMINI_API_KEY=${trimmedKey}`;
            }
            if (envContent.includes('AI_PROVIDER=')) {
              envContent = envContent.replace(/AI_PROVIDER=.*/, `AI_PROVIDER=gemini`);
            } else {
              envContent += `\nAI_PROVIDER=gemini`;
            }
          } else {
            if (envContent.includes('OPENAI_API_KEY=')) {
              envContent = envContent.replace(/OPENAI_API_KEY=.*/, `OPENAI_API_KEY=${trimmedKey}`);
            } else {
              envContent += `\nOPENAI_API_KEY=${trimmedKey}`;
            }
          }
          fs.writeFileSync(envPath, envContent, 'utf8');
        }
      } catch (fileErr) {
        console.warn('Could not update .env file (runtime config remains updated):', fileErr);
      }

      res.status(200).json({
        success: true,
        message: `${targetProvider === 'gemini' ? 'Google Gemini' : 'OpenAI'} API key verified and activated successfully!`,
        provider: targetProvider,
        chatModel: getActiveChatModel(),
        embeddingModel: getActiveEmbeddingModel(),
        maskedKey: maskKey(trimmedKey),
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
