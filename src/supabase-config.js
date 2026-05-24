// Vite injects these values from .env.local or Vercel Environment Variables.
// The app falls back to local browser storage while these placeholders remain.
window.FT_SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || "https://your-project-ref.supabase.co",
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "your-supabase-anon-or-publishable-key",
};
