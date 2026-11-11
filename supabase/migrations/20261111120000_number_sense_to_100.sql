-- Nieuwe rekenoefening "Getallen tot 100" voor het 2de leerjaar, naar het
-- klaswerkblad "Blok 3: Getallenkennis". Eén tegel; het kind kiest daarna
-- (in de app) wat het oefent:
--   Honderdveld      op welk getal staat het prentje?
--   Luister          welk getal hoor je?
--   Groepjes van 10  stippen per tien groeperen, dan T en E invullen
--   H T E            staafjes en blokjes in kolommen: welk getal?
--   Kleur het getal  het getal kleuren op het honderdveld, rij per rij
--   Door elkaar
--
-- Alle drie de trimesters tot 100 (config.maxNumber). config.maxDots = het
-- grootste aantal stippen bij "Groepjes van 10" (elk tiental is tien tikken).
--
-- Start in Test (admin_only): alleen admins zien ze tot ze in
-- Admin → Oefeningen op Live gezet wordt.
--
-- Herhaalbaar: een rij die al bestaat wordt bijgewerkt in plaats van verdubbeld.

WITH grade_2(route, stage, title, display_order, config) AS (
  VALUES
    ('/exercises/number-sense/1', 'stage-1', 'Getallen tot 100', 25, '{"maxNumber":100,"maxDots":59}'::jsonb),
    ('/exercises/number-sense/2', 'stage-2', 'Getallen tot 100', 25, '{"maxNumber":100,"maxDots":59}'::jsonb),
    ('/exercises/number-sense/3', 'stage-3', 'Getallen tot 100', 25, '{"maxNumber":100,"maxDots":59}'::jsonb)
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
INSERT INTO public.exercises (route, grade, stage, title, subject, display_order, is_active, config, admin_only)
SELECT g.route, 2, g.stage, g.title, 'math', g.display_order, true, g.config, true
  FROM grade_2 g
 WHERE NOT EXISTS (
   SELECT 1 FROM public.exercises e WHERE e.route = g.route AND e.grade = 2
 );
