import json


def _parse_row(row) -> dict:
    d = dict(row)
    if "answers" in d and isinstance(d["answers"], str):
        d["answers"] = json.loads(d["answers"])
    return d


async def create_form_submission_crud(
    pool,
    *,
    answers: dict,
    score_technique: float,
    score_discipline: float,
    score_autonomie: float,
    score_maturite: float,
    score_total: float,
    route: str,
    respondent_name: str | None = None,
    respondent_email: str | None = None,
) -> dict:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO form_submissions
                (answers, score_technique, score_discipline, score_autonomie,
                 score_maturite, score_total, route, respondent_name, respondent_email)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
            """,
            json.dumps(answers),
            score_technique,
            score_discipline,
            score_autonomie,
            score_maturite,
            score_total,
            route,
            respondent_name,
            respondent_email,
        )
        return _parse_row(row)


async def get_form_submission_by_id_crud(pool, submission_id: int) -> dict | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM form_submissions WHERE submission_id = $1",
            submission_id,
        )
        return _parse_row(row) if row else None


async def list_form_submissions_crud(
    pool, limit: int = 20, offset: int = 0
) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM form_submissions ORDER BY created_at DESC LIMIT $1 OFFSET $2",
            limit,
            offset,
        )
        return [_parse_row(row) for row in rows]
