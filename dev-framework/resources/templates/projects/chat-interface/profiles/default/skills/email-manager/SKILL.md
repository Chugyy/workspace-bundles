---
name: email-manager
description: Manage emails via Gmail API or IMAP/SMTP. Use when the user needs to list, read, search, or send emails. Supports two modes - Gmail (OAuth) for personal Gmail accounts, and IMAP/SMTP for professional email accounts. Always ask for confirmation before sending emails.
---

# Email Manager

Manage emails using Python scripts. Two approaches supported:
1. **Gmail API** - For Gmail accounts (requires OAuth setup)
2. **IMAP/SMTP** - For any email provider (requires credentials)

## Setup

### 1. Configure accounts

Edit `assets/config.json` with your email credentials:

```json
{
  "gmail": {
    "email": "your.email@gmail.com",
    "credentials": "path/to/credentials.json"
  },
  "imap_smtp": {
    "email": "contact@domain.com",
    "imap_host": "imap.provider.com",
    "smtp_host": "smtp.provider.com",
    "password": "your_app_password"
  },
  "user": {
    "name": "Your Name",
    "phone": "+123456789",
    "title": "Your Title",
    "signature": "Your signature template"
  }
}
```

### 2. Gmail OAuth Setup

**If using Gmail API:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable Gmail API
3. Create OAuth 2.0 credentials (Desktop app)
4. Download `credentials.json`
5. First run opens browser for authorization
6. Token saved in `gmail-token.json`

### 3. IMAP/SMTP Setup

**For Gmail via IMAP/SMTP:**
- Enable 2FA on Google Account
- Generate App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
- Use App Password in config

**For other providers:**
- Get IMAP/SMTP host addresses from provider
- Use regular password or app-specific password

### 4. Install dependencies

**Quick Setup (Recommended):**
```bash
./setup.sh
```
This script will:
- Create a `.venv` virtual environment if it doesn't exist
- Install `simplegmail` for Gmail API support

**Manual Setup:**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install simplegmail
```

**IMAP/SMTP:**
No external dependencies (uses built-in Python libraries)

**Usage:**
When using this skill, activate the virtual environment:
```bash
source .venv/bin/activate
```

## Operations

### List Emails

**Gmail:**
```python
from scripts.gmail_client import authenticate, list_emails

gmail = authenticate('credentials.json')
emails = list_emails(gmail, max_results=10, unread_only=True)
```

**IMAP:**
```python
from scripts.imap_smtp_client import list_emails

emails = list_emails(
    host='imap.provider.com',
    email_address='user@domain.com',
    password='password',
    limit=10,
    unread_only=True
)
```

### Read Email

**Gmail:**
```python
email_content = read_email(gmail, message_id='abc123')
```

**IMAP:**
```python
email_content = read_email(
    host='imap.provider.com',
    email_address='user@domain.com',
    password='password',
    email_id='123'
)
```

### Search Emails

**Gmail:**
```python
# Gmail query syntax
results = search_emails(gmail, query='from:user@example.com newer_than:7d')
results = search_emails(gmail, query='has:attachment subject:invoice')
```

**IMAP:**
```python
results = search_emails(
    host='imap.provider.com',
    email_address='user@domain.com',
    password='password',
    sender='user@example.com',
    subject='invoice'
)
```

### Send Email

**Always ask user for confirmation before sending.**

**Gmail:**
```python
success = send_email(
    gmail,
    to='recipient@example.com',
    subject='Subject',
    body='Email body with user signature',
    html=False
)
```

**SMTP:**
```python
success = send_email(
    smtp_host='smtp.provider.com',
    email_address='user@domain.com',
    password='password',
    to='recipient@example.com',
    subject='Subject',
    body='Email body with user signature'
)
```

### Create Draft

**Gmail:**
```python
success = create_draft(
    gmail,
    to='recipient@example.com',
    subject='Subject',
    body='Draft content'
)
```

## Workflow

1. **Understand request** - What does user want to do?
2. **Choose method** - Gmail API or IMAP/SMTP based on account
3. **Load config** - Read credentials from `assets/config.json`
4. **Activate environment** - Use `source .venv/bin/activate` before running Python scripts
5. **Execute operation** - Call appropriate function
6. **Format response** - Present results clearly
7. **For sending** - ALWAYS ask confirmation, include user signature from config

## User Info

Access user information from config for email signatures:
- `config['user']['name']`
- `config['user']['phone']`
- `config['user']['title']`
- `config['user']['signature']`

## Scripts

### `scripts/gmail_client.py`
Functions: `authenticate()`, `list_emails()`, `read_email()`, `send_email()`, `create_draft()`, `search_emails()`

### `scripts/imap_smtp_client.py`
Functions: `list_emails()`, `read_email()`, `send_email()`, `search_emails()`, `connect_imap()`

## Common Gmail Query Patterns

- `from:sender@example.com` - From specific sender
- `to:recipient@example.com` - To specific recipient
- `subject:keyword` - Subject contains keyword
- `newer_than:7d` - Emails from last 7 days
- `older_than:1m` - Emails older than 1 month
- `has:attachment` - Has attachments
- `is:unread` - Unread only
- `is:important` - Important/starred

Combine with spaces: `from:john has:attachment newer_than:2d`
