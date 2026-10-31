import mongoose, { Document, Schema, Types } from 'mongoose';
import { FusionStatus } from '@teambrain/shared';

export interface IFusionDocument extends Document {
  projectId?: Types.ObjectId;
  teamId: Types.ObjectId;
  topic?: string;
  synthesis: string;
  status: FusionStatus;
  sourceMemoryIds: Types.ObjectId[];
  conflictGroups: Array<{
    topic?: string;
    memoryIds: Types.ObjectId[];
    description: string;
  }>;
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const conflictGroupSchema = new Schema(
  {
    topic: { type: String },
    memoryIds: [{ type: Schema.Types.ObjectId, ref: 'Memory' }],
    description: { type: String, required: true },
  },
  { _id: false }
);

const fusionSchema = new Schema<IFusionDocument>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    topic: { type: String, trim: true },
    synthesis: { type: String, required: true },
    status: { type: String, enum: ['draft', 'confirmed'], default: 'draft', index: true },
    sourceMemoryIds: [{ type: Schema.Types.ObjectId, ref: 'Memory' }],
    conflictGroups: [conflictGroupSchema],
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        ret.teamId = ret.teamId?.toString();
        ret.projectId = ret.projectId?.toString();
        ret.createdById = ret.createdById?.toString();
        if (Array.isArray(ret.sourceMemoryIds)) {
          ret.sourceMemoryIds = ret.sourceMemoryIds.map((id: any) => id.toString());
        }
        if (Array.isArray(ret.conflictGroups)) {
          ret.conflictGroups = ret.conflictGroups.map((cg: any) => ({
            ...cg,
            memoryIds: cg.memoryIds?.map((id: any) => id.toString()),
          }));
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Fusion = mongoose.model<IFusionDocument>('Fusion', fusionSchema);
