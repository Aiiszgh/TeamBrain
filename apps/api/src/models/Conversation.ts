import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IConversationDocument extends Document {
  userId: Types.ObjectId;
  teamId: Types.ObjectId;
  projectId?: Types.ObjectId;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    title: { type: String, default: 'New Conversation', trim: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        ret.userId = ret.userId?.toString();
        ret.teamId = ret.teamId?.toString();
        ret.projectId = ret.projectId?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

conversationSchema.index({ userId: 1, teamId: 1 });

export const Conversation = mongoose.model<IConversationDocument>(
  'Conversation',
  conversationSchema
);
