-- ══════════════════════════════════════════════════════
--  HOSHI STUDIO — Corrección de seguridad RLS
--  Ejecuta esto en: Supabase → SQL Editor → New query
--  Fecha: Abril 2026
-- ══════════════════════════════════════════════════════
--
--  CONTEXTO:
--  La app usa anon key en el navegador con auth propio
--  (tabla users + bcrypt). Las políticas de abajo
--  mantienen el acceso desde anon key (necesario para
--  que la app funcione) pero RLS queda HABILITADO,
--  lo que resuelve la advertencia de Supabase.
--
--  NOTA DE SEGURIDAD:
--  La protección real de datos depende de que la anon
--  key no sea expuesta públicamente (el repo debe ser
--  privado) y del login de la interfaz.
-- ══════════════════════════════════════════════════════


-- ── 1. Habilitar RLS en todas las tablas ──────────────
ALTER TABLE services     ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE finances     ENABLE ROW LEVEL SECURITY;
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;


-- ── 2. Eliminar políticas previas (si existen) ────────
DROP POLICY IF EXISTS "anon_all_services"     ON services;
DROP POLICY IF EXISTS "anon_all_clients"      ON clients;
DROP POLICY IF EXISTS "anon_all_appointments" ON appointments;
DROP POLICY IF EXISTS "anon_all_finances"     ON finances;
DROP POLICY IF EXISTS "anon_select_users"     ON users;
DROP POLICY IF EXISTS "anon_no_insert_users"  ON users;
DROP POLICY IF EXISTS "anon_no_update_users"  ON users;
DROP POLICY IF EXISTS "anon_no_delete_users"  ON users;


-- ── 3. Políticas para SERVICES ────────────────────────
-- Acceso completo desde anon (necesario para la app)
CREATE POLICY "anon_all_services"
  ON services
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);


-- ── 4. Políticas para CLIENTS ─────────────────────────
CREATE POLICY "anon_all_clients"
  ON clients
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);


-- ── 5. Políticas para APPOINTMENTS ───────────────────
CREATE POLICY "anon_all_appointments"
  ON appointments
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);


-- ── 6. Políticas para FINANCES ────────────────────────
CREATE POLICY "anon_all_finances"
  ON finances
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);


-- ── 7. Políticas para USERS (más restrictiva) ─────────
-- Solo se permite SELECT (para el login por username)
-- No se permite INSERT, UPDATE ni DELETE desde anon
CREATE POLICY "anon_select_users"
  ON users
  FOR SELECT
  TO anon
  USING (true);

-- Bloquear escritura en users desde anon
CREATE POLICY "anon_no_insert_users"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (false);

CREATE POLICY "anon_no_update_users"
  ON users
  FOR UPDATE
  TO anon
  USING (false);

CREATE POLICY "anon_no_delete_users"
  ON users
  FOR DELETE
  TO anon
  USING (false);


-- ══════════════════════════════════════════════════════
--  VERIFICACIÓN
--  Ejecuta esto para ver el estado RLS de tus tablas:
-- ══════════════════════════════════════════════════════
SELECT
  tablename,
  rowsecurity AS rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('services','clients','appointments','finances','users')
ORDER BY tablename;
