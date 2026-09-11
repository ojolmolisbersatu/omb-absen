// OMB ABSENSI V1 - Frontend configuration
// Aman untuk frontend: gunakan URL dan anon/publishable key saja.
// JANGAN masukkan service_role key di file ini.
const SUPABASE_URL = "https://yloxoxgvedepmegihver.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3hveGd2ZWRlcG1lZ2lodmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3Mzk4NDYsImV4cCI6MjEwMzMxNTg0Nn0.b74It13ynjkLSBqsvyuYbWmo0TkL0ztb1bj9d8TAerc";

if (!SUPABASE_URL || SUPABASE_URL.includes("PASTE_") ||
    !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("PASTE_")) {
  console.warn("Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_ANON_KEY.");
}

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
