import mongoose, { Document, Schema, Types } from 'mongoose';
import { TaskStatus } from '@teambrain/shared';

export interface ITaskDocument extends Document {
  projectId: Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  dueAt?: Date;
  createdById: Types.ObjectId;
  assignedToId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITaskDocument>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['todo', 'in_progress', 'done'], default: 'todo', index: true },
    dueAt: { type: Date },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedToId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        ret.projectId = ret.projectId?.toString();
        ret.createdById = ret.createdById?.toString();
        ret.assignedToId = ret.assignedToId?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Task = mongoose.model<ITaskDocument>('Task', taskSchema);
