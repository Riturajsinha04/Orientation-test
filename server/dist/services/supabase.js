"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncTokenToSupabase = exports.getSupabase = exports.initSupabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let supabaseInstance = null;
const initSupabase = () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
        console.log('[Supabase] SUPABASE_URL or SUPABASE_KEY not provided in environment. Supabase sync standby mode active.');
        return null;
    }
    try {
        supabaseInstance = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
        console.log('[Supabase] Initialized Supabase client successfully for project:', supabaseUrl);
        return supabaseInstance;
    }
    catch (err) {
        console.error('[Supabase] Error initializing Supabase client:', err);
        return null;
    }
};
exports.initSupabase = initSupabase;
const getSupabase = () => {
    if (!supabaseInstance) {
        return (0, exports.initSupabase)();
    }
    return supabaseInstance;
};
exports.getSupabase = getSupabase;
// Sync token payload to Supabase database table `tokens` safely without PK conflicts
const syncTokenToSupabase = async (tokenData) => {
    const client = (0, exports.getSupabase)();
    if (!client) {
        console.log('[Supabase Sync] Standby mode - Supabase client not initialized');
        return;
    }
    try {
        const tokenStr = tokenData.token;
        // Check if token already exists in Supabase
        const { data: existingData } = await client
            .from('tokens')
            .select('id')
            .eq('token', tokenStr)
            .limit(1);
        if (existingData && existingData.length > 0) {
            // Update existing record
            const existingId = existingData[0].id;
            const { error: updateErr } = await client
                .from('tokens')
                .update({
                student_name: tokenData.studentName,
                mobile: tokenData.mobile,
                course: tokenData.course || 'General',
                status: tokenData.status,
                table_number: tokenData.tableNumber || null,
                called_at: tokenData.calledAt ? new Date(tokenData.calledAt).toISOString() : null,
                completed_at: tokenData.completedAt ? new Date(tokenData.completedAt).toISOString() : null,
            })
                .eq('id', existingId);
            if (updateErr) {
                console.warn(`[Supabase Update Error] Token ${tokenStr}:`, updateErr.message);
            }
            else {
                console.log(`✅ [Supabase DB] Updated token ${tokenStr} (ID: ${existingId}) in Supabase database!`);
            }
        }
        else {
            let attempts = 0;
            let inserted = false;
            let lastErr = null;
            while (attempts < 3 && !inserted) {
                attempts++;
                const { data: maxIdData } = await client
                    .from('tokens')
                    .select('id')
                    .order('id', { ascending: false })
                    .limit(1);
                const maxId = maxIdData && maxIdData.length > 0 ? Number(maxIdData[0].id) : 0;
                const newId = maxId + 1;
                const { error: insertErr } = await client
                    .from('tokens')
                    .insert([{
                        id: newId,
                        token: tokenStr,
                        student_name: tokenData.studentName,
                        mobile: tokenData.mobile,
                        course: tokenData.course || 'General',
                        status: tokenData.status,
                        table_number: tokenData.tableNumber || null,
                        session_id: tokenData.sessionId || 'orientation-2026',
                        created_at: tokenData.createdAt ? new Date(tokenData.createdAt).toISOString() : new Date().toISOString(),
                    }]);
                if (!insertErr) {
                    inserted = true;
                    console.log(`✅ [Supabase DB] Created new token ${tokenStr} (ID: ${newId}, ${tokenData.studentName}) in Supabase database!`);
                }
                else {
                    lastErr = insertErr;
                }
            }
            if (!inserted && lastErr) {
                console.warn(`[Supabase Insert Warning] Token ${tokenStr}:`, lastErr.message);
            }
        }
    }
    catch (err) {
        console.error('[Supabase Sync Exception]', err);
    }
};
exports.syncTokenToSupabase = syncTokenToSupabase;
