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
  birthday       DATE,
  fav_service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  allergies      TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);


-- ── 3. CITAS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name  TEXT NOT NULL,           -- nombre libre (sin clienta registrada)
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
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT NOT NULL CHECK (type IN ('ingreso','salida')),
  description TEXT NOT NULL,
  amount     INTEGER NOT NULL DEFAULT 0,
  category   TEXT DEFAULT 'otro',
  date       DATE NOT NULL,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ══════════════════════════════════════════════════════
--  SEGURIDAD: Row Level Security (RLS)
--  Por ahora desactivado para uso interno sin login.
--  Si en el futuro agregas autenticación, actívalo.
-- ══════════════════════════════════════════════════════
ALTER TABLE services     DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients      DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE finances     DISABLE ROW LEVEL SECURITY;
