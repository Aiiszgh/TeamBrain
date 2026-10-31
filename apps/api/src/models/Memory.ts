import mongoose, { Document, Schema, Types } from 'mongoose';
import { MemoryKind, MemoryScope, MemoryStatus } from '@teambrain/shared';

export interface IMemoryDocument extends Document {
  ownerId: Types.ObjectId;
  teamId: Types.ObjectId;
  projectId?: Types.ObjectId;
  content: string;
  kind: MemoryKind;
  scope: MemoryScope;
  status: MemoryStatus;
  importance?: number;
  confidence?: number;
  stage?: string;
  sourceMessageId?: Types.ObjectId;
  supersededBy?: Types.ObjectId;
  supersedes?: Types.ObjectId;
  duplicateOf?: Types.ObjectId;
  relatedMemoryIds: Types.ObjectId[];
  rejectionReason?: string;
  expiresAt?: Date;
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}

const memorySchema = new Schema<IMemoryDocument>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    content: { type: String, required: true },
    kind: {
      type: String,
      enum: ['fact', 'decision', 'preference', 'note', 'rule', 'general'],
      default: 'general',
    },
    scope: {
      type: String,
      enum: ['personal', 'team', 'project'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['personal', 'pending', 'shared', 'rejected', 'archived', 'superseded'],
      required: true,
      index: true,
    },
    importance: { type: Number, default: 3 },
    confidence: { type: Number, default: 1 },
    stage: { type: String },
    sourceMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    supersededBy: { type: Schema.Types.ObjectId, ref: 'Memory' },
    supersedes: { type: Schema.Types.ObjectId, ref: 'Memory' },
    duplicateOf: { type: Schema.Types.ObjectId, ref: 'Memory' },
    relatedMemoryIds: [{ type: Schema.Types.ObjectId, ref: 'Memory' }],
    rejectionReason: { type: String },
    expiresAt: { type: Date },
    embedding: { type: [Number], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        ret.ownerId = ret.ownerId?.toString();
        ret.teamId = ret.teamId?.toString();
        ret.projectId = ret.projectId?.toString();
        ret.sourceMessageId = ret.sourceMessageId?.toString();
        ret.supersededBy = ret.supersededBy?.toString();
        ret.supersedes = ret.supersedes?.toString();
        ret.duplicateOf = ret.duplicateOf?.toString();
        if (Array.isArray(ret.relatedMemoryIds)) {
          ret.relatedMemoryIds = ret.relatedMemoryIds.map((id: any) => id.toString());
        }
        delete ret.embedding;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// TTL index on expiresAt (auto-removes expired memories)
memorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for common lookups
memorySchema.index({ ownerId: 1, scope: 1, status: 1 });
memorySchema.index({ teamId: 1, scope: 1, status: 1 });
memorySchema.index({ teamId: 1, projectId: 1, scope: 1, status: 1 });

export const Memory = mongoose.model<IMemoryDocument>('Memory', memorySchema);
