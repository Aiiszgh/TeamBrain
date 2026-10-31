import { Server as SocketIOServer } from 'socket.io';
import { Memory } from '../models/index.js';

let changeStream: any = null;

export function initMemoryChangeStream(io: SocketIOServer): void {
  try {
    // MongoDB Change Stream watching the 'memories' collection
    changeStream = Memory.watch([], { fullDocument: 'updateLookup' });

    changeStream.on('change', (change: any) => {
      try {
        const opType = change.operationType;

        if (opType === 'insert' || opType === 'update' || opType === 'replace') {
          const doc = change.fullDocument;
          if (!doc) return;

          const teamId = doc.teamId?.toString();
          const projectId = doc.projectId?.toString();
          const scope = doc.scope;
          const status = doc.status;

          // Target room based on scope
          const targetRoom =
            scope === 'project' && projectId ? `project:${projectId}` : `team:${teamId}`;

          if (status === 'pending') {
            io.to(targetRoom).emit('memory:pending', {
              memoryId: doc._id.toString(),
              scope,
              teamId,
              projectId,
              source: 'mongodb-change-stream',
            });
          } else if (status === 'shared') {
            io.to(targetRoom).emit('memory:shared', {
              id: doc._id.toString(),
              ownerId: doc.ownerId?.toString(),
              teamId,
              projectId,
              content: doc.content,
              kind: doc.kind,
              scope: doc.scope,
              status: doc.status,
              importance: doc.importance,
              confidence: doc.confidence,
              stage: doc.stage,
              supersededBy: doc.supersededBy?.toString(),
              supersedes: doc.supersedes?.toString(),
              duplicateOf: doc.duplicateOf?.toString(),
              relatedMemoryIds: Array.isArray(doc.relatedMemoryIds)
                ? doc.relatedMemoryIds.map((id: any) => id.toString())
                : [],
              createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(),
              updatedAt: doc.updatedAt?.toISOString?.() || new Date().toISOString(),
              source: 'mongodb-change-stream',
            });
          }
        }
      } catch (err) {
        console.warn('Error processing MongoDB change stream event:', err);
      }
    });

    changeStream.on('error', (err: any) => {
      // Standalone mongod instances without replica sets do not support change streams
      if (err?.message?.includes('replica set') || err?.code === 40573) {
        console.log(
          'MongoDB Change Streams notice: Requires a replica set (Atlas supports this out of the box). Falling back to application-level Socket.IO broadcast.'
        );
      } else {
        console.warn('MongoDB Change Stream error:', err.message);
      }
    });

    console.log('MongoDB Change Stream initialized on memories collection');
  } catch (err: any) {
    console.log(
      'MongoDB Change Stream notice: Change streams require a replica set or Atlas cluster. Continuing with application-level Socket.IO events.'
    );
  }
}

export function closeMemoryChangeStream(): void {
  if (changeStream) {
    try {
      changeStream.close();
      changeStream = null;
    } catch {}
  }
}
