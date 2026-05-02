INSERT INTO producers (
  slug, category, name, region, country, founded, country_code, established,
  altitude, soil, climate, short_story, story, philosophy, estate_info, images,
  website, updated_at, version
)
VALUES (
  'bodegas-barahonda',
  'wine',
  'Bodegas Barahonda',
  'D.O. Yecla',
  'Hiszpania',
  1925,
  'es',
  '1925 / 2006',
  '700-800 m n.p.m.',
  'Wapień, piasek, glina',
  'Kontynentalny',
  'Rodzinna winnica z D.O. Yecla, prowadzona przez rodzinę Candela i znana z organicznych win Monastrell oraz Syrah.',
  'Rodzinna tradycja winarska sięga 1850 roku - cztery pokolenia rodziny Candela. W 1925 r. założono bodegę, a w 2006 r. bracia Antonio i Alfredo Candela powołali Bodegas Barahonda, dziś jedną z najbardziej rozpoznawalnych winnic w D.O. Yecla.

150 ha własnych winnic + ponad 600 ha pod nadzorem agrotechnicznym. Działki w dwóch strefach: Campo Arriba (700-800 m) - 80% wapień, 5% piasek, 15% glina; Campo Abajo (400-500 m) - 30% wapień, 5% piasek, 65% glina. Głębokie, przepuszczalne gleby - ilaste podłoże retencjonuje wodę, co przekłada się na koncentrację i złożoność wina.

Klimat kontynentalny z ekstremalnymi amplitudami (-6°C do +40°C), 3 385 h słońca i ok. 300 mm opadów rocznie. Certyfikat ekologiczny CAERM (ES-ECO-024-MU), certyfikat wegański. Restauracja przy winnicy wyróżniona w przewodniku Michelin i nagrodzona Repsol Sol.',
  NULL,
  '[]',
  '[]',
  NULL,
  CAST(strftime('%s', 'now') AS INTEGER),
  1
)
ON CONFLICT(slug) DO UPDATE SET
  category = excluded.category,
  name = excluded.name,
  region = excluded.region,
  country = excluded.country,
  founded = excluded.founded,
  country_code = excluded.country_code,
  established = excluded.established,
  altitude = excluded.altitude,
  soil = excluded.soil,
  climate = excluded.climate,
  short_story = excluded.short_story,
  story = excluded.story,
  updated_at = excluded.updated_at,
  version = producers.version + 1;

UPDATE product_content
SET
  producer_slug = 'bodegas-barahonda',
  updated_at = CAST(strftime('%s', 'now') AS INTEGER),
  version = version + 1
WHERE category = 'wine'
  AND producer_slug IS NULL
  AND (
    wine_details LIKE '%Bodegas Barahonda%'
    OR extended LIKE '%Bodegas Barahonda%'
  );
