import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMessageDocument extends Document {
  conversationId: Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  sources: string[];
  memoryEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessageDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    sources: [{ type: String }],
    memoryEnabled: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        ret.conversationId = ret.conversationId?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Message = mongoose.model<IMessageDocument>('Message', messageSchema);
