import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function resyncAll() {
  console.log('Fetching tokens from server API...');
  const res = await fetch('http://localhost:5001/api/tokens').then(r => r.json());
  if (!res.success || !res.tokens) {
    console.error('Failed to fetch tokens from server');
    return;
  }

  // Clear previous test rows in Supabase
  await supabase.from('tokens').delete().neq('id', 0);

  console.log(`Resyncing ${res.tokens.length} tokens to Supabase in strict numerical sequence...`);

  for (const t of res.tokens) {
    const payload = {
      id: t.tokenNumber,
      token: t.token,
      token_number: t.tokenNumber,
      student_name: t.studentName,
      mobile: t.mobile,
      course: t.course || 'General',
      status: t.status,
      table_number: t.tableNumber || null,
      session_id: t.sessionId,
      called_at: t.calledAt ? new Date(t.calledAt).toISOString() : null,
      completed_at: t.completedAt ? new Date(t.completedAt).toISOString() : null,
      created_at: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('tokens').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error(`Error syncing token ${t.token}:`, error.message);
    } else {
      console.log(`Synced ID ${t.tokenNumber} -> Token ${t.token} (${t.studentName})`);
    }
  }

  console.log('\n🎉 Resync Complete! Check your Supabase Table Editor now — rows are in strict sequence 1, 2, 3, 4...!');
}

resyncAll().catch(console.error);
