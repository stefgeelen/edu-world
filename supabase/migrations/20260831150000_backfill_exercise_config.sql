-- Backfill exercises.config for existing grade-1 rows with the literal
-- values transcribed from src/data/difficultyConfig.ts's "1-N" entries.
-- Placeholder "2-N" values are intentionally NOT backfilled here — grade 2+
-- rows are provisioned fresh via the admin panel once reviewed.
-- An UPDATE that matches no row is a harmless no-op, so this is safe even
-- if a route/grade combination below doesn't exist yet.

-- Math sums (exercises/math)
UPDATE public.exercises SET config = '{"operators":["+","-"],"maxNumber":6,"allowNegative":false}'::jsonb WHERE route = '/exercises/math/1' AND grade = 1;
UPDATE public.exercises SET config = '{"operators":["+","-"],"maxNumber":10,"allowNegative":false}'::jsonb WHERE route = '/exercises/math/2' AND grade = 1;
UPDATE public.exercises SET config = '{"operators":["+","-"],"maxNumber":20,"allowNegative":false}'::jsonb WHERE route = '/exercises/math/3' AND grade = 1;

-- Number bonds (exercises/bonds)
UPDATE public.exercises SET config = '{"minTarget":3,"maxTarget":6}'::jsonb WHERE route = '/exercises/bonds/1' AND grade = 1;
UPDATE public.exercises SET config = '{"minTarget":5,"maxTarget":10}'::jsonb WHERE route = '/exercises/bonds/2' AND grade = 1;
UPDATE public.exercises SET config = '{"minTarget":8,"maxTarget":20}'::jsonb WHERE route = '/exercises/bonds/3' AND grade = 1;

-- Comparison (exercises/comparison)
UPDATE public.exercises SET config = '{"maxNumber":6}'::jsonb WHERE route = '/exercises/comparison/1' AND grade = 1;
UPDATE public.exercises SET config = '{"maxNumber":10}'::jsonb WHERE route = '/exercises/comparison/2' AND grade = 1;
UPDATE public.exercises SET config = '{"maxNumber":20}'::jsonb WHERE route = '/exercises/comparison/3' AND grade = 1;

-- Dot count (exercises/dots)
UPDATE public.exercises SET config = '{"minDots":1,"maxDots":6}'::jsonb WHERE route = '/exercises/dots/1' AND grade = 1;
UPDATE public.exercises SET config = '{"minDots":1,"maxDots":10}'::jsonb WHERE route = '/exercises/dots/2' AND grade = 1;
UPDATE public.exercises SET config = '{"minDots":1,"maxDots":20}'::jsonb WHERE route = '/exercises/dots/3' AND grade = 1;

-- Compare objects (exercises/compare-objects)
UPDATE public.exercises SET config = '{"minObjects":1,"maxObjects":6}'::jsonb WHERE route = '/exercises/compare-objects/1' AND grade = 1;
UPDATE public.exercises SET config = '{"minObjects":1,"maxObjects":10}'::jsonb WHERE route = '/exercises/compare-objects/2' AND grade = 1;
UPDATE public.exercises SET config = '{"minObjects":2,"maxObjects":20}'::jsonb WHERE route = '/exercises/compare-objects/3' AND grade = 1;

-- Subtract box (exercises/subtract-box)
UPDATE public.exercises SET config = '{"maxTotal":6}'::jsonb WHERE route = '/exercises/subtract-box/1' AND grade = 1;
UPDATE public.exercises SET config = '{"maxTotal":10}'::jsonb WHERE route = '/exercises/subtract-box/2' AND grade = 1;
UPDATE public.exercises SET config = '{"maxTotal":20}'::jsonb WHERE route = '/exercises/subtract-box/3' AND grade = 1;

-- Split box (exercises/split-box)
UPDATE public.exercises SET config = '{"minTarget":3,"maxTarget":6}'::jsonb WHERE route = '/exercises/split-box/1' AND grade = 1;
UPDATE public.exercises SET config = '{"minTarget":5,"maxTarget":10}'::jsonb WHERE route = '/exercises/split-box/2' AND grade = 1;
UPDATE public.exercises SET config = '{"minTarget":8,"maxTarget":20}'::jsonb WHERE route = '/exercises/split-box/3' AND grade = 1;

-- Sound house (exercises/sound-house)
UPDATE public.exercises SET config = '{"allowedPositions":["begin","end"],"poolStage":1}'::jsonb WHERE route = '/exercises/sound-house/1' AND grade = 1;
UPDATE public.exercises SET config = '{"allowedPositions":["begin","middle","end"],"poolStage":2}'::jsonb WHERE route = '/exercises/sound-house/2' AND grade = 1;
UPDATE public.exercises SET config = '{"allowedPositions":["begin","middle","end"],"poolStage":3}'::jsonb WHERE route = '/exercises/sound-house/3' AND grade = 1;

-- Money (exercises/money)
UPDATE public.exercises SET config = '{"denominations":[1000,500,200,100,50],"maxPriceCents":1500}'::jsonb WHERE route = '/exercises/money/1' AND grade = 1;
UPDATE public.exercises SET config = '{"denominations":[1000,500,200,100,50,20,10,5],"maxPriceCents":2500}'::jsonb WHERE route = '/exercises/money/2' AND grade = 1;
UPDATE public.exercises SET config = '{"denominations":[5000,2000,1000,500,200,100,50,20,10,5],"maxPriceCents":6000}'::jsonb WHERE route = '/exercises/money/3' AND grade = 1;

-- Clock (exercises/clock)
UPDATE public.exercises SET config = '{"wholeHours":true,"halfHours":false,"quarterHours":false}'::jsonb WHERE route = '/exercises/clock/1' AND grade = 1;
UPDATE public.exercises SET config = '{"wholeHours":true,"halfHours":true,"quarterHours":false}'::jsonb WHERE route = '/exercises/clock/2' AND grade = 1;
UPDATE public.exercises SET config = '{"wholeHours":true,"halfHours":true,"quarterHours":false}'::jsonb WHERE route = '/exercises/clock/3' AND grade = 1;

-- Picture word (exercises/picture-word)
UPDATE public.exercises SET config = '{"optionCount":3}'::jsonb WHERE route = '/exercises/picture-word/1' AND grade = 1;
UPDATE public.exercises SET config = '{"optionCount":3}'::jsonb WHERE route = '/exercises/picture-word/2' AND grade = 1;
UPDATE public.exercises SET config = '{"optionCount":4}'::jsonb WHERE route = '/exercises/picture-word/3' AND grade = 1;

-- Number line (exercises/number-line)
UPDATE public.exercises SET config = '{"maxNumber":6}'::jsonb WHERE route = '/exercises/number-line/1' AND grade = 1;
UPDATE public.exercises SET config = '{"maxNumber":10}'::jsonb WHERE route = '/exercises/number-line/2' AND grade = 1;
UPDATE public.exercises SET config = '{"maxNumber":20}'::jsonb WHERE route = '/exercises/number-line/3' AND grade = 1;

-- Sum split (exercises/sum-split) — only stage 3 exists at grade 1
UPDATE public.exercises SET config = '{"minSum":11,"maxSum":18}'::jsonb WHERE route = '/exercises/sum-split/3' AND grade = 1;
