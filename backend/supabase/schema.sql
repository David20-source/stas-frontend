-- STAS (Smart Traffic Alert System) Supabase schema for Kampala Metro
-- Run in Supabase SQL Editor (or via migrations).

-- Enable UUID generation (required for gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- Enums
-- =========================
CREATE TYPE user_role AS ENUM ('GUEST','CITIZEN','OFFICER','ANALYST','ADMIN');
CREATE TYPE route_status AS ENUM ('CLEAR','MODERATE','HEAVY','CRITICAL','UNKNOWN');

CREATE TYPE incident_type AS ENUM ('JAM','ACCIDENT','WORKS','FLOODING','LIGHT','CONVOY','OTHER');
CREATE TYPE incident_severity AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE incident_status AS ENUM ('PENDING','VERIFIED','RESOLVED','REJECTED');

CREATE TYPE congestion_level AS ENUM ('CLEAR','MODERATE','HEAVY','CRITICAL');

-- =========================
-- Tables
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  role          user_role DEFAULT 'CITIZEN',
  phone         VARCHAR(20),
  is_verified   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW(),
  last_login    TIMESTAMP
);

CREATE TABLE IF NOT EXISTS routes (
  id               VARCHAR(10) PRIMARY KEY,  -- R001, R002, etc.
  name             VARCHAR(255) NOT NULL,
  start_location   VARCHAR(255),
  end_location     VARCHAR(255),
  geojson          JSONB,
  length_km        FLOAT,
  current_status   route_status DEFAULT 'UNKNOWN',
  congestion_index FLOAT DEFAULT 0,
  last_updated     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id       VARCHAR(10) REFERENCES routes(id),
  type           incident_type,
  severity       incident_severity,
  latitude       FLOAT NOT NULL,
  longitude      FLOAT NOT NULL,
  address        VARCHAR(512),
  description    TEXT,
  photo_urls     TEXT[],
  status         incident_status DEFAULT 'PENDING',
  is_anonymous   BOOLEAN DEFAULT FALSE,
  reported_by    UUID REFERENCES users(id),
  verified_by    UUID REFERENCES users(id),
  created_at     TIMESTAMP DEFAULT NOW(),
  resolved_at    TIMESTAMP
);

CREATE TABLE IF NOT EXISTS predictions (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id                   VARCHAR(10) REFERENCES routes(id),
  congestion_level           congestion_level,
  congestion_index           FLOAT,
  confidence                 FLOAT,
  predicted_avg_speed_kmh    FLOAT,
  estimated_clearance_mins   INT,
  contributing_factors       TEXT[],
  input_features             JSONB,
  predicted_at               TIMESTAMP DEFAULT NOW()
);

-- =========================
-- Seed monitored routes
-- =========================
INSERT INTO routes (id, name, start_location, end_location, length_km, current_status, congestion_index)
VALUES
  ('R001', 'Entebbe Road', 'Kampala CBD', 'Entebbe Airport', 42, 'UNKNOWN', 0),
  ('R002', 'Jinja Road', 'Kampala CBD', 'Mukono', 21, 'UNKNOWN', 0),
  ('R003', 'Northern Bypass', 'Busega Junction', 'Kyebando', 22, 'UNKNOWN', 0),
  ('R004', 'Kampala Road', 'Clock Tower', 'Mukono', 16, 'UNKNOWN', 0),
  ('R005', 'Ggaba Road', 'Centenary Park', 'Ggaba', 9, 'UNKNOWN', 0),
  ('R006', 'Gayaza Road', 'Kampala CBD', 'Gayaza', 20, 'UNKNOWN', 0),
  ('R007', 'Masaka Road', 'Kampala CBD', 'Nsangi', 12, 'UNKNOWN', 0),
  ('R008', 'Bombo Road', 'Kampala CBD', 'Bombo', 38, 'UNKNOWN', 0),
  ('R009', 'Portbell Road', 'Nakawa', 'Portbell', 8, 'UNKNOWN', 0),
  ('R010', 'Nansana Corridor', 'Kampala CBD', 'Nansana', 9, 'UNKNOWN', 0),
  ('R011', 'Namirembe Road', 'Old Taxi Park', 'Lubaga', 3, 'UNKNOWN', 0),
  ('R012', 'Mukwano Road', 'Katwe', 'Industrial Area', 4, 'UNKNOWN', 0)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  start_location = EXCLUDED.start_location,
  end_location = EXCLUDED.end_location,
  length_km = EXCLUDED.length_km,
  last_updated = NOW();

-- =========================
-- RLS
-- =========================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own profile
CREATE POLICY "Users read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (basic scaffolding)
CREATE POLICY "Users update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Public read routes (GUEST/CITIZEN/OFFICER/ADMIN all need map rendering)
CREATE POLICY "Public read routes"
  ON routes FOR SELECT
  TO anon, authenticated
  USING (true);

-- Public read active incidents (map markers + incident feed)
CREATE POLICY "Public read incidents (not rejected)"
  ON incidents FOR SELECT
  TO anon, authenticated
  USING (status <> 'REJECTED');

-- Citizens/officers/admins can insert incidents (GUEST cannot)
CREATE POLICY "Authenticated insert incidents (non-guest)"
  ON incidents FOR INSERT
  TO authenticated
  WITH CHECK (
    reported_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('CITIZEN','OFFICER','ANALYST','ADMIN')
    )
  );

-- Officers/admins can update incident status / verification fields
CREATE POLICY "Officer/Admin update incidents"
  ON incidents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('OFFICER','ADMIN')
    )
  );

-- Public read predictions (kpi + route badges)
CREATE POLICY "Public read predictions"
  ON predictions FOR SELECT
  TO anon, authenticated
  USING (true);

-- Analysts/admins can write predictions (backend ML pipeline later)
CREATE POLICY "Analyst/Admin write predictions"
  ON predictions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('ANALYST','ADMIN')
    )
  );

