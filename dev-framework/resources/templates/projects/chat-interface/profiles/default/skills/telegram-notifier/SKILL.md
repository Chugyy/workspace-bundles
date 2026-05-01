---
name: telegram-notifier
description: Send notifications, alerts, and messages via Telegram Bot. Use when you need to send real-time notifications to the user (email alerts, task completions, system events, error notifications, status updates). The bot is already configured with token and chat ID.
---

# Telegram Notifier

Send instant notifications and messages to the user via Telegram bot.

## Quick Start

```python
from scripts.telegram_client import create_client

# Create client (loads config automatically)
client = create_client()

# Send notification
client.send_notification(
    title="New Email",
    message="You received an email from john@example.com",
    emoji="📧"
)
```

## Operations

### Send Notification

Formatted notification with title and message:

```python
client.send_notification(
    title="Title",
    message="Message content",
    emoji="🔔"  # Optional, default: 🔔
)
```

**Common use cases:**
- New email received
- Task completed
- Build finished
- Data processing complete

### Send Alert

Alert with severity level (auto-emoji):

```python
# Info alert (ℹ️)
client.send_alert("Process started", level="info")

# Success alert (✅)
client.send_alert("Deploy completed successfully", level="success")

# Warning alert (⚠️)
client.send_alert("High memory usage detected", level="warning")

# Error alert (❌)
client.send_alert("Build failed: syntax error", level="error")
```

### Send Plain Message

Simple text message:

```python
client.send_message("Simple text message")

# With formatting (Markdown or HTML)
client.send_message(
    "*Bold* and _italic_ text",
    parse_mode="Markdown"
)
```

## Configuration

Bot configuration is stored in `assets/config.json`:

```json
{
  "bot_token": "your_bot_token",
  "chat_id": your_chat_id,
  "user": {
    "name": "User Name",
    "first_name": "First",
    "last_name": "Last"
  }
}
```

Configuration is loaded automatically by `create_client()`.

## Integration Examples

### Email notification

```python
from scripts.telegram_client import create_client

def notify_new_email(sender, subject):
    client = create_client()
    client.send_notification(
        title="New Email",
        message=f"From: {sender}\nSubject: {subject}",
        emoji="📧"
    )
```

### Task completion

```python
def notify_task_done(task_name, duration):
    client = create_client()
    client.send_alert(
        f"Task '{task_name}' completed in {duration}s",
        level="success"
    )
```

### Error monitoring

```python
def notify_error(error_type, details):
    client = create_client()
    client.send_alert(
        f"{error_type}: {details}",
        level="error"
    )
```

## Notes

- Uses standard library only (urllib, json) - no dependencies
- All functions use the configured chat_id from config.json
- Supports Markdown and HTML formatting
- Non-blocking - sends and returns immediately
