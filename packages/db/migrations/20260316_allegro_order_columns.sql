-- 2026-03-16: Kolumny Allegro w tabeli orders
-- Dodano obsługę walut i notatek wewnętrznych dla zamówień Allegro.
-- Zastosuj: npx drizzle-kit push (dev) lub poniższe SQL (prod/Neon Console).

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS currency       varchar(3)      NOT NULL DEFAULT 'PLN',
  ADD COLUMN IF NOT EXISTS total_pln      decimal(10,2),
  ADD COLUMN IF NOT EXISTS internal_notes text;
