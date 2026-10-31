import mongoose, { Document, Schema, Types } from 'mongoose';
import { ProjectStatus } from '@teambrain/shared';

export interface IProjectDocument extends Document {
  teamId: Types.ObjectId;
  name: string;
  description?: string;
  status: ProjectStatus;
  ownerId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProjectDocument>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        ret.teamId = ret.teamId?.toString();
        ret.ownerId = ret.ownerId?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Project = mongoose.model<IProjectDocument>('Project', projectSchema);
