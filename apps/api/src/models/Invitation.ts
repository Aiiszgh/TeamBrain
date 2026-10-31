import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IInvitationDocument extends Document {
  teamId: Types.ObjectId;
  codeHash: string;
  role: 'admin' | 'member';
  maxUses: number;
  usedCount: number;
  expiresAt: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<IInvitationDocument>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    codeHash: { type: String, required: true, index: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    maxUses: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        ret.teamId = ret.teamId?.toString();
        delete ret.codeHash;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// TTL index on expiresAt
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Invitation = mongoose.model<IInvitationDocument>('Invitation', invitationSchema);
