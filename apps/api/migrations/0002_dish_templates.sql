CREATE TABLE dish_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL DEFAULT 'wine',
  name TEXT NOT NULL,
  note TEXT,
  dish_type TEXT,
  tags TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX dt_category ON dish_templates(category);
CREATE INDEX dt_active ON dish_templates(is_active);
CREATE INDEX dt_dish_type ON dish_templates(dish_type);
