import { Types } from 'mongoose';
import { Memory } from '../models/index.js';
import { config } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { MemoryScope } from '@teambrain/shared';

export interface VectorSearchParams {
  teamId: string;
  scope: MemoryScope;
  userId: string;
  projectId?: string;
  queryVector: number[];
  limit?: number;
}

export async function searchMemoriesVector({
  teamId,
  scope,
  userId,
  projectId,
  queryVector,
  limit = 10,
}: VectorSearchParams) {
  const now = new Date();

  // Construct Atlas Vector Search filter per specifications
  const filter: Record<string, any> = {
    status: scope === 'personal' ? 'personal' : 'shared',
    scope,
  };

  if (scope === 'personal') {
    filter.ownerId = new Types.ObjectId(userId);
  } else {
    filter.teamId = new Types.ObjectId(teamId);
    if (scope === 'project') {
      if (!projectId) {
        throw new AppError('MISSING_PROJECT_ID', 'Project ID is required for project scope search', 400);
      }
      filter.projectId = new Types.ObjectId(projectId);
    }
  }

  const pipeline = [
    {
      $vectorSearch: {
        index: config.mongodbVectorIndex,
        path: 'embedding',
        queryVector,
        numCandidates: Math.max(limit * 10, 100),
        limit,
        filter,
      },
    },
    {
      $match: {
        $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
      },
    },
    {
      $project: {
        id: '$_id',
        _id: 0,
        ownerId: 1,
        teamId: 1,
        projectId: 1,
        content: 1,
        kind: 1,
        scope: 1,
        status: 1,
        importance: 1,
        confidence: 1,
        stage: 1,
        sourceMessageId: 1,
        supersededBy: 1,
        supersedes: 1,
        duplicateOf: 1,
        relatedMemoryIds: 1,
        rejectionReason: 1,
        expiresAt: 1,
        createdAt: 1,
        updatedAt: 1,
        similarity: { $meta: 'vectorSearchScore' },
      },
    },
  ];

  try {
    const results = await Memory.aggregate(pipeline);
    return results;
  } catch (error: any) {
    console.error('Vector search query failed:', error);
    // Explicit spec requirement:
    // If it is missing or unavailable, semantic search and chat return VECTOR_SEARCH_UNAVAILABLE
    throw new AppError(
      'VECTOR_SEARCH_UNAVAILABLE',
      `Vector search index '${config.mongodbVectorIndex}' is unavailable or missing in MongoDB Atlas: ${error.message}`,
      503
    );
  }
}
