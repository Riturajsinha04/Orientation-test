export type TokenStatus = 'WAITING' | 'CALLED' | 'PROCESSING' | 'ON_HOLD' | 'COMPLETED' | 'SKIPPED';

export interface IToken {
  _id: string;
  token: string;
  tokenNumber: number;
  studentName: string;
  mobile: string;
  course?: string;
  status: TokenStatus;
  tableNumber?: number;
  sessionId: string;
  calledAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface QueueStats {
  total: number;
  waiting: number;
  processing: number;
  onHold: number;
  completed: number;
  skipped: number;
  tableCount?: number;
  tableNames?: Record<number, string>;
  tables: Record<number, IToken[]>;
}

export interface SmartboardData {
  currentToken: IToken | null;
  activeTokens?: IToken[];
  waitingTokens?: IToken[];
  nextTokens: string[];
  waitingCount: number;
  tableNames?: Record<number, string>;
}

export type UserRole = 'RECEPTION' | 'MANAGEMENT' | 'DISPLAY';
