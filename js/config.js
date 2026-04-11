/* ══════════════════════════════════════
   config.js — Credenciales de Supabase
   ══════════════════════════════════════
   ⚠  CAMBIA ESTOS DOS VALORES con los de
      tu proyecto en supabase.com
      → Settings → API
   ══════════════════════════════════════ */

const SUPABASE_URL = 'https://nntddocsxtrhrroftlvu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_OpYnYEyy9y-Q_SjpC-tf9Q_mjOAg6ar';

/* ── Cliente global de Supabase ── */
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
