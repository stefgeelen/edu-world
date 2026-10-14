-- Nieuwe rekenoefening "Helft en dubbel" voor het 2de leerjaar.
--
-- Het kind kiest eerst wat het oefent (de helft, het dubbel of door elkaar);
-- die keuze zit in de app, niet in de database. Eén rij per trimester:
--   maxNumber = het grootste getal in een vraag of antwoord
--   (dubbel van 1..maxNumber/2, helft van even getallen tot maxNumber).
-- Trimester 1 tot 20, trimester 2 tot 50, trimester 3 tot 100.
--
-- Herhaalbaar: een rij die al bestaat wordt bijgewerkt in plaats van verdubbeld.

WITH grade_2(route, stage, title, display_order, config) AS (
  VALUES
    ('/exercises/half-double/1', 'stage-1', 'Helft en dubbel', 55, '{"maxNumber":20}'::jsonb),
    ('/exercises/half-double/2', 'stage-2', 'Helft en dubbel', 55, '{"maxNumber":50}'::jsonb),
    ('/exercises/half-double/3', 'stage-3', 'Helft en dubbel', 55, '{"maxNumber":100}'::jsonb)
),
updated AS (
  UPDATE public.exercises e
     SET stage = g.stage,
         title = g.title,
         subject = 'math',
         display_order = g.display_order,
         config = g.config,
         is_active = true
    FROM grade_2 g
   WHERE e.route = g.route
     AND e.grade = 2
  RETURNING e.route
)
INSERT INTO public.exercises (route, grade, stage, title, subject, display_order, xp_reward, is_active, config)
SELECT g.route, 2, g.stage, g.title, 'math', g.display_order, 20, true, g.config
  FROM grade_2 g
 WHERE NOT EXISTS (
   SELECT 1 FROM public.exercises e WHERE e.route = g.route AND e.grade = 2
 );
