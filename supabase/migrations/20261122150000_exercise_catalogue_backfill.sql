-- Oefeningencatalogus: de rijen die in productie staan maar in geen enkele
-- migratie. Ze werden in het voorjaar via het Supabase-dashboard aangemaakt (de
-- volledige 1ste-leerjaarreeks, de inactieve "Getallen splitsen" van het 2de en
-- de inactieve "Sommen maken" van het 3de en 4de). Latere migraties werken ze bij
-- (o.a. 20260831150000_backfill_exercise_config.sql), maar maakten ze nooit aan:
-- op een lege database (lokaal, CI) had een kind van het 1ste leerjaar daardoor
-- geen enkele oefening.
--
-- Overgenomen uit productie op 22 nov 2026 (alleen-lezen), met dezelfde id's.
-- Voegt een rij alleen toe als (route, grade) nog niet bestaat: in productie
-- verandert deze migratie dus niets. Bestaande rijen (ook hun Test/Live- en
-- actief-status, die de admin beheert) blijven ongemoeid.

INSERT INTO public.exercises
  (id, route, grade, stage, title, subject, display_order, is_active, admin_only, from_reading_theme, config)
SELECT v.id, v.route, v.grade, v.stage, v.title, v.subject::public.subject_type, v.display_order,
       v.is_active, v.admin_only, v.from_reading_theme, v.config
FROM (VALUES
  ('7e29785a-051e-44fe-89ca-1904c661204f'::uuid, '/exercises/language/1', 1, 'stage-1', 'Taal oefenen', 'reading', 1, true, false, NULL::smallint, NULL),
  ('4b1c56e0-7e6c-4fe3-83ef-88d476d27b17'::uuid, '/exercises/math/1', 1, 'stage-1', 'Sommen maken', 'math', 1, true, false, NULL::smallint, '{"allowNegative": false, "maxNumber": 10, "operators": ["+", "-"]}'::jsonb),
  ('c5329a01-ba9e-49b1-a700-313dbc00652d'::uuid, '/exercises/write-letter/1', 1, 'stage-1', 'Letters schrijven', 'writing', 1, true, true, NULL::smallint, '{}'::jsonb),
  ('326e6198-e0e2-42ab-bbd7-807155c2ff4d'::uuid, '/exercises/write-number/1', 1, 'stage-1', 'Getal schrijven', 'writing', 1, true, true, NULL::smallint, '{}'::jsonb),
  ('fa591237-bc43-4f66-9fce-6ae1741dd1db'::uuid, '/exercises/bonds/1', 1, 'stage-1', 'Getallen splitsen', 'math', 2, false, false, NULL::smallint, '{"maxTarget": 6, "minTarget": 3}'::jsonb),
  ('f2ab37cc-a28d-4211-bd8f-e56cedbce177'::uuid, '/exercises/sentence-doctor/1', 1, 'stage-1', 'Zinnendokter', 'reading', 2, true, false, 5::smallint, NULL),
  ('6b0aa057-4b7c-4fc3-ac0b-0e1c5e7b9a52'::uuid, '/exercises/write-digit/0', 1, 'stage-1', 'Cijfers schrijven', 'writing', 2, false, true, NULL::smallint, NULL),
  ('94730c82-b4a8-4b22-957c-a991ddd8e445'::uuid, '/exercises/comparison/1', 1, 'stage-1', 'Groter of kleiner', 'math', 3, true, false, NULL::smallint, '{"maxNumber": 6}'::jsonb),
  ('7a52b8d4-b38b-4012-a816-10629ac83985'::uuid, '/exercises/picture-word/1', 1, 'stage-1', 'Prent & Woord', 'reading', 3, true, false, 3::smallint, '{"optionCount": 3}'::jsonb),
  ('8772c99f-a126-4130-9747-a821e180da68'::uuid, '/exercises/picture-word/2', 1, 'stage-2', 'Prent & Woord', 'reading', 3, true, false, 3::smallint, '{"optionCount": 3}'::jsonb),
  ('e316c883-80a8-4251-acbf-87ee3f79acab'::uuid, '/exercises/picture-word/3', 1, 'stage-3', 'Prent & Woord', 'reading', 3, true, false, 3::smallint, '{"optionCount": 4}'::jsonb),
  ('6bc5b654-0f82-4396-9251-e1641ade025b'::uuid, '/exercises/dots/1', 1, 'stage-1', 'Stippen tellen', 'math', 4, true, false, NULL::smallint, '{"maxDots": 6, "minDots": 1}'::jsonb),
  ('c0c8b193-7dca-41eb-ac67-3b74b09d8df7'::uuid, '/exercises/sound-house/1', 1, 'stage-1', 'Klankhuis', 'reading', 4, true, false, NULL::smallint, '{"allowedPositions": ["begin", "end"], "poolStage": 1}'::jsonb),
  ('c58f9659-fa44-4b3f-ad6d-3a5f440ff89c'::uuid, '/exercises/sound-house/2', 1, 'stage-2', 'Klankhuis', 'reading', 4, true, false, NULL::smallint, '{"allowedPositions": ["begin", "middle", "end"], "poolStage": 2}'::jsonb),
  ('3b01c4aa-2ba5-46f1-9025-bde07c3c84db'::uuid, '/exercises/sound-house/3', 1, 'stage-3', 'Klankhuis', 'reading', 4, true, false, NULL::smallint, '{"allowedPositions": ["begin", "middle", "end"], "poolStage": 3}'::jsonb),
  ('a4dbfda5-e43a-4d4f-90b4-e8c8fde0c269'::uuid, '/exercises/number-line/1', 1, 'stage-1', 'Getallenlijn', 'math', 5, true, false, NULL::smallint, '{"maxNumber": 6}'::jsonb),
  ('e3e67180-d62d-416e-98fc-84e76c21b3b7'::uuid, '/exercises/money/1', 1, 'stage-1', 'Geld rekenen', 'other', 6, true, false, NULL::smallint, '{"denominations": [1000, 500, 200, 100, 50], "maxPriceCents": 1500}'::jsonb),
  ('86bad7be-3a01-422e-86f5-4dc163679b52'::uuid, '/exercises/clock/1', 1, 'stage-1', 'Klokkijken', 'other', 7, true, false, NULL::smallint, '{"halfHours": false, "quarterHours": false, "wholeHours": true}'::jsonb),
  ('72018bf4-a739-4405-ad85-34b0c78c8786'::uuid, '/exercises/split-box/1', 1, 'stage-1', 'Splitsdoos', 'math', 8, true, false, NULL::smallint, '{"maxTarget": 6, "minTarget": 3}'::jsonb),
  ('70ce1260-bff3-445b-87d1-604c51a0809a'::uuid, '/exercises/subtract-box/1', 1, 'stage-1', 'Aftrekdoos', 'math', 9, true, false, NULL::smallint, '{"maxTotal": 6}'::jsonb),
  ('63a44824-c6b6-4d97-934a-d5a1404b7646'::uuid, '/exercises/subtract-box/2', 1, 'stage-2', 'Aftrekdoos', 'math', 9, true, false, NULL::smallint, '{"maxTotal": 10}'::jsonb),
  ('76c81b1c-c397-4242-a57b-305562ed63b5'::uuid, '/exercises/subtract-box/3', 1, 'stage-3', 'Aftrekdoos', 'math', 9, true, false, NULL::smallint, '{"maxTotal": 20}'::jsonb),
  ('f1a892cd-16a5-4165-acd9-d939c2d5eeeb'::uuid, '/exercises/compare-objects/1', 1, 'stage-1', 'Hoeveel zijn er meer?', 'math', 99, true, false, NULL::smallint, '{"maxObjects": 6, "minObjects": 1}'::jsonb),
  ('471a578b-b087-464d-ba64-76102c1b389b'::uuid, '/exercises/bonds/1', 2, 'stage-1', 'Getallen splitsen', 'math', 2, false, false, NULL::smallint, NULL),
  ('991da5b9-e11a-46a5-a2e2-84bd4059a196'::uuid, '/exercises/bonds/2', 2, 'stage-2', 'Getallen splitsen', 'math', 2, false, false, NULL::smallint, NULL),
  ('25691dd0-8154-478b-b636-dd1efc10fb26'::uuid, '/exercises/bonds/3', 2, 'stage-3', 'Getallen splitsen', 'math', 2, false, false, NULL::smallint, NULL),
  ('0d0639c4-dbc1-4b1e-97bc-462e286dcee2'::uuid, '/exercises/math/1', 3, 'stage-1', 'Sommen maken', 'math', 1, false, false, NULL::smallint, NULL),
  ('674e7054-b8a6-458c-94a2-79d4ae7bf7ba'::uuid, '/exercises/math/2', 3, 'stage-2', 'Sommen maken', 'math', 1, false, false, NULL::smallint, NULL),
  ('74748dc2-deac-4bcd-8d15-c2933f1b3cdf'::uuid, '/exercises/math/3', 3, 'stage-3', 'Sommen maken', 'math', 1, false, false, NULL::smallint, NULL),
  ('286caf82-c1c7-4456-9bc6-9e83287d72e1'::uuid, '/exercises/math/1', 4, 'stage-1', 'Sommen maken', 'math', 1, false, false, NULL::smallint, NULL),
  ('6cbf6df0-c36d-457f-a15f-17986ca1e6b5'::uuid, '/exercises/math/2', 4, 'stage-2', 'Sommen maken', 'math', 1, false, false, NULL::smallint, NULL),
  ('30aa9b00-fdfa-44b7-9388-95ef1f84ca6a'::uuid, '/exercises/math/3', 4, 'stage-3', 'Sommen maken', 'math', 1, false, false, NULL::smallint, NULL)
) AS v(id, route, grade, stage, title, subject, display_order, is_active, admin_only, from_reading_theme, config)
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercises e WHERE e.route = v.route AND e.grade = v.grade
)
AND NOT EXISTS (
  SELECT 1 FROM public.exercises e WHERE e.id = v.id
);
