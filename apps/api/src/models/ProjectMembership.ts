import mongoose, { Document, Schema, Types } from 'mongoose';
import { ProjectRole } from '@teambrain/shared';

export interface IProjectMembershipDocument extends Document {
  projectId: Types.ObjectId;
  userId: Types.ObjectId;
  role: ProjectRole;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const projectMembershipSchema = new Schema<IProjectMembershipDocument>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        ret.projectId = ret.projectId?.toString();
        ret.userId = ret.userId?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

projectMembershipSchema.index({ projectId: 1, userId: 1 }, { unique: true });

export const ProjectMembership = mongoose.model<IProjectMembershipDocument>(
  'ProjectMembership',
  projectMembershipSchema
);
