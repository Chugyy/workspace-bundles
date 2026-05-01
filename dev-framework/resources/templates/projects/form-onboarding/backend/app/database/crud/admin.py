#!/usr/bin/env python3
# app/database/crud/admin.py

# q6 stores an array — all other questions store a scalar string/number
_ARRAY_QUESTIONS = {"q6"}


async def get_global_stats_crud(pool) -> dict:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT
                COUNT(*) AS total_submissions,
                ROUND(AVG(score_technique)::numeric, 2) AS avg_technique,
                ROUND(AVG(score_discipline)::numeric, 2) AS avg_discipline,
                ROUND(AVG(score_autonomie)::numeric, 2)  AS avg_autonomie,
                ROUND(AVG(score_maturite)::numeric, 2)   AS avg_maturite,
                ROUND(AVG(score_total)::numeric, 2)      AS avg_total
            FROM form_submissions
            """
        )
        routes = await conn.fetch(
            """
            SELECT
                route                                                   AS answer,
                COUNT(*)                                                AS count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1)     AS percentage
            FROM form_submissions
            GROUP BY route
            ORDER BY count DESC
            """
        )
        return {
            "total_submissions": row["total_submissions"],
            "avg_technique": float(row["avg_technique"] or 0),
            "avg_discipline": float(row["avg_discipline"] or 0),
            "avg_autonomie": float(row["avg_autonomie"] or 0),
            "avg_maturite": float(row["avg_maturite"] or 0),
            "avg_total": float(row["avg_total"] or 0),
            "route_distribution": [
                {
                    "answer": r["answer"],
                    "count": r["count"],
                    "percentage": float(r["percentage"]),
                }
                for r in routes
            ],
        }


async def get_question_stats_crud(pool, question_key: str) -> list[dict]:
    async with pool.acquire() as conn:
        if question_key in _ARRAY_QUESTIONS:
            rows = await conn.fetch(
                f"""
                SELECT
                    value                                                       AS answer,
                    COUNT(*)                                                    AS count,
                    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1)         AS percentage
                FROM form_submissions,
                     jsonb_array_elements_text(answers->'{question_key}') AS value
                GROUP BY value
                ORDER BY count DESC
                """
            )
        else:
            rows = await conn.fetch(
                f"""
                SELECT
                    COALESCE(answers->>'{question_key}', 'N/A')                AS answer,
                    COUNT(*)                                                    AS count,
                    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1)         AS percentage
                FROM form_submissions
                GROUP BY answers->>'{question_key}'
                ORDER BY count DESC
                """
            )
        return [
            {
                "answer": r["answer"],
                "count": r["count"],
                "percentage": float(r["percentage"]),
            }
            for r in rows
        ]
