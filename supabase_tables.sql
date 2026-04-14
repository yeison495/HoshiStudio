-- ══════════════════════════════════════════════════════
--  HOSHI STUDIO — Script de base de datos en Supabase
--  Ejecuta esto en: Supabase → SQL Editor → New query
-- ══════════════════════════════════════════════════════


-- ── 1. SERVICIOS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  price       INTEGER NOT NULL DEFAULT 0,
  duration    INTEGER DEFAULT 0,        -- minutos
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Datos de ejemplo
INSERT INTO services (name, price, duration, description) VALUES
  ('Manicure semipermanente', 45000, 60, 'Esmaltado semipermanente con limpieza'),
  ('Pedicure completo',       50000, 75, 'Limpieza, exfoliación y esmaltado'),
  ('Diseño de uñas',          35000, 45, 'Nail art personalizado'),
  ('Cejas Henna',             40000, 30, 'Diseño y coloración con henna');


-- ── 2. CLIENTES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  phone          TEXT,
  email          TEXT,
  birthday       TEXT,        -- Formato MM-DD (ej: "03-15" = 15 de marzo)
  fav_service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  allergies      TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);


-- ── 3. CITAS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name  TEXT NOT NULL,           -- nombre libre (sin cliente registrado)
  phone        TEXT,
  service_id   UUID REFERENCES services(id) ON DELETE SET NULL,
  service_name TEXT,
  date         DATE NOT NULL,
  time         TIME,
  status       TEXT NOT NULL DEFAULT 'pendiente'
                CHECK (status IN ('pendiente','confirmada','completada','cancelada')),
  price        INTEGER DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);


-- ── 4. FINANZAS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS finances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('ingreso','salida')),
  description TEXT NOT NULL,
  amount      INTEGER NOT NULL DEFAULT 0,
  category    TEXT DEFAULT 'otro',
  date        DATE NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);


-- ── 5. USUARIOS (login con contraseña encriptada) ─────
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username   TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,  -- Hash bcrypt con 10 rondas
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CÓMO CREAR USUARIOS:
-- 1. Abre la app en el navegador y ve a la consola (F12)
-- 2. Ejecuta: generarHash('tu_contraseña').then(h => console.log(h))
-- 3. Copia el hash generado e insértalo aquí:
-- INSERT INTO users (username, password) VALUES
--   ('viviana',  '$2a$10$REEMPLAZA_CON_HASH_GENERADO'),
--   ('admin',    '$2a$10$REEMPLAZA_CON_HASH_GENERADO');
--
-- NOTA: Nunca guardes la contraseña en texto plano, siempre usa el hash.


-- ══════════════════════════════════════════════════════
--  MIGRACIONES
-- ══════════════════════════════════════════════════════

-- ── Migración: Cumpleaños sin año ─────────────────────
-- Si ya tenías datos con tipo DATE, ejecuta esto para
-- cambiar la columna a TEXT (formato MM-DD):
--
-- ALTER TABLE clients ALTER COLUMN birthday TYPE TEXT;
--
-- Los registros existentes quedarán como "YYYY-MM-DD".
-- El código los maneja y solo muestra día y mes.


-- ══════════════════════════════════════════════════════
--  SEGURIDAD: Row Level Security (RLS)
-- ══════════════════════════════════════════════════════
-- Nota: El login de la app protege el acceso a nivel de
-- interfaz. El RLS de Supabase funciona óptimamente con
-- Supabase Auth (JWT). Con tabla 'users' personalizada,
-- se mantiene la protección a nivel de aplicación.
-- Si deseas activar RLS con Supabase Auth en el futuro,
-- migra la autenticación a supabase.auth.signInWithPassword().

ALTER TABLE services     DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients      DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE finances     DISABLE ROW LEVEL SECURITY;
ALTER TABLE users        DISABLE ROW LEVEL SECURITY;
