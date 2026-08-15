import mongoose, { Schema, Document } from 'mongoose';

export type TokenStatus = 'WAITING' | 'CALLED' | 'PROCESSING' | 'ON_HOLD' | 'COMPLETED' | 'SKIPPED';

export interface IToken extends Document {
  token: string;
  tokenNumber: number;
  studentName: string;
  mobile: string;
  course?: string;
  status: TokenStatus;
  tableNumber?: number;
  sessionId: string;
  calledAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

const TokenSchema = new Schema<IToken>(
  {
    token: { type: String, required: true, trim: true },
    tokenNumber: { type: Number, required: true },
    studentName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    course: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['WAITING', 'CALLED', 'PROCESSING', 'ON_HOLD', 'COMPLETED', 'SKIPPED'],
      default: 'WAITING',
    },
    tableNumber: { type: Number, default: null },
    sessionId: { type: String, required: true, default: 'orientation-2026' },
    calledAt: { type: Date },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique token per session and mobile duplicate check per session
TokenSchema.index({ sessionId: 1, token: 1 }, { unique: true });
TokenSchema.index({ sessionId: 1, status: 1 });
TokenSchema.index({ sessionId: 1, mobile: 1 });

export const Token = mongoose.model<IToken>('Token', TokenSchema);
