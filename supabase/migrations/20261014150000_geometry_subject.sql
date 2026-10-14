-- Nieuw vak "Meetkunde". Apart bestand: een nieuwe enum-waarde mag pas
-- gebruikt worden nadat ze vastgelegd is (zie 20261014150100_geometry_terms.sql).
ALTER TYPE public.subject_type ADD VALUE IF NOT EXISTS 'geometry';
