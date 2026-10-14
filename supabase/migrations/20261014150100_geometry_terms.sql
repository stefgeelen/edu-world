-- Eerste meetkunde-oefening "Lijnen en hoeken" voor het 2de leerjaar, naar
-- het klaswerkblad "Blok 2: Meetkunde": soorten lijnen; punt, rechte en
-- lijnstuk (met hun naam); de delen van een hoek; evenwijdige en (loodrecht)
-- snijdende lijnen.
--
-- Het kind kiest eerst een onderdeel of "door elkaar"; die keuze zit in de
-- app. config.topics = de onderdelen waaruit het kind kan kiezen. Alle drie
-- de trimesters krijgen alles: het werkblad komt vroeg in het schooljaar en
-- daarna blijft het leerstof.
--
-- Herhaalbaar: een rij die al bestaat wordt bijgewerkt in plaats van verdubbeld.

WITH grade_2(route, stage, title, display_order, config) AS (
  VALUES
    ('/exercises/geometry-terms/1', 'stage-1', 'Lijnen en hoeken', 10, '{"topics":["lines","point-line-segment","angles","parallel"]}'::jsonb),
    ('/exercises/geometry-terms/2', 'stage-2', 'Lijnen en hoeken', 10, '{"topics":["lines","point-line-segment","angles","parallel"]}'::jsonb),
    ('/exercises/geometry-terms/3', 'stage-3', 'Lijnen en hoeken', 10, '{"topics":["lines","point-line-segment","angles","parallel"]}'::jsonb)
),
updated AS (
  UPDATE public.exercises e
     SET stage = g.stage,
         title = g.title,
         subject = 'geometry',
         display_order = g.display_order,
         config = g.config,
         is_active = true
    FROM grade_2 g
   WHERE e.route = g.route
     AND e.grade = 2
  RETURNING e.route
)
INSERT INTO public.exercises (route, grade, stage, title, subject, display_order, xp_reward, is_active, config)
SELECT g.route, 2, g.stage, g.title, 'geometry', g.display_order, 20, true, g.config
  FROM grade_2 g
 WHERE NOT EXISTS (
   SELECT 1 FROM public.exercises e WHERE e.route = g.route AND e.grade = 2
 );
