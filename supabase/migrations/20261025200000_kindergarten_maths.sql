-- Rekenen in de 3de kleuterklas (grade 0), in test: Hoeveel?, Meer of minder
-- en Cijfer bij aantal. Per trimester één rij; de app leest uit de route
-- hoe ver er geteld wordt (1: tot 5, 2: tot 7, 3: tot 10, zie
-- src/lib/kleuterRekenen.ts). Zie docs/kleuters-3de-kleuterklas.md.
-- Herhaalbaar: een rij die al bestaat wordt bijgewerkt in plaats van verdubbeld.
WITH kleuter(route, stage, title, display_order) AS (
  VALUES
    ('/exercises/how-many/1', 'stage-1', 'Hoeveel?', 1),
    ('/exercises/how-many/2', 'stage-2', 'Hoeveel?', 1),
    ('/exercises/how-many/3', 'stage-3', 'Hoeveel?', 1),
    ('/exercises/more-less/1', 'stage-1', 'Meer of minder', 2),
    ('/exercises/more-less/2', 'stage-2', 'Meer of minder', 2),
    ('/exercises/more-less/3', 'stage-3', 'Meer of minder', 2),
    ('/exercises/number-match/1', 'stage-1', 'Cijfer bij aantal', 3),
    ('/exercises/number-match/2', 'stage-2', 'Cijfer bij aantal', 3),
    ('/exercises/number-match/3', 'stage-3', 'Cijfer bij aantal', 3)
),
updated AS (
  UPDATE public.exercises e
     SET stage = k.stage,
         title = k.title,
         subject = 'math',
         display_order = k.display_order
    FROM kleuter k
   WHERE e.route = k.route
     AND e.grade = 0
  RETURNING e.route
)
INSERT INTO public.exercises (route, grade, stage, title, subject, display_order, is_active, config, admin_only)
SELECT k.route, 0, k.stage, k.title, 'math', k.display_order, true, '{}'::jsonb, true
  FROM kleuter k
 WHERE NOT EXISTS (
   SELECT 1 FROM public.exercises e WHERE e.route = k.route AND e.grade = 0
 );
