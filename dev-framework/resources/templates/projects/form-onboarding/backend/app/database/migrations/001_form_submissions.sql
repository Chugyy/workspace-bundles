CREATE TABLE IF NOT EXISTS form_submissions (
    submission_id   SERIAL PRIMARY KEY,
    respondent_name VARCHAR(100) NULL,
    respondent_email VARCHAR(255) NULL,
    answers         JSONB NOT NULL,
    score_technique NUMERIC(5,2) NOT NULL,
    score_discipline NUMERIC(5,2) NOT NULL,
    score_autonomie NUMERIC(5,2) NOT NULL,
    score_maturite  NUMERIC(5,2) NOT NULL,
    score_total     NUMERIC(5,2) NOT NULL,
    route           VARCHAR(50) NOT NULL CHECK (route IN ('constructeur', 'stabilisateur', 'performant')),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_route ON form_submissions (route);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON form_submissions (created_at);
CREATE INDEX IF NOT EXISTS idx_form_submissions_score_total ON form_submissions (score_total);
