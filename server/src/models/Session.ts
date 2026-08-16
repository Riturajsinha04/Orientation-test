import mongoose, { Schema, Document } from 'mongoose';

export interface ITableConfig {
  tableNumber: number;
  name: string;
}

export interface ISession extends Document {
  sessionId: string;
  title: string;
  date: string;
  tableCount: number;
  tablesConfig: ITableConfig[];
  isActive: boolean;
  createdAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    sessionId: { type: String, required: true, unique: true },
    title: { type: String, required: true, default: 'Mirai Orientation 2026' },
    date: { type: String, required: true, default: '2026-08-18' },
    tableCount: { type: Number, default: 4, min: 1, max: 20 },
    tablesConfig: {
      type: [
        {
          tableNumber: { type: Number, required: true },
          name: { type: String, default: '' },
        },
      ],
      default: [],
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export const Session = mongoose.model<ISession>('Session', SessionSchema);
