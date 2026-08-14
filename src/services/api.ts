import { IToken, SmartboardData } from '../types';

const API_BASE = '/api';

const safeFetchJson = async (url: string, options?: RequestInit) => {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    if (!text) {
      return { success: false, message: `Server returned empty response (${res.status}). Please check backend server.` };
    }
    try {
      return JSON.parse(text);
    } catch {
      return { success: false, message: `Server response error (${res.status}). Please check backend server.` };
    }
  } catch (err: any) {
    return { success: false, message: 'Backend server is offline or unreachable (port 5001).' };
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
    const res = await safeFetchJson(`${API_BASE}/tokens/current`);
    return res;
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
};
