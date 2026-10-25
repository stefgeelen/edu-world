-- Taal in de 3de kleuterklas (grade 0), in test: Rijmen, Beginklank en
-- Klanken plakken. Eén rij per oefening, in trimester 1, zodat ze meteen
-- te kiezen zijn; ze worden niet moeilijker per trimester. Woorden en
-- prentjes in src/data/kleuterTaal.ts. Zie docs/kleuters-3de-kleuterklas.md.
-- Herhaalbaar: een rij die al bestaat wordt bijgewerkt in plaats van verdubbeld.
WITH kleuter(route, title, display_order) AS (
  VALUES
    ('/exercises/rhyme/1', 'Rijmen', 11),
    ('/exercises/first-sound/1', 'Beginklank', 12),
    ('/exercises/blend/1', 'Klanken plakken', 13)
),
updated AS (
  UPDATE public.exercises e
     SET stage = 'stage-1',
         title = k.title,
         subject = 'reading',
         display_order = k.display_order
    FROM kleuter k
   WHERE e.route = k.route
     AND e.grade = 0
  RETURNING e.route
)
INSERT INTO public.exercises (route, grade, stage, title, subject, display_order, is_active, config, admin_only)
SELECT k.route, 0, 'stage-1', k.title, 'reading', k.display_order, true, '{}'::jsonb, true
  FROM kleuter k
 WHERE NOT EXISTS (
   SELECT 1 FROM public.exercises e WHERE e.route = k.route AND e.grade = 0
 );
