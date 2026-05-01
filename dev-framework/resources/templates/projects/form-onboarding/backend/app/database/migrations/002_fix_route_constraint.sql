-- Fix route constraint: change intermediaire to stabilisateur
ALTER TABLE form_submissions DROP CONSTRAINT IF EXISTS form_submissions_route_check;
UPDATE form_submissions SET route = 'stabilisateur' WHERE route = 'intermediaire';
ALTER TABLE form_submissions ADD CONSTRAINT form_submissions_route_check
  CHECK (route IN ('constructeur', 'stabilisateur', 'performant'));
