# crud/__init__.py - CRUD Operations Package
# This directory contains entity-specific CRUD modules

from .users import (
    create_user_db,
    get_user_by_id_db,
    get_user_by_email_db,
    list_users_db,
    count_users_db,
    update_user_db,
    delete_user_db,
)

from .lead import (
    create_lead_db,
    get_lead_by_id_db,
    get_lead_by_email_db,
    get_leads_by_user_db,
    get_leads_by_status_db,
    get_leads_by_heat_level_db,
    list_leads_db,
    update_lead_db,
    delete_lead_db,
    bulk_create_leads_db,
    bulk_delete_leads_db,
    count_leads_by_user_db,
)

from .event import (
    create_event_db,
    get_event_by_id_db,
    list_events_db,
    list_upcoming_events_db,
    update_event_db,
    delete_event_db,
)

from .task import (
    create_task_db,
    get_task_by_id_db,
    list_tasks_db,
    count_overdue_tasks_db,
    update_task_db,
    delete_task_db,
)

from .note import (
    create_note_db,
    get_note_by_id_db,
    get_notes_by_lead_db,
    list_notes_db,
    update_note_db,
    delete_note_db,
    delete_notes_by_lead_db,
    bulk_create_notes_db,
    bulk_delete_notes_db,
    count_notes_by_lead_db,
)

__all__ = [
    # Events
    "create_event_db",
    "get_event_by_id_db",
    "list_events_db",
    "list_upcoming_events_db",
    "update_event_db",
    "delete_event_db",
    # Tasks
    "create_task_db",
    "get_task_by_id_db",
    "list_tasks_db",
    "count_overdue_tasks_db",
    "update_task_db",
    "delete_task_db",
    # Users
    "create_user_db",
    "get_user_by_id_db",
    "get_user_by_email_db",
    "list_users_db",
    "count_users_db",
    "update_user_db",
    "delete_user_db",
    # Leads
    "create_lead_db",
    "get_lead_by_id_db",
    "get_lead_by_email_db",
    "get_leads_by_user_db",
    "get_leads_by_status_db",
    "get_leads_by_heat_level_db",
    "list_leads_db",
    "update_lead_db",
    "delete_lead_db",
    "bulk_create_leads_db",
    "bulk_delete_leads_db",
    "count_leads_by_user_db",
    # Notes
    "create_note_db",
    "get_note_by_id_db",
    "get_notes_by_lead_db",
    "list_notes_db",
    "update_note_db",
    "delete_note_db",
    "delete_notes_by_lead_db",
    "bulk_create_notes_db",
    "bulk_delete_notes_db",
    "count_notes_by_lead_db",
]
