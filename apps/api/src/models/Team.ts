import mongoose, { Document, Schema } from 'mongoose';

export interface ITeamDocument extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<ITeamDocument>(
  {
    name: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete (ret as any)._id;
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

export const Team = mongoose.model<ITeamDocument>('Team', teamSchema);
