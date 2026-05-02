-- producers (winnice, plantacje kawy, producenci delikatesów…)
CREATE TABLE producers (
  slug TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  country TEXT NOT NULL,
  founded INTEGER,
  country_code TEXT,
  established TEXT,
  altitude TEXT,
  soil TEXT,
  climate TEXT,
  short_story TEXT,
  story TEXT,
  philosophy TEXT,
  estate_info TEXT,   -- JSON: [{name, hectares, soil}] (wine) | [{name, altitude, variety}] (coffee)
  images TEXT,        -- JSON: [{url, caption}]
  website TEXT,
  updated_at INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX producers_category ON producers(category);
CREATE INDEX producers_region ON producers(region);
CREATE INDEX producers_country ON producers(country);

-- product_content (per-SKU, generyczna dla każdej kategorii)
CREATE TABLE product_content (
  sku TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  producer_slug TEXT REFERENCES producers(slug),

  -- Wspólne dla każdej kategorii
  awards TEXT,        -- JSON: [{name, year, rank}]
  ritual TEXT,        -- markdown (serwowanie / parzenie / podanie)
  serving_temp TEXT,

  -- Profil sensoryczny (0-100) — wymiary per kategoria jako JSON blob
  -- wine:       {body, sweetness, acidity, tannin, alcohol}
  -- coffee:     {acidity, body, sweetness, roast, bitterness}
  -- delicacies: {intensity, saltiness, sweetness, umami}
  profile TEXT,

  -- Nuty sensoryczne (markdown per wymiar) — etykiety per kategoria
  -- wine:       {eye, nose, palate}
  -- coffee:     {aroma, taste, aftertaste}
  -- delicacies: {aroma, taste, texture}
  sensory TEXT,

  -- Dane specyficzne dla kategorii (JSON blob)
  -- wine:       {decanting, color, style}
  -- coffee:     {processing, variety, brew_methods}
  -- delicacies: {ingredients, storage, origin_story}
  extended TEXT,

  -- Pelne wine details JSON edytowane w adminie
  wine_details TEXT,

  -- Flagi do szybkich query (denormalizacja)
  has_awards INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 0,

  updated_at INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX pc_category ON product_content(category);
CREATE INDEX pc_producer ON product_content(producer_slug);
CREATE INDEX pc_published ON product_content(is_published);
CREATE INDEX pc_category_published ON product_content(category, is_published);

-- Historia zmian produktu (snapshot per update)
CREATE TABLE product_content_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL,
  payload TEXT NOT NULL,
  changed_by INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX pch_sku_created ON product_content_history(sku, created_at DESC);

-- Historia zmian producenta
CREATE TABLE producers_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  payload TEXT NOT NULL,
  changed_by INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX prh_slug_created ON producers_history(slug, created_at DESC);
