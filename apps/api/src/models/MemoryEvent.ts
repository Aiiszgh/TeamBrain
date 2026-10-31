import mongoose, { Document, Schema, Types } from 'mongoose';
import { MemoryEventType } from '@teambrain/shared';

export interface IMemoryEventDocument extends Document {
  memoryId: Types.ObjectId;
  actorId?: Types.ObjectId;
  eventType: MemoryEventType;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const memoryEventSchema = new Schema<IMemoryEventDocument>(
  {
    memoryId: { type: Schema.Types.ObjectId, ref: 'Memory', required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    eventType: {
      type: String,
      enum: [
        'created',
        'submitted',
        'approved',
        'rejected',
        'corrected',
        'superseded',
        'archived',
        'deleted',
        'expired',
      ],
      required: true,
      index: true,
    },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        ret.memoryId = ret.memoryId?.toString();
        if (ret.actorId && typeof ret.actorId === 'object' && ret.actorId.name) {
          ret.actor = {
            id: ret.actorId._id?.toString(),
            name: ret.actorId.name,
            email: ret.actorId.email,
          };
          ret.actorId = ret.actorId._id?.toString();
        } else {
          ret.actorId = ret.actorId?.toString();
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const MemoryEvent = mongoose.model<IMemoryEventDocument>(
  'MemoryEvent',
  memoryEventSchema
);
