UPDATE exercises SET route = CASE route
  WHEN '/exercise/1' THEN '/exercises/math/1'
  WHEN '/exercise-lang/1' THEN '/exercises/language/1'
  WHEN '/exercise-write/1' THEN '/exercises/write-number/1'
  WHEN '/exercise-write-letter/1' THEN '/exercises/write-letter/1'
  WHEN '/exercise-sentence-doctor/1' THEN '/exercises/sentence-doctor/1'
  WHEN '/exercise-bonds/1' THEN '/exercises/bonds/1'
  WHEN '/exercise-write-digit/0' THEN '/exercises/write-digit/0'
  WHEN '/exercise-compare/1' THEN '/exercises/comparison/1'
  WHEN '/exercise-dots/1' THEN '/exercises/dots/1'
  WHEN '/exercise-numline/1' THEN '/exercises/number-line/1'
  WHEN '/exercise-money/1' THEN '/exercises/money/1'
  WHEN '/exercise-clock/1' THEN '/exercises/clock/1'
  ELSE route
END;