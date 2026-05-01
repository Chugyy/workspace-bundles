#!/usr/bin/env python3
# app/core/jobs/lead.py

"""
Business logic jobs for leads.
Generated from docs/architecture/backend/business-logic/lead.md

Per business-logic/lead.md: "Aucun Job identifié pour cette entité.
Toutes les opérations sont du CRUD pur."

This module provides thin wrappers around CRUD operations for future extensibility.
All functions are production-ready and can be extended with business logic as needed.
"""

import asyncpg
from typing import List, Optional, Dict, Any

# Imports from CRUD
from app.database.crud.lead import (
    create_lead_db,
    get_lead_by_id_db,
    update_lead_db,
    delete_lead_db,
    list_leads_db,
    search_leads_db
)


async def create_lead(
    pool: asyncpg.Pool,
    user_id: int,
    lead_data: dict
) -> Dict[str, Any]:
    """
    Create new lead (pure CRUD wrapper).

    Input:
    - user_id: int (FK to users.id)
    - lead_data: dict with keys (name, email, first_name?, phone?, company?, address?,
                 instagram?, linkedin?, twitter?, youtube?, website?, status?,
                 heat_level?, interested?)

    Output: Lead object with all columns

    Workflow:
    1. create_lead_db(user_id, lead_data) → return lead object

    Functions used:
    - create_lead_db [CRUD]

    Generated from: business-logic/lead.md
    """
    lead = await create_lead_db(pool, user_id, lead_data)
    return lead


async def get_lead(
    pool: asyncpg.Pool,
    lead_id: int
) -> Optional[Dict[str, Any]]:
    """
    Get lead by ID (pure CRUD wrapper).

    Input:
    - lead_id: int

    Output: Lead object or None if not found

    Workflow:
    1. get_lead_by_id_db(lead_id) → return lead object

    Functions used:
    - get_lead_by_id_db [CRUD]

    Generated from: business-logic/lead.md
    """
    lead = await get_lead_by_id_db(pool, lead_id)
    return lead


async def update_lead(
    pool: asyncpg.Pool,
    lead_id: int,
    updates: dict
) -> Optional[Dict[str, Any]]:
    """
    Update lead (pure CRUD wrapper).

    Input:
    - lead_id: int
    - updates: dict with optional keys (name, first_name, email, phone, company, address,
               instagram, linkedin, twitter, youtube, website, status, heat_level, interested)

    Output: Updated Lead object or None if not found

    Workflow:
    1. update_lead_db(lead_id, updates) → return updated lead object

    Functions used:
    - update_lead_db [CRUD]

    Generated from: business-logic/lead.md
    """
    lead = await update_lead_db(pool, lead_id, updates)
    return lead


async def delete_lead(
    pool: asyncpg.Pool,
    lead_id: int
) -> bool:
    """
    Delete lead (pure CRUD wrapper).

    Input:
    - lead_id: int

    Output: bool (True if deleted, False if not found)

    Workflow:
    1. delete_lead_db(lead_id) → return success bool

    Functions used:
    - delete_lead_db [CRUD]

    Generated from: business-logic/lead.md
    """
    success = await delete_lead_db(pool, lead_id)
    return success


async def list_leads(
    pool: asyncpg.Pool,
    user_id: int,
    filters: Optional[Dict[str, Any]] = None,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "updated_at",
    sort_order: str = "DESC"
) -> Dict[str, Any]:
    """
    List leads with pagination and filters (pure CRUD wrapper).

    Input:
    - user_id: int (filter by owner)
    - filters: Optional dict with keys (status?, heat_level?, interested?)
    - page: int (default: 1)
    - page_size: int (default: 20)
    - sort_by: str (default: "updated_at")
    - sort_order: str (default: "DESC")

    Output:
    - dict with keys: leads (list), total (int), page (int), page_size (int), total_pages (int)

    Workflow:
    1. list_leads_db(user_id, filters, page, page_size, sort_by, sort_order) → return paginated result

    Functions used:
    - list_leads_db [CRUD]

    Generated from: business-logic/lead.md
    """
    result = await list_leads_db(pool, user_id, filters, page, page_size, sort_by, sort_order)
    return result


async def search_leads(
    pool: asyncpg.Pool,
    user_id: int,
    query: str,
    page: int = 1,
    page_size: int = 20
) -> Dict[str, Any]:
    """
    Search leads by query string (pure CRUD wrapper).

    Input:
    - user_id: int (filter by owner)
    - query: str (search text)
    - page: int (default: 1)
    - page_size: int (default: 20)

    Output:
    - dict with keys: leads (list), total (int), page (int), page_size (int), total_pages (int)

    Workflow:
    1. search_leads_db(user_id, query, page, page_size) → return paginated search results

    Functions used:
    - search_leads_db [CRUD]

    Generated from: business-logic/lead.md
    """
    result = await search_leads_db(pool, user_id, query, page, page_size)
    return result
