import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? supabaseKey.slice(0, 25) + '...' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSync() {
  const testPayload = {
    token: 'A-999',
    token_number: 999,
    student_name: 'Supabase Test Student',
    mobile: '9999999999',
    course: 'B.Tech CS & AI',
    status: 'WAITING',
    session_id: 'orientation-2026',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('tokens')
    .upsert(testPayload, { onConflict: 'session_id,token' })
    .select();

  if (error) {
    console.error('❌ Supabase Upsert Error:', error);
    if (error.code === '42P01') {
      console.log('\n💡 Notice: The "tokens" table does not exist in your Supabase database yet.');
      console.log('Please run the table creation SQL in your Supabase SQL Editor.');
    }
  } else {
    console.log('\n🎉 SUCCESS! Token synced to Supabase database!');
    console.log('Synced record:', data);
  }
}

testSync().catch(console.error);
