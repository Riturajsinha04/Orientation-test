import { IToken, SmartboardData } from '../types';
import { getSupabaseClient } from './supabase';

const BACKEND_HOST = (import.meta as any).env?.VITE_API_URL || '';
const API_BASE = BACKEND_HOST ? `${BACKEND_HOST}/api` : '/api';

// Helper to format Supabase row into frontend IToken
const formatSupabaseToken = (row: any): IToken => ({
  _id: String(row.id || row.token),
  token: row.token,
  tokenNumber: Number(row.id || 0),
  studentName: row.student_name || row.studentName || 'Student',
  mobile: row.mobile || '',
  course: row.course || 'General',
  status: row.status || 'WAITING',
  tableNumber: row.table_number || row.tableNumber,
  sessionId: row.session_id || 'orientation-2026',
  calledAt: row.called_at,
  completedAt: row.completed_at,
  createdAt: row.created_at || new Date().toISOString(),
});

export const api = {
  async getTokens(search = '', status = 'ALL'): Promise<{ success: boolean; tokens: IToken[] }> {
    if (BACKEND_HOST) {
      try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (status && status !== 'ALL') params.append('status', status);

        const res = await fetch(`${API_BASE}/tokens?${params.toString()}`);
        if (res.ok) {
          const text = await res.text();
          if (text && (text.startsWith('{') || text.startsWith('['))) {
            const data = JSON.parse(text);
            if (data.success && data.tokens) return data;
          }
        }
      } catch {
        // Fallback to Supabase
      }
    }

    try {
      const supabase = getSupabaseClient();
      let query = supabase.from('tokens').select('*').order('id', { ascending: false });

      if (status && status !== 'ALL') {
        query = query.eq('status', status);
      }

      if (search && search.trim()) {
        const s = `%${search.trim()}%`;
        query = query.or(`token.ilike.${s},student_name.ilike.${s},mobile.ilike.${s}`);
      }

      const { data, error } = await query;
      if (!error && data) {
        return { success: true, tokens: data.map(formatSupabaseToken) };
      }
    } catch (err) {
      console.error('Supabase getTokens fallback error:', err);
    }

    return { success: false, tokens: [] };
  },

  async getSmartboardData(): Promise<{ success: boolean } & SmartboardData> {
    if (BACKEND_HOST) {
      try {
        const res = await fetch(`${API_BASE}/tokens/current`);
        if (res.ok) {
          const text = await res.text();
          if (text && (text.startsWith('{') || text.startsWith('['))) {
            const data = JSON.parse(text);
            if (data.success) return data;
          }
        }
      } catch {
        // Fallback to Supabase
      }
    }

    try {
      const supabase = getSupabaseClient();

      const { data: activeRows } = await supabase
        .from('tokens')
        .select('*')
        .in('status', ['CALLED', 'PROCESSING'])
        .order('called_at', { ascending: false });

      const { count: waitingCount } = await supabase
        .from('tokens')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'WAITING');

      const { data: waitingRows } = await supabase
        .from('tokens')
        .select('*')
        .eq('status', 'WAITING')
        .order('id', { ascending: true })
        .limit(3);

      const activeTokens = activeRows ? activeRows.map(formatSupabaseToken) : [];
      const currentToken = activeTokens.length > 0 ? activeTokens[0] : null;
      const nextTokens = waitingRows ? waitingRows.map(r => r.token) : [];

      return {
        success: true,
        currentToken,
        waitingCount: waitingCount || 0,
        nextTokens,
      };
    } catch (err) {
      console.error('Supabase getSmartboardData fallback error:', err);
      return { success: false, currentToken: null, waitingCount: 0, nextTokens: [] };
    }
  },

  async createToken(payload: {
    studentName: string;
    mobile: string;
    course?: string;
    allowDuplicate?: boolean;
  }): Promise<{ success: boolean; message: string; token?: IToken; isDuplicate?: boolean; existingToken?: string }> {
    const cleanedMobile = String(payload.mobile || '').replace(/\D/g, '');

    if (BACKEND_HOST) {
      try {
        const res = await fetch(`${API_BASE}/tokens`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const text = await res.text();
          if (text && (text.startsWith('{') || text.startsWith('['))) {
            const data = JSON.parse(text);
            if (data.success || data.isDuplicate) return data;
          }
        }
      } catch {
        // Fallback to Supabase
      }
    }

    try {
      const supabase = getSupabaseClient();

      if (!payload.allowDuplicate) {
        const { data: existing } = await supabase
          .from('tokens')
          .select('token, mobile')
          .eq('mobile', cleanedMobile)
          .limit(1);

        if (existing && existing.length > 0) {
          return {
            success: false,
            isDuplicate: true,
            message: `Mobile number ${cleanedMobile} is already registered under Token ${existing[0].token}.`,
            existingToken: existing[0].token,
          };
        }
      }

      const { data: maxRow } = await supabase
        .from('tokens')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

      const maxId = maxRow && maxRow.length > 0 ? Number(maxRow[0].id) : 0;
      const newId = maxId + 1;
      const tokenFormatted = `A-${String(newId).padStart(3, '0')}`;

      const rowToInsert = {
        token: tokenFormatted,
        student_name: payload.studentName.trim(),
        mobile: cleanedMobile,
        course: payload.course || 'B.Tech Computer Science & AI',
        status: 'WAITING',
        session_id: 'orientation-2026',
        created_at: new Date().toISOString(),
      };

      const { data: insertedData, error: insertErr } = await supabase
        .from('tokens')
        .insert([rowToInsert])
        .select();

      if (insertErr) {
        return { success: false, message: `Database error: ${insertErr.message}` };
      }

      const insertedRow = insertedData && insertedData.length > 0 ? insertedData[0] : { ...rowToInsert, id: newId };
      const generatedToken = formatSupabaseToken(insertedRow);

      return {
        success: true,
        message: 'Token generated successfully',
        token: generatedToken,
      };
    } catch (err: any) {
      console.error('Supabase createToken fallback exception:', err);
      return { success: false, message: err.message || 'Failed to submit registration' };
    }
  },
};
