import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cpswltfnelycskexjzpl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwc3dsdGZuZWx5Y3NrZXhqenBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MjM2NjEsImV4cCI6MjEwMjE5OTY2MX0.TnrXC4i3KErlE5q-V8eu5oIIdNlGg-f04sAyUuMuamI';

let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
};

export const syncStudentToSupabaseDirect = async (tokenData: {
  token: string;
  studentName: string;
  mobile: string;
  course?: string;
  status: string;
}) => {
  try {
    const supabase = getSupabaseClient();
    const tokenStr = tokenData.token;

    const { data: existingData } = await supabase
      .from('tokens')
      .select('id')
      .eq('token', tokenStr)
      .limit(1);

    if (existingData && existingData.length > 0) {
      const existingId = existingData[0].id;
      await supabase.from('tokens').update({
        student_name: tokenData.studentName,
        mobile: tokenData.mobile,
        course: tokenData.course || 'General',
        status: tokenData.status,
      }).eq('id', existingId);
    } else {
      const { data: maxIdData } = await supabase
        .from('tokens')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

      const maxId = maxIdData && maxIdData.length > 0 ? Number(maxIdData[0].id) : 0;
      const newId = maxId + 1;

      await supabase.from('tokens').insert([{
        id: newId,
        token: tokenStr,
        student_name: tokenData.studentName,
        mobile: tokenData.mobile,
        course: tokenData.course || 'General',
        status: tokenData.status,
        created_at: new Date().toISOString(),
      }]);
    }
  } catch (err) {
    console.error('[Supabase Sync Direct Error]', err);
  }
};
