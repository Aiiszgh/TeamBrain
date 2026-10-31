import { Router, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import {
  Conversation,
  Message,
  Memory,
  Fusion,
  TeamMembership,
} from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import {
  getOpenAIClient,
  extractMemoriesFromTurn,
  generateEmbedding,
  isOpenAIConfigured,
} from '../services/openai.js';
import { config } from '../config/env.js';
import { logMemoryEvent } from '../services/memoryService.js';

const router = Router();

// GET /conversations?teamId=...
router.get(
  '/conversations',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const teamId = (req.query.teamId as string) || req.body?.teamId;
      if (!teamId) {
        throw new AppError('MISSING_TEAM_ID', 'Team ID query parameter is required', 400);
      }

      const membership = await TeamMembership.findOne({
        teamId,
        userId: req.user!._id,
      });
      if (!membership) {
        throw new AppError('FORBIDDEN', 'Not a member of this team', 403);
      }

      const conversations = await Conversation.find({
        teamId,
        userId: req.user!._id,
      }).sort({ updatedAt: -1 });

      res.status(200).json(conversations.map((c) => c.toJSON()));
    } catch (error) {
      next(error);
    }
  }
);

// POST /conversations
router.post(
  '/conversations',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { teamId, projectId, title } = req.body;
      if (!teamId) {
        throw new AppError('VALIDATION_ERROR', 'Team ID is required', 400);
      }

      const membership = await TeamMembership.findOne({
        teamId,
        userId: req.user!._id,
      });
      if (!membership) {
        throw new AppError('FORBIDDEN', 'Not a member of this team', 403);
      }

      const conversation = new Conversation({
        userId: req.user!._id,
        teamId: new Types.ObjectId(teamId),
        projectId: projectId ? new Types.ObjectId(projectId) : undefined,
        title: (title && typeof title === 'string' && title.trim()) || 'New Conversation',
      });
      await conversation.save();

      res.status(201).json(conversation.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

// GET /conversations/:id/messages
router.get(
  '/conversations/:id/messages',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const conversation = await Conversation.findById(id);
      if (!conversation) {
        throw new AppError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404);
      }

      // Check ownership
      if (conversation.userId.toString() !== req.user!._id.toString()) {
        throw new AppError('FORBIDDEN', 'Access denied to this conversation', 403);
      }

      const messages = await Message.find({ conversationId: id }).sort({ createdAt: 1 });
      res.status(200).json(messages.map((m) => m.toJSON()));
    } catch (error) {
      next(error);
    }
  }
);

// POST /conversations/:id/messages
router.post(
  '/conversations/:id/messages',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { content } = req.body;

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new AppError('VALIDATION_ERROR', 'Message content is required', 400);
      }

      const conversation = await Conversation.findById(id);
      if (!conversation) {
        throw new AppError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404);
      }

      if (conversation.userId.toString() !== req.user!._id.toString()) {
        throw new AppError('FORBIDDEN', 'Access denied to this conversation', 403);
      }

      // Ensure user is still a team member
      const membership = await TeamMembership.findOne({
        teamId: conversation.teamId,
        userId: req.user!._id,
      });
      if (!membership) {
        throw new AppError('FORBIDDEN', 'You are no longer a member of this team', 403);
      }

      // Gather memory context for RAG
      const now = new Date();
      const memoryConditions: any[] = [
        // Personal memories
        {
          ownerId: req.user!._id,
          scope: 'personal',
          status: 'personal',
        },
        // Team shared memories
        {
          teamId: conversation.teamId,
          scope: 'team',
          status: 'shared',
        },
      ];

      // If project-scoped conversation, also include project shared memories
      if (conversation.projectId) {
        memoryConditions.push({
          projectId: conversation.projectId,
          scope: 'project',
          status: 'shared',
        });
      }

      const availableMemories = await Memory.find({
        $or: memoryConditions,
        $and: [
          {
            $or: [
              { expiresAt: { $exists: false } },
              { expiresAt: null },
              { expiresAt: { $gt: now } },
            ],
          },
        ],
      }).limit(20);

      let contextText = '';
      if (availableMemories.length > 0) {
        contextText =
          'Verified Memories and Context:\n' +
          availableMemories
            .map((m) => `[Memory ID: ${m._id.toString()}] (${m.scope}) ${m.content}`)
            .join('\n') +
          '\n\n';
      }

      // If project conversation, also add confirmed fusions
      if (conversation.projectId) {
        const confirmedFusions = await Fusion.find({
          projectId: conversation.projectId,
          status: 'confirmed',
        }).limit(5);

        if (confirmedFusions.length > 0) {
          contextText +=
            'Confirmed Project Fusions:\n' +
            confirmedFusions
              .map((f) => `[Fusion ID: ${f._id.toString()}] ${f.synthesis}`)
              .join('\n') +
            '\n\n';
        }
      }

      // Fetch previous turns for conversational continuity
      const history = await Message.find({ conversationId: id })
        .sort({ createdAt: -1 })
        .limit(10);
      history.reverse();

      const chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        {
          role: 'system',
          content: `You are TeamBrain, an intelligent collaborative knowledge assistant.
${contextText}
When you use facts from the provided memories or fusions, reference them accurately.
Provide direct, helpful, and concise responses.`,
        },
      ];

      for (const h of history) {
        chatMessages.push({
          role: h.role,
          content: h.content,
        });
      }

      chatMessages.push({
        role: 'user',
        content: content.trim(),
      });

      // Call OpenAI FIRST before persisting any turns (atomic requirement)
      let assistantReply = '';
      const client = getOpenAIClient();

      try {
        const completion = await client.chat.completions.create({
          model: config.openaiChatModel,
          messages: chatMessages,
          temperature: 0.7,
        });
        assistantReply =
          completion.choices[0]?.message?.content?.trim() || 'I could not generate a response.';
      } catch (aiError: any) {
        console.error('Chat AI call failed:', aiError);
        throw new AppError(
          'AI_PROVIDER_ERROR',
          `AI provider failed: ${aiError.message || 'Unknown error'}`,
          502
        );
      }

      // Detect which memory/fusion sources were cited in the context
      const citedSources: string[] = [];
      for (const m of availableMemories) {
        const idStr = m._id.toString();
        if (assistantReply.includes(idStr) || contextText.includes(idStr)) {
          citedSources.push(idStr);
        }
      }
      if (conversation.projectId) {
        const confirmedFusions = await Fusion.find({
          projectId: conversation.projectId,
          status: 'confirmed',
        }).limit(5);
        for (const f of confirmedFusions) {
          const idStr = f._id.toString();
          if (assistantReply.includes(idStr) || contextText.includes(idStr)) {
            citedSources.push(idStr);
          }
        }
      }

      // Persist user turn
      const userMessage = new Message({
        conversationId: conversation._id,
        role: 'user',
        content: content.trim(),
      });
      await userMessage.save();

      // Persist assistant turn
      const assistantMessage = new Message({
        conversationId: conversation._id,
        role: 'assistant',
        content: assistantReply,
        sources: citedSources,
      });
      await assistantMessage.save();

      // Update conversation title if first message
      if (history.length === 0) {
        conversation.title =
          content.trim().slice(0, 30) + (content.trim().length > 30 ? '...' : '');
      }
      conversation.updatedAt = new Date();
      await conversation.save();

      // Background extraction of durable memories
      const extractedMemories: any[] = [];
      try {
        const extracted = await extractMemoriesFromTurn(content.trim(), assistantReply);
        for (const item of extracted) {
          let embedding: number[] = [];
          if (isOpenAIConfigured()) {
            try {
              embedding = await generateEmbedding(item.content);
            } catch (embErr) {
              console.warn('Embedding generation warning during extraction:', embErr);
            }
          }

          const mem = new Memory({
            ownerId: req.user!._id,
            teamId: conversation.teamId,
            projectId: conversation.projectId,
            content: item.content,
            kind: item.kind,
            scope: 'personal',
            status: 'personal',
            importance: item.importance,
            confidence: item.confidence,
            sourceMessageId: assistantMessage._id,
            embedding,
          });
          await mem.save();
          await logMemoryEvent(mem._id, 'created', req.user!._id, {
            extractedFromConversation: conversation._id.toString(),
          });
          extractedMemories.push(mem.toJSON());
        }
      } catch (extErr) {
        console.warn('Memory auto-extraction background error:', extErr);
      }

      res.status(201).json({
        userMessage: userMessage.toJSON(),
        assistantMessage: assistantMessage.toJSON(),
        extractedMemories,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
