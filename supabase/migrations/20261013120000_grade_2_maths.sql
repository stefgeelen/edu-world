-- Rekenoefeningen voor het 2de leerjaar (wayfinder/second-grade/map.md).
--
-- Eén rij per oefening en trimester (stage-1 = sep-dec, stage-2 = jan-mrt,
-- stage-3 = apr-aug), met dezelfde route als in het 1ste leerjaar: de app
-- kiest de rij op route + leerjaar van het kind. Een type zonder rij voor
-- een later trimester blijft op zijn laatste rij staan (Vergelijken).
--
-- Kinderen zien dit pas wanneer ze in het 2de leerjaar zitten; dat kan nog
-- niet zolang MAX_SUPPORTED_GRADE = 1 (stap 4 van de map).
--
-- Herhaalbaar: een rij die al bestaat (bv. aangemaakt via het adminpaneel)
-- wordt bijgewerkt in plaats van verdubbeld.

WITH grade_2(route, stage, title, display_order, config) AS (
  VALUES
    -- Trimester 1: herhaling tot 20 met brug, getallen tot 100, even/oneven, geld tot €20
    ('/exercises/math/1',        'stage-1', 'Sommen tot 20',              10, '{"operators":["+","-"],"maxNumber":20,"allowNegative":false,"bridge":"with"}'::jsonb),
    ('/exercises/sum-split/1',   'stage-1', 'Splitsen over 10',           20, '{"minSum":11,"maxSum":18}'::jsonb),
    ('/exercises/number-line/1', 'stage-1', 'Getallenlijn tot 100',       30, '{"maxNumber":100,"steps":[10]}'::jsonb),
    ('/exercises/comparison/1',  'stage-1', 'Vergelijken tot 100',        40, '{"maxNumber":99}'::jsonb),
    ('/exercises/even-odd/1',    'stage-1', 'Even of oneven',             50, '{"maxNumber":20,"kinds":["even-odd"]}'::jsonb),
    ('/exercises/money/1',       'stage-1', 'Betalen tot €20',            60, '{"denominations":[1000,500,200,100,50,20,10],"maxPriceCents":2000}'::jsonb),

    -- Trimester 2: tot 100 zonder brug, even/oneven + dubbel/helft, geld tot €50
    ('/exercises/math/2',        'stage-2', 'Sommen tot 100',             10, '{"operators":["+","-"],"maxNumber":100,"allowNegative":false,"bridge":"without"}'::jsonb),
    ('/exercises/number-line/2', 'stage-2', 'Getallenlijn tot 100',       30, '{"maxNumber":100,"steps":[1],"length":11}'::jsonb),
    ('/exercises/even-odd/2',    'stage-2', 'Even, dubbel en helft',      50, '{"maxNumber":100,"kinds":["even-odd","double","half"]}'::jsonb),
    ('/exercises/money/2',       'stage-2', 'Betalen tot €50',            60, '{"denominations":[2000,1000,500,200,100,50],"maxPriceCents":5000}'::jsonb),

    -- Trimester 3: tot 100 met brug, tellen met sprongen, geld tot €100
    ('/exercises/math/3',        'stage-3', 'Sommen over het tiental',    10, '{"operators":["+","-"],"maxNumber":100,"allowNegative":false,"bridge":"with"}'::jsonb),
    ('/exercises/sum-split/3',   'stage-3', 'Splitsen over het tiental',  20, '{"minSum":21,"maxSum":99}'::jsonb),
    ('/exercises/number-line/3', 'stage-3', 'Sprongen op de getallenlijn',30, '{"maxNumber":100,"steps":[2,5,10],"length":11}'::jsonb),
    ('/exercises/money/3',       'stage-3', 'Betalen tot €100',           60, '{"denominations":[5000,2000,1000,500,200,100],"maxPriceCents":10000}'::jsonb)
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
