import { Types } from 'mongoose';
import { Memory, MemoryEvent, IMemoryDocument } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateEmbedding, isOpenAIConfigured } from './openai.js';
import { MemoryEventType, MemoryScope } from '@teambrain/shared';
import { getSocketServer } from '../socket/socketHandler.js';

export async function logMemoryEvent(
  memoryId: Types.ObjectId | string,
  eventType: MemoryEventType,
  actorId?: Types.ObjectId | string,
  metadata?: Record<string, unknown>
) {
  try {
    await MemoryEvent.create({
      memoryId: new Types.ObjectId(memoryId),
      actorId: actorId ? new Types.ObjectId(actorId) : undefined,
      eventType,
      metadata,
    });
  } catch (error) {
    console.error('Failed to write memory audit event:', error);
  }
}

export async function approveMemory(
  memoryId: string,
  actorId: string
): Promise<IMemoryDocument> {
  const memory = await Memory.findById(memoryId);
  if (!memory) {
    throw new AppError('MEMORY_NOT_FOUND', 'Memory not found', 404);
  }

  if (memory.status !== 'pending') {
    throw new AppError(
      'INVALID_STATE_TRANSITION',
      `Cannot approve memory in status '${memory.status}' (must be 'pending')`,
      400
    );
  }

  // Generate vector embedding before publishing
  if (isOpenAIConfigured()) {
    try {
      const embedding = await generateEmbedding(memory.content);
      memory.embedding = embedding;
    } catch (err: any) {
      console.warn('Embedding generation warning during approval:', err.message);
    }
  }

  memory.status = 'shared';
  memory.rejectionReason = undefined;

  // Handle supersession lineage
  if (memory.supersedes) {
    const previous = await Memory.findById(memory.supersedes);
    if (previous && previous.status === 'shared') {
      previous.status = 'superseded';
      previous.supersededBy = memory._id as Types.ObjectId;
      await previous.save();
      await logMemoryEvent(previous._id, 'superseded', actorId, {
        supersededBy: memory._id.toString(),
      });
    }
  }

  // Detect near-duplicates among already shared memories in same scope
  try {
    const existingShared = await Memory.find({
      teamId: memory.teamId,
      scope: memory.scope,
      status: 'shared',
      _id: { $ne: memory._id },
    }).limit(20);

    for (const existing of existingShared) {
      if (
        existing.content.toLowerCase().trim() ===
        memory.content.toLowerCase().trim()
      ) {
        memory.duplicateOf = existing._id as Types.ObjectId;
        if (!memory.relatedMemoryIds.includes(existing._id as Types.ObjectId)) {
          memory.relatedMemoryIds.push(existing._id as Types.ObjectId);
        }
        if (!existing.relatedMemoryIds.includes(memory._id as Types.ObjectId)) {
          existing.relatedMemoryIds.push(memory._id as Types.ObjectId);
          await existing.save();
        }
        break;
      }
    }
  } catch (err) {
    console.warn('Duplicate detection check error:', err);
  }

  await memory.save();
  await logMemoryEvent(memory._id, 'approved', actorId);

  // Broadcast memory:shared over Socket.IO to authorized team/project room
  try {
    const io = getSocketServer();
    if (io) {
      const targetRoom =
        memory.scope === 'project' && memory.projectId
          ? `project:${memory.projectId.toString()}`
          : `team:${memory.teamId.toString()}`;
      io.to(targetRoom).emit('memory:shared', memory.toJSON());
    }
  } catch (err) {
    console.warn('Socket emit error on memory approval:', err);
  }

  return memory;
}

export async function rejectMemory(
  memoryId: string,
  actorId: string,
  reason?: string
): Promise<IMemoryDocument> {
  const memory = await Memory.findById(memoryId);
  if (!memory) {
    throw new AppError('MEMORY_NOT_FOUND', 'Memory not found', 404);
  }

  if (memory.status !== 'pending') {
    throw new AppError(
      'INVALID_STATE_TRANSITION',
      `Cannot reject memory in status '${memory.status}'`,
      400
    );
  }

  memory.status = 'rejected';
  memory.rejectionReason = reason || 'Rejected by moderator';
  await memory.save();

  await logMemoryEvent(memory._id, 'rejected', actorId, { reason });
  return memory;
}

export async function createCorrection(
  memoryId: string,
  actorId: string,
  newContent: string,
  importance?: number
): Promise<IMemoryDocument> {
  const original = await Memory.findById(memoryId);
  if (!original) {
    throw new AppError('MEMORY_NOT_FOUND', 'Original memory not found', 404);
  }

  const correction = new Memory({
    ownerId: new Types.ObjectId(actorId),
    teamId: original.teamId,
    projectId: original.projectId,
    content: newContent,
    kind: original.kind,
    scope: original.scope,
    status: 'pending', // enters review queue
    importance: importance ?? original.importance,
    confidence: original.confidence,
    supersedes: original._id,
  });

  await correction.save();
  await logMemoryEvent(correction._id, 'submitted', actorId, {
    correctionFor: original._id.toString(),
  });
  await logMemoryEvent(original._id, 'corrected', actorId, {
    correctionId: correction._id.toString(),
  });

  // Notify team room about new pending submission
  try {
    const io = getSocketServer();
    if (io) {
      const targetRoom =
        correction.scope === 'project' && correction.projectId
          ? `project:${correction.projectId.toString()}`
          : `team:${correction.teamId.toString()}`;
      io.to(targetRoom).emit('memory:pending', {
        memoryId: correction._id.toString(),
        scope: correction.scope,
        teamId: correction.teamId.toString(),
        projectId: correction.projectId?.toString(),
      });
    }
  } catch (err) {
    console.warn('Socket notification error on correction creation:', err);
  }

  return correction;
}
