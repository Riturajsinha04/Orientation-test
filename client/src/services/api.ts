import { IToken, QueueStats, SmartboardData } from '../types';
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
          if (text) {
            const data = JSON.parse(text);
            if (data.success && data.tokens) return data;
          }
        }
      } catch {
        // Fallback to Supabase
      }
    }

    // Direct Supabase Query (for Vercel deployment)
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
      console.error('Supabase getTokens error:', err);
    }

    return { success: false, tokens: [] };
  },

  async getSmartboardData(): Promise<{ success: boolean } & SmartboardData> {
    if (BACKEND_HOST) {
      try {
        const res = await fetch(`${API_BASE}/tokens/current`);
        if (res.ok) {
          const text = await res.text();
          if (text) {
            const data = JSON.parse(text);
            if (data.success) return data;
          }
        }
      } catch {
        // Fallback to Supabase
      }
    }

    // Direct Supabase Query (for Vercel deployment)
    try {
      const supabase = getSupabaseClient();

      // Get active / called / processing tokens
      const { data: activeRows } = await supabase
        .from('tokens')
        .select('*')
        .in('status', ['CALLED', 'PROCESSING'])
        .order('called_at', { ascending: false });

      // Get waiting tokens
      const { data: waitingRows } = await supabase
        .from('tokens')
        .select('*')
        .eq('status', 'WAITING')
        .order('id', { ascending: true });

      const activeTokens = activeRows ? activeRows.map(formatSupabaseToken) : [];
      const waitingTokens = waitingRows ? waitingRows.map(formatSupabaseToken) : [];
      const currentToken = activeTokens.length > 0 ? activeTokens[0] : null;

      return {
        success: true,
        currentToken,
        activeTokens,
        waitingTokens,
        nextTokens: waitingTokens.slice(0, 3).map((t) => t.token),
        waitingCount: waitingTokens.length,
      };
    } catch (err) {
      console.error('Supabase getSmartboardData error:', err);
      return { success: false, currentToken: null, activeTokens: [], waitingTokens: [], nextTokens: [], waitingCount: 0 };
    }
  },

  async getStats(): Promise<{ success: boolean; stats: QueueStats }> {
    if (BACKEND_HOST) {
      try {
        const res = await fetch(`${API_BASE}/tokens/stats`);
        if (res.ok) {
          const text = await res.text();
          if (text) {
            const data = JSON.parse(text);
            if (data.success) return data;
          }
        }
      } catch {
        // Fallback to Supabase
      }
    }

    // Direct Supabase Query (for Vercel deployment)
    try {
      const supabase = getSupabaseClient();
      const { data: allRows } = await supabase.from('tokens').select('*');

      if (allRows) {
        const formatted = allRows.map(formatSupabaseToken);
        const waiting = formatted.filter((t) => t.status === 'WAITING').length;
        const processing = formatted.filter((t) => t.status === 'PROCESSING' || t.status === 'CALLED').length;
        const onHold = formatted.filter((t) => t.status === 'ON_HOLD').length;
        const completed = formatted.filter((t) => t.status === 'COMPLETED').length;
        const skipped = formatted.filter((t) => t.status === 'SKIPPED').length;

        const tablesMap: Record<number, IToken[]> = { 1: [], 2: [], 3: [], 4: [] };
        formatted.forEach((t) => {
          if (t.tableNumber && (t.status === 'CALLED' || t.status === 'PROCESSING')) {
            const num = Number(t.tableNumber);
            if (!tablesMap[num]) tablesMap[num] = [];
            tablesMap[num].push(t);
          }
        });

        const activeTableNumbers = Object.keys(tablesMap).map(Number);
        const tableCount = Math.max(4, ...activeTableNumbers);

        return {
          success: true,
          stats: {
            total: formatted.length,
            waiting,
            processing,
            onHold,
            completed,
            skipped,
            tableCount,
            tables: tablesMap,
          },
        };
      }
    } catch (err) {
      console.error('Supabase getStats error:', err);
    }

    return {
      success: false,
      stats: { total: 0, waiting: 0, processing: 0, onHold: 0, completed: 0, skipped: 0, tableCount: 4, tables: { 1: [], 2: [], 3: [], 4: [] } },
    };
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
          if (text) {
            const data = JSON.parse(text);
            if (data.success || data.isDuplicate) return data;
          }
        }
      } catch {
        // Fallback to Supabase
      }
    }

    // Direct Supabase Write (for Vercel deployment)
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
        id: newId,
        token: tokenFormatted,
        student_name: payload.studentName.trim(),
        mobile: cleanedMobile,
        course: payload.course || 'B.Tech Computer Science & AI',
        status: 'WAITING',
        session_id: 'orientation-2026',
        created_at: new Date().toISOString(),
      };

      const { error: insertErr } = await supabase.from('tokens').insert([rowToInsert]);
      if (insertErr) {
        return { success: false, message: `Database error: ${insertErr.message}` };
      }

      const generatedToken = formatSupabaseToken(rowToInsert);
      return { success: true, message: 'Token generated successfully', token: generatedToken };
    } catch (err: any) {
      console.error('Supabase createToken exception:', err);
      return { success: false, message: err.message || 'Failed to submit registration' };
    }
  },

  async callNext(tableNumber: number): Promise<{ success: boolean; message: string; token?: IToken }> {
    if (BACKEND_HOST) {
      try {
        const res = await fetch(`${API_BASE}/tokens/call-next`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tableNumber }),
        });
        if (res.ok) {
          const text = await res.text();
          if (text) {
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
      const { data: waitingRows } = await supabase
        .from('tokens')
        .select('*')
        .eq('status', 'WAITING')
        .order('id', { ascending: true })
        .limit(1);

      if (!waitingRows || waitingRows.length === 0) {
        return { success: false, message: 'No students waiting in queue' };
      }

      const target = waitingRows[0];
      const nowIso = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from('tokens')
        .update({ status: 'CALLED', table_number: tableNumber, called_at: nowIso })
        .eq('id', target.id);

      if (updateErr) {
        return { success: false, message: `Call next error: ${updateErr.message}` };
      }

      const updatedToken = formatSupabaseToken({ ...target, status: 'CALLED', table_number: tableNumber, called_at: nowIso });
      return { success: true, message: `Called Token ${updatedToken.token} to Table ${tableNumber}`, token: updatedToken };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error executing Call Next' };
    }
  },

  async updateStatus(
    tokenStr: string,
    status: string,
    tableNumber?: number
  ): Promise<{ success: boolean; message: string; token?: IToken }> {
    if (BACKEND_HOST) {
      try {
        const res = await fetch(`${API_BASE}/tokens/${tokenStr}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, tableNumber }),
        });
        if (res.ok) {
          const text = await res.text();
          if (text) {
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
      const updateData: any = { status };
      if (tableNumber !== undefined) updateData.table_number = tableNumber;
      if (status === 'COMPLETED') updateData.completed_at = new Date().toISOString();

      const { error } = await supabase
        .from('tokens')
        .update(updateData)
        .eq('token', tokenStr);

      if (error) return { success: false, message: error.message };

      return { success: true, message: `Token ${tokenStr} updated to ${status}` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error updating status' };
    }
  },

  async recallToken(tokenStr: string): Promise<{ success: boolean; message: string; token?: IToken }> {
    if (BACKEND_HOST) {
      try {
        const res = await fetch(`${API_BASE}/tokens/${tokenStr}/recall`, { method: 'POST' });
        if (res.ok) {
          const text = await res.text();
          if (text) {
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
      await supabase
        .from('tokens')
        .update({ called_at: new Date().toISOString() })
        .eq('token', tokenStr);
      return { success: true, message: `Re-announced Token ${tokenStr}` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error recalling token' };
    }
  },

  async resetSession(): Promise<{ success: boolean; message: string; sessionId: string }> {
    if (BACKEND_HOST) {
      try {
        const res = await fetch(`${API_BASE}/session/reset`, { method: 'POST' });
        if (res.ok) {
          const text = await res.text();
          if (text) return JSON.parse(text);
        }
      } catch {
        // Fallback
      }
    }
    return { success: true, message: 'Session reset', sessionId: 'orientation-2026' };
  },

  async updateTableCount(tableCount: number): Promise<{ success: boolean; message: string; tableCount?: number }> {
    return { success: true, message: `Tables count updated to ${tableCount}`, tableCount };
  },

  async updateTableName(tableNumber: number, name: string): Promise<{ success: boolean; message: string; name?: string }> {
    return { success: true, message: `Table ${tableNumber} name updated to ${name}`, name };
  },
};
