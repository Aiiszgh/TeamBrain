import mongoose, { Document, Schema, Types } from 'mongoose';
import { TeamRole } from '@teambrain/shared';

export interface ITeamMembershipDocument extends Document {
  teamId: Types.ObjectId;
  userId: Types.ObjectId;
  role: TeamRole;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const teamMembershipSchema = new Schema<ITeamMembershipDocument>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        ret.teamId = ret.teamId?.toString();
        ret.userId = ret.userId?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

teamMembershipSchema.index({ teamId: 1, userId: 1 }, { unique: true });

export const TeamMembership = mongoose.model<ITeamMembershipDocument>(
  'TeamMembership',
  teamMembershipSchema
);
