import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://powyminyfeyqqwqgoyei.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3ltaW55ZmV5cXF3cWdveWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDU0MDIsImV4cCI6MjA4NjU4MTQwMn0.VilEEpVtj9cFMPezR-Dm5yG9kjcpGCFX6RbKocFbIxA';

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    const { data, error } = await db.from('conversation_states').select('*').limit(1);
    if (error) {
        console.error("Query failed:", error);
    } else {
        console.log("Success! Columns:", Object.keys(data[0] || {}));
    }
}
check();
