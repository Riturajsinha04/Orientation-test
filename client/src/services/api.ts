import { IToken, QueueStats, SmartboardData } from '../types';

const API_BASE = '/api';

const safeFetchJson = async (url: string, options?: RequestInit) => {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    if (!text) {
      return { success: false, message: `Server returned empty response (${res.status}).` };
    }
    try {
      return JSON.parse(text);
    } catch {
      return { success: false, message: `Server response error (${res.status}).` };
    }
  } catch (err: any) {
    return { success: false, message: 'Backend server is offline or unreachable.' };
  }
};

export const api = {
  async getTokens(search = '', status = 'ALL'): Promise<{ success: boolean; tokens: IToken[] }> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'ALL') params.append('status', status);
    const res = await safeFetchJson(`${API_BASE}/tokens?${params.toString()}`);
    return { success: res.success ?? false, tokens: res.tokens || [] };
  },

  async getSmartboardData(): Promise<{ success: boolean } & SmartboardData> {
    return safeFetchJson(`${API_BASE}/tokens/current`);
  },

  async getStats(): Promise<{ success: boolean; stats: QueueStats }> {
    return safeFetchJson(`${API_BASE}/tokens/stats`);
  },

  async createToken(payload: {
    studentName: string;
    mobile: string;
    course?: string;
    allowDuplicate?: boolean;
  }): Promise<{ success: boolean; message: string; token?: IToken; isDuplicate?: boolean; existingToken?: string }> {
    return safeFetchJson(`${API_BASE}/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async callNext(tableNumber: number): Promise<{ success: boolean; message: string; token?: IToken }> {
    return safeFetchJson(`${API_BASE}/tokens/call-next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableNumber }),
    });
  },

  async updateStatus(
    tokenStr: string,
    status: string,
    tableNumber?: number
  ): Promise<{ success: boolean; message: string; token?: IToken }> {
    return safeFetchJson(`${API_BASE}/tokens/${tokenStr}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, tableNumber }),
    });
  },

  async recallToken(tokenStr: string): Promise<{ success: boolean; message: string; token?: IToken }> {
    return safeFetchJson(`${API_BASE}/tokens/${tokenStr}/recall`, {
      method: 'POST',
    });
  },

  async resetSession(): Promise<{ success: boolean; message: string; sessionId: string }> {
    return safeFetchJson(`${API_BASE}/session/reset`, {
      method: 'POST',
    });
  },

  async updateTableCount(tableCount: number): Promise<{ success: boolean; message: string; tableCount?: number }> {
    return safeFetchJson(`${API_BASE}/tables/count`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableCount }),
    });
  },

  async updateTableName(tableNumber: number, name: string): Promise<{ success: boolean; message: string; name?: string }> {
    return safeFetchJson(`${API_BASE}/tables/${tableNumber}/name`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  },
};
