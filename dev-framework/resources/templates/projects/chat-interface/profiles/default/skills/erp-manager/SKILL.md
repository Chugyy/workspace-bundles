---
name: erp-manager
description: Manage ERP leads, notes, and contacts via Personal Dashboard API. Use for creating/updating leads, tracking interactions, searching contacts, and managing lead notes.
---

# ERP Manager

Manage your ERP system: leads, contacts, notes, and customer interactions via the Personal Dashboard API.

## Setup

### 1. Configure credentials

Edit `assets/config.json`:

```json
{
  "api_url": "https://dashboard-api.multimodal-house.fr",
  "email": "admin@admin.admin",
  "password": "admin123",
  "user": {
    "name": "Admin"
  }
}
```

### 2. First connection

On first use, authentication happens automatically:
- Logs in with credentials from config
- Receives JWT token from API
- Saves token to `assets/token.json`
- Reuses token for subsequent requests

### 3. No dependencies required

Uses Python's built-in `urllib` library only. No external packages needed.

## Operations

### Authentication

Authentication is handled automatically by `create_client()`.

```python
from scripts.erp_client import create_client

# Creates client with automatic authentication
client = create_client()
```

### Leads Management

#### Create Lead

```python
lead = client.create_lead(
    name="Doe",
    email="john.doe@company.com",
    first_name="John",
    phone="+33612345678",
    company="ACME Corp",
    status="to_contact",
    heat_level="warm",
    interested=True
)
# Returns: {"id": 123}
```

**Required fields:**
- `name` - Last name
- `email` - Email address

**Optional fields:**
- `first_name` - First name
- `phone` - Phone number
- `company` - Company name
- `address` - Address
- `socials` - Social media links
- `status` - Lead status (default: "to_contact")
- `heat_level` - Heat level (default: "cold")
- `interested` - Interest flag (default: True)

**Status values:**
- `to_contact` - Not contacted yet
- `contacted` - Initial contact made
- `no_response` - No response received
- `to_call_back` - Needs callback
- `action_required` - Action required
- `appointment_scheduled` - Meeting scheduled

**Heat level values:**
- `cold` - Low interest
- `warm` - Moderate interest
- `hot` - High interest
- `very_hot` - Very high interest

#### Get Lead

```python
lead = client.get_lead(lead_id=123)
# Returns complete lead object with timestamps
```

#### List Leads

```python
# List all leads (paginated)
result = client.list_leads(page=1, limit=20)
leads = result['leads']
pagination = result['pagination']

# Filter by status
result = client.list_leads(status="to_contact")

# Filter by heat level
result = client.list_leads(heat_level="hot")

# Search leads (fulltext on name, firstName, email, company)
result = client.list_leads(search="ACME")

# Combine filters
result = client.list_leads(
    status="contacted",
    heat_level="hot",
    interested=True,
    sort_by="updated_at",
    order="desc",
    limit=50
)
```

**Query parameters:**
- `page` - Page number (default: 1, min: 1)
- `limit` - Results per page (default: 20, max: 2000)
- `status` - Filter by status
- `heat_level` - Filter by heat level
- `interested` - Filter by interest (True/False)
- `search` - Fulltext search string
- `sort_by` - Sort field: `updated_at`, `created_at`, `name`, `email` (default: `updated_at`)
- `order` - Sort order: `asc` or `desc` (default: `desc`)

#### Update Lead

```python
# Update any field(s)
updated = client.update_lead(
    lead_id=123,
    status="contacted",
    heat_level="hot",
    phone="+33698765432"
)
```

#### Delete Lead

```python
# Deletes lead and all associated notes
result = client.delete_lead(lead_id=123)
# Returns: {"message": "Lead deleted successfully"}
```

#### Search Leads

```python
# Shortcut for fulltext search
results = client.search_leads(
    query="john",
    heat_level="hot"
)
```

### Notes Management

#### Create Note

```python
note = client.create_note(
    lead_id=123,
    title="Follow-up call",
    content="Discussed pricing and timeline. Next steps: send proposal.",
    description="Call summary"
)
# Returns: {"id": 456}
```

#### Get Note

```python
note = client.get_note(note_id=456)
```

#### Update Note

```python
updated = client.update_note(
    note_id=456,
    title="Updated title",
    content="New content"
)
```

#### Delete Note

```python
result = client.delete_note(note_id=456)
```

#### List Lead Notes

```python
# Get all notes for a lead (sorted newest first)
notes = client.list_lead_notes(lead_id=123)

for note in notes:
    print(f"{note['title']}: {note['content']}")
```

### User Profile

```python
# Get user profile (requires user_id from token)
user = client.get_user(user_id=1)
# Returns: {id, email, name, createdAt, updatedAt}
```

## Helper Functions

### Format Lead Summary

```python
from scripts.erp_client import format_lead_summary

lead = client.get_lead(123)
print(format_lead_summary(lead))
```

Output:
```
ID: 123
Name: John Doe
Email: john.doe@company.com
Company: ACME Corp
Phone: +33612345678
Status: contacted
Heat: hot
Interested: Yes
```

### Format Note Summary

```python
from scripts.erp_client import format_note_summary

note = client.get_note(456)
print(format_note_summary(note))
```

## Workflow

1. **Understand request** - What ERP operation is needed?
2. **Create client** - Use `create_client()` for automatic auth
3. **Execute operation** - Call appropriate method
4. **Format response** - Present results clearly to user
5. **Handle errors** - Catch and explain API errors

## Integration Examples

### Create lead from incoming email

```python
from scripts.erp_client import create_client

# Parse email (from email-manager skill)
sender_email = "prospect@company.com"
sender_name = "Jane Smith"
company = "Tech Corp"

# Create lead in ERP
client = create_client()
lead = client.create_lead(
    name=sender_name.split()[-1],
    first_name=sender_name.split()[0],
    email=sender_email,
    company=company,
    status="to_contact",
    heat_level="warm"
)

print(f"Lead created with ID: {lead['id']}")
```

### Find hot leads not contacted

```python
# Search for high-value prospects
result = client.list_leads(
    status="to_contact",
    heat_level="hot",
    interested=True,
    sort_by="created_at",
    order="asc"
)

print(f"Found {len(result['leads'])} hot leads to contact:")
for lead in result['leads']:
    print(f"- {lead['firstName']} {lead['name']} ({lead['email']})")
```

### Update lead after call

```python
# After sales call, update status and add note
client.update_lead(
    lead_id=123,
    status="appointment_scheduled",
    heat_level="very_hot"
)

client.create_note(
    lead_id=123,
    title="Sales call - 2025-02-15",
    content="Very interested in our solution. Scheduled demo for next week.",
    description="Positive call outcome"
)
```

### Notify on hot lead (Telegram integration)

```python
from scripts.erp_client import create_client
from scripts.telegram_client import create_client as create_telegram

# Monitor for very hot leads
erp = create_client()
telegram = create_telegram()

result = erp.list_leads(heat_level="very_hot", limit=10)

for lead in result['leads']:
    telegram.send_notification(
        title="Hot Lead Alert",
        message=f"{lead['firstName']} {lead['name']} from {lead['company']}\n"
                f"Status: {lead['status']}\n"
                f"Email: {lead['email']}",
        emoji="🔥"
    )
```

### Export leads to follow up

```python
# Get all leads requiring action
result = client.list_leads(
    status="action_required",
    sort_by="updated_at",
    order="asc",
    limit=100
)

print("Leads requiring action:\n")
for lead in result['leads']:
    print(f"- [{lead['heatLevel']}] {lead['firstName']} {lead['name']}")
    print(f"  Company: {lead['company']}")
    print(f"  Email: {lead['email']}")

    # Get associated notes
    notes = client.list_lead_notes(lead['id'])
    if notes:
        print(f"  Last note: {notes[0]['title']}")
    print()
```

## Error Handling

```python
try:
    lead = client.get_lead(999)
except Exception as e:
    if "Not found" in str(e):
        print("Lead doesn't exist")
    elif "Unauthorized" in str(e):
        print("Token expired, re-authenticating...")
        # Token will refresh automatically on next request
    else:
        print(f"Error: {e}")
```

**Common errors:**
- `401 Unauthorized` - Invalid/expired token (handled automatically)
- `403 Forbidden` - Resource owned by another user
- `404 Not found` - Lead/note doesn't exist
- `400 Bad request` - Invalid data format
- `409 Conflict` - Duplicate email (on create)

## Scripts Reference

### `scripts/auth_manager.py`

Functions:
- `load_config(config_path)` - Load configuration
- `load_token(token_path)` - Load saved token
- `save_token(token_data, token_path)` - Save token
- `login(email, password, api_url)` - Authenticate user
- `register(email, password, name, api_url)` - Register new user
- `ensure_authenticated()` - Auto-login if needed

### `scripts/erp_client.py`

Class: `ERPClient`

**Lead methods:**
- `create_lead(name, email, **kwargs)`
- `get_lead(lead_id)`
- `list_leads(page, limit, **filters)`
- `update_lead(lead_id, **updates)`
- `delete_lead(lead_id)`
- `search_leads(query, **filters)`

**Note methods:**
- `create_note(lead_id, title, content, description)`
- `get_note(note_id)`
- `update_note(note_id, **updates)`
- `delete_note(note_id)`
- `list_lead_notes(lead_id)`

**User methods:**
- `get_user(user_id)`

**Helper functions:**
- `create_client(config_path)` - Create authenticated client
- `format_lead_summary(lead)` - Format lead for display
- `format_note_summary(note)` - Format note for display

## Tips

- Token is saved and reused automatically
- Pagination: max 2000 items per page
- Search is fulltext across name, firstName, email, company
- All timestamps in ISO format
- Lead ownership enforced by API
- Deleting lead cascades to notes
- Use filters to find specific lead segments
