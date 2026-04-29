ALTER TABLE dish_templates ADD COLUMN image_url TEXT;
ALTER TABLE dish_templates ADD COLUMN emoji TEXT;

INSERT INTO dish_templates (category, name, note, dish_type, image_url, emoji, tags, is_active, sort_order, created_at, updated_at)
SELECT 'wine', 'Albóndigas', 'Klopsiki w sosie pomidorowym po hiszpańsku — klasyczna tapas, której pikantność świetnie rezonuje z owocowymi nutami Monastrell', 'mięso', '/api/uploads/image/Albóndigas.png', NULL, '["barahonda","monastrell","mięso"]', 1, 10, strftime('%s','now'), strftime('%s','now')
WHERE NOT EXISTS (SELECT 1 FROM dish_templates WHERE category = 'wine' AND name = 'Albóndigas');

INSERT INTO dish_templates (category, name, note, dish_type, image_url, emoji, tags, is_active, sort_order, created_at, updated_at)
SELECT 'wine', 'Antrykot wołowy z grilla', 'Soczysty antrykot z grilla z chrupiącą skórką — moce taniny Monastrell doskonale tną tłuszcz, wydobywając dymne nuty mięsa', 'mięso', '/api/uploads/image/Antrykot wołowy z grilla.png', NULL, '["barahonda","monastrell","mięso","grill"]', 1, 20, strftime('%s','now'), strftime('%s','now')
WHERE NOT EXISTS (SELECT 1 FROM dish_templates WHERE category = 'wine' AND name = 'Antrykot wołowy z grilla');

INSERT INTO dish_templates (category, name, note, dish_type, image_url, emoji, tags, is_active, sort_order, created_at, updated_at)
SELECT 'wine', 'Birria', 'Meksykańskie duszone mięso w pikantnym bulionie — intensywne przyprawy i głęboki smak umami grają z ciemnymi owocami wina', 'mięso', '/api/uploads/image/Birria.png', NULL, '["barahonda","mięso","umami"]', 1, 30, strftime('%s','now'), strftime('%s','now')
WHERE NOT EXISTS (SELECT 1 FROM dish_templates WHERE category = 'wine' AND name = 'Birria');

INSERT INTO dish_templates (category, name, note, dish_type, image_url, emoji, tags, is_active, sort_order, created_at, updated_at)
SELECT 'wine', 'Chili con carne', 'Wołowina z fasolą i chili — pełna treść tego dania wymaga równie mocnego, taniczniego wina z Yecla', 'mięso', '/api/uploads/image/Chili con carne.png', NULL, '["barahonda","mięso","pikantne"]', 1, 40, strftime('%s','now'), strftime('%s','now')
WHERE NOT EXISTS (SELECT 1 FROM dish_templates WHERE category = 'wine' AND name = 'Chili con carne');

INSERT INTO dish_templates (category, name, note, dish_type, image_url, emoji, tags, is_active, sort_order, created_at, updated_at)
SELECT 'wine', 'Chorizo i fuet – talerz wędlin', 'Talerz z chorizo, fuet i innymi suszonymi wędlinami — korzenne nuty wina i dymna wiśnia tworzą idealne połączenie tapas', 'wędliny', '/api/uploads/image/Chorizo i fuet – talerz wędlin.png', NULL, '["barahonda","wędliny","tapas"]', 1, 50, strftime('%s','now'), strftime('%s','now')
WHERE NOT EXISTS (SELECT 1 FROM dish_templates WHERE category = 'wine' AND name = 'Chorizo i fuet – talerz wędlin');

INSERT INTO dish_templates (category, name, note, dish_type, image_url, emoji, tags, is_active, sort_order, created_at, updated_at)
SELECT 'wine', 'Dzik duszony', 'Wolno duszony dzik z ziołami i czerwonym winem — dziczyzna o intensywnym smaku doskonale harmonizuje z Monastrell', 'dziczyzna', '/api/uploads/image/Dzik duszony.png', NULL, '["barahonda","dziczyzna","monastrell"]', 1, 60, strftime('%s','now'), strftime('%s','now')
WHERE NOT EXISTS (SELECT 1 FROM dish_templates WHERE category = 'wine' AND name = 'Dzik duszony');

INSERT INTO dish_templates (category, name, note, dish_type, image_url, emoji, tags, is_active, sort_order, created_at, updated_at)
SELECT 'wine', 'Escalivada', 'Pieczone warzywa po katalońsku: bakłażan, papryka i cebula — wegańska klasyka podkreślająca owocowy charakter wina', 'warzywa', '/api/uploads/image/Escalivada.png', NULL, '["barahonda","warzywa","wegańskie"]', 1, 70, strftime('%s','now'), strftime('%s','now')
WHERE NOT EXISTS (SELECT 1 FROM dish_templates WHERE category = 'wine' AND name = 'Escalivada');

INSERT INTO dish_templates (category, name, note, dish_type, image_url, emoji, tags, is_active, sort_order, created_at, updated_at)
SELECT 'wine', 'Jagnięcina pieczona z ziołami', 'Udziec jagnięcy pieczony z rozmarynem, tymiankiem i czosnkiem — klasyczne połączenie dla win ze szczepu Monastrell z Yecla', 'mięso', '/api/uploads/image/Jagnięcina pieczona z ziołami.png', NULL, '["barahonda","mięso","jagnięcina"]', 1, 80, strftime('%s','now'), strftime('%s','now')
WHERE NOT EXISTS (SELECT 1 FROM dish_templates WHERE category = 'wine' AND name = 'Jagnięcina pieczona z ziołami');

INSERT INTO dish_templates (category, name, note, dish_type, image_url, emoji, tags, is_active, sort_order, created_at, updated_at)
SELECT 'wine', 'Karkówka z grilla', 'Soczysta karkówka z grilla z marynatą ziołową — delikatny tłuszcz i dym grilla świetnie rezonują z taniczną strukturą Barahondy', 'mięso', '/api/uploads/image/Karkówka z grilla.png', NULL, '["barahonda","mięso","grill"]', 1, 90, strftime('%s','now'), strftime('%s','now')
WHERE NOT EXISTS (SELECT 1 FROM dish_templates WHERE category = 'wine' AND name = 'Karkówka z grilla');

INSERT INTO dish_templates (category, name, note, dish_type, image_url, emoji, tags, is_active, sort_order, created_at, updated_at)
SELECT 'wine', 'Manchego z dodatkami', 'Dojrzewający ser Manchego z oliwkami, marynowanymi warzywami i chrupkim pieczywem — idealna tapas do kieliszka Barahondy', 'sery', '/api/uploads/image/Manchego z dodatkami.png', NULL, '["barahonda","sery","tapas"]', 1, 100, strftime('%s','now'), strftime('%s','now')
WHERE NOT EXISTS (SELECT 1 FROM dish_templates WHERE category = 'wine' AND name = 'Manchego z dodatkami');

INSERT INTO dish_templates (category, name, note, dish_type, image_url, emoji, tags, is_active, sort_order, created_at, updated_at)
SELECT 'wine', 'Moussaka', 'Grecka zapiekanka z mięsem mielonym, bakłażanem i sosem béchamel — bogata i kremowa struktura dania podkreśla dojrzałość wina', 'mięso', '/api/uploads/image/Moussaka.png', NULL, '["barahonda","mięso","zapiekanka"]', 1, 110, strftime('%s','now'), strftime('%s','now')
WHERE NOT EXISTS (SELECT 1 FROM dish_templates WHERE category = 'wine' AND name = 'Moussaka');

INSERT INTO dish_templates (category, name, note, dish_type, image_url, emoji, tags, is_active, sort_order, created_at, updated_at)
SELECT 'wine', 'Paella z mięsem', 'Tradycyjna paella valenciana z kurczakiem i królikiem — szafranowy ryż i wino z tej samej strefy klimatycznej to naturalne połączenie', 'mięso', '/api/uploads/image/Paella z mięsem.png', NULL, '["barahonda","mięso","paella"]', 1, 120, strftime('%s','now'), strftime('%s','now')
WHERE NOT EXISTS (SELECT 1 FROM dish_templates WHERE category = 'wine' AND name = 'Paella z mięsem');

INSERT INTO dish_templates (category, name, note, dish_type, image_url, emoji, tags, is_active, sort_order, created_at, updated_at)
SELECT 'wine', 'Parmezan i Pecorino', 'Twarde sery dojrzewające o intensywnym smaku — słony, orzechowy charakter serów podkreśla ciemnoowocowe nuty Monastrell', 'sery', '/api/uploads/image/Parmezan i Pecorino.png', NULL, '["barahonda","sery","monastrell"]', 1, 130, strftime('%s','now'), strftime('%s','now')
WHERE NOT EXISTS (SELECT 1 FROM dish_templates WHERE category = 'wine' AND name = 'Parmezan i Pecorino');

INSERT INTO dish_templates (category, name, note, dish_type, image_url, emoji, tags, is_active, sort_order, created_at, updated_at)
SELECT 'wine', 'Pieczona kaczka', 'Kaczka pieczona z figami i korzennymi przyprawami — tłuste, aromatyczne mięso drobiowe idealnie balansuje taniny Barahondy', 'drób', '/api/uploads/image/Pieczona kaczka.png', NULL, '["barahonda","drób","kaczka"]', 1, 140, strftime('%s','now'), strftime('%s','now')
WHERE NOT EXISTS (SELECT 1 FROM dish_templates WHERE category = 'wine' AND name = 'Pieczona kaczka');

INSERT INTO dish_templates (category, name, note, dish_type, image_url, emoji, tags, is_active, sort_order, created_at, updated_at)
SELECT 'wine', 'Sarnina', 'Pieczeń z sarny lub gulasz z sarniny — szlachetna dziczyzna o lekko słodkawym smaku tworzy eleganckie połączenie z organicznym winem', 'dziczyzna', '/api/uploads/image/Sarnina.png', NULL, '["barahonda","dziczyzna","organiczne"]', 1, 150, strftime('%s','now'), strftime('%s','now')
WHERE NOT EXISTS (SELECT 1 FROM dish_templates WHERE category = 'wine' AND name = 'Sarnina');

INSERT INTO dish_templates (category, name, note, dish_type, image_url, emoji, tags, is_active, sort_order, created_at, updated_at)
SELECT 'wine', 'Sery pleśniowe', 'Roquefort, Gorgonzola lub Cabrales — kontrastowe połączenie intensywnej pleśni i dojrzałych, ciemnych owoców wina', 'sery', '/api/uploads/image/Sery pleśniowe.png', NULL, '["barahonda","sery","pleśniowe"]', 1, 160, strftime('%s','now'), strftime('%s','now')
WHERE NOT EXISTS (SELECT 1 FROM dish_templates WHERE category = 'wine' AND name = 'Sery pleśniowe');

INSERT INTO dish_templates (category, name, note, dish_type, image_url, emoji, tags, is_active, sort_order, created_at, updated_at)
SELECT 'wine', 'Souvlaki', 'Greckie szaszłyki z wieprzowiny lub jagnięciny z tzatziki i pitą — dymny grill i śródziemnomorskie zioła grają z charakterem wina', 'mięso', '/api/uploads/image/Souvlaki.png', NULL, '["barahonda","mięso","grill"]', 1, 170, strftime('%s','now'), strftime('%s','now')
WHERE NOT EXISTS (SELECT 1 FROM dish_templates WHERE category = 'wine' AND name = 'Souvlaki');

INSERT INTO dish_templates (category, name, note, dish_type, image_url, emoji, tags, is_active, sort_order, created_at, updated_at)
SELECT 'wine', 'Żeberka wieprzowe BBQ', 'Wolno pieczone żeberka z sosem BBQ — słodko-dymna glazura i miękkie mięso wymagają pełnego, taniczniego czerwonego wina', 'mięso', '/api/uploads/image/Żeberka wieprzowe BBQ.png', NULL, '["barahonda","mięso","bbq"]', 1, 180, strftime('%s','now'), strftime('%s','now')
WHERE NOT EXISTS (SELECT 1 FROM dish_templates WHERE category = 'wine' AND name = 'Żeberka wieprzowe BBQ');

INSERT INTO dish_templates (category, name, note, dish_type, image_url, emoji, tags, is_active, sort_order, created_at, updated_at)
SELECT 'wine', 'Żeberka wołowe duszone', 'Short ribs duszone przez 6 godzin z warzywami korzennymi — intensywne, rozpadające się mięso doskonale harmonizuje z Barahondą', 'mięso', '/api/uploads/image/Żeberka wołowe duszone.png', NULL, '["barahonda","mięso","wołowina"]', 1, 190, strftime('%s','now'), strftime('%s','now')
WHERE NOT EXISTS (SELECT 1 FROM dish_templates WHERE category = 'wine' AND name = 'Żeberka wołowe duszone');
