import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  sessionId: string;
  title: string;
  date: string;
  isActive: boolean;
  createdAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    sessionId: { type: String, required: true, unique: true },
    title: { type: String, required: true, default: 'Mirai Orientation 2026' },
    date: { type: String, required: true, default: '2026-08-18' },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export const Session = mongoose.model<ISession>('Session', SessionSchema);
