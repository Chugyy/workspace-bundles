---
name: whatsapp-manager
description: Send and receive WhatsApp messages via Unipile API. Use when the user needs to send messages, check conversations, read messages, or start new WhatsApp conversations. Supports text, images, videos, audio, and documents.
---

# WhatsApp Manager

Manage WhatsApp messages using Unipile API integration. Full support for sending/receiving messages, managing conversations, and handling attachments.

## Setup

### 1. Get Unipile credentials

1. Sign up at [Unipile](https://www.unipile.com/)
2. Get your API key from dashboard
3. Connect your WhatsApp account:
   - Create account via API (generates QR code)
   - Scan QR code with WhatsApp mobile app
   - Get account ID after connection

### 2. Configure credentials

Edit `assets/config.json` with your Unipile credentials:

```json
{
  "unipile": {
    "dsn": "https://api1.unipile.com:13111",
    "api_key": "YOUR_UNIPILE_API_KEY",
    "account_id": "YOUR_UNIPILE_ACCOUNT_ID"
  },
  "user": {
    "name": "Your Name",
    "phone": "+33612345678"
  }
}
```

### 3. Install dependencies

**Quick Setup (Recommended):**
```bash
./setup.sh
```

**Manual Setup:**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install httpx
```

## Operations

### Send Text Message

**To existing conversation:**
```python
from scripts.whatsapp_client import UnipileWhatsAppClient
import asyncio
import json

# Load config
with open('assets/config.json') as f:
    config = json.load(f)

# Initialize client
client = UnipileWhatsAppClient(
    dsn=config['unipile']['dsn'],
    api_key=config['unipile']['api_key']
)

# Send message
result = await client.send_text_message(
    chat_id='chat_123',
    text='Hello from Claude!'
)
```

**Start new conversation:**
```python
result = await client.start_new_conversation(
    account_id=config['unipile']['account_id'],
    phone='+33612345678',
    text='Hello! This is a new conversation.'
)
```

### Send Message with Attachments

**Send image:**
```python
result = await client.send_image(
    chat_id='chat_123',
    image_path='/path/to/image.jpg',
    caption='Check this out!'
)
```

**Send video:**
```python
result = await client.send_video(
    chat_id='chat_123',
    video_path='/path/to/video.mp4',
    caption='Video message'
)
```

**Send audio:**
```python
result = await client.send_audio(
    chat_id='chat_123',
    audio_path='/path/to/audio.mp3'
)
```

**Send multiple attachments:**
```python
result = await client.send_message_with_attachments(
    chat_id='chat_123',
    text='Multiple files attached',
    file_paths=[
        '/path/to/document.pdf',
        '/path/to/image.jpg'
    ]
)
```

### List Conversations

```python
chats = await client.get_chats(
    account_id=config['unipile']['account_id']
)

for chat in chats['items']:
    print(f"Chat: {chat['title']} (ID: {chat['id']})")
```

### Read Messages

```python
messages = await client.get_chat_messages(
    chat_id='chat_123',
    limit=50
)

for msg in messages['items']:
    print(f"{msg['timestamp']}: {msg['text']}")
```

### Check if Phone on WhatsApp

```python
try:
    exists = await client.check_phone_exists_on_whatsapp(
        account_id=config['unipile']['account_id'],
        phone='+33612345678'
    )
    print("Phone is on WhatsApp!")
except PhoneNotOnWhatsAppError:
    print("Phone not registered on WhatsApp")
```

## Workflow

1. **Load config** - Read credentials from `assets/config.json`
2. **Activate environment** - Use `source .venv/bin/activate` before running
3. **Initialize client** - Create `UnipileWhatsAppClient` with DSN and API key
4. **Execute operation** - Call appropriate async method
5. **Handle response** - Process results or exceptions
6. **Format output** - Present results clearly to user

## Account Management

### Create new WhatsApp account

```python
# Generate QR code
result = await client.create_account()
print(f"QR Code: {result['qr_code']}")
print(f"Account ID: {result['id']}")

# Poll until connected
status = await client.poll_until_connected(
    account_id=result['id'],
    interval=3,
    max_attempts=60
)
print(f"Connected! Phone: {status['provider_id']}")
```

### Reconnect existing account

```python
result = await client.reconnect_account(account_id='account_123')
print(f"New QR Code: {result['qr_code']}")
```

### Check account status

```python
status = await client.get_account_status(account_id='account_123')
print(f"Status: {status['status']}")  # OK, DISCONNECTED, WAITING_QR_SCAN, etc.
```

## Webhooks

### Create webhook

```python
webhook = await client.create_webhook(
    url='https://your-domain.com/webhook',
    source='messaging'
)
print(f"Webhook ID: {webhook['id']}")
```

### List webhooks

```python
webhooks = await client.list_webhooks()
for wh in webhooks:
    print(f"{wh['id']}: {wh['request_url']}")
```

### Delete webhook

```python
await client.delete_webhook(webhook_id='webhook_123')
```

## Error Handling

```python
from scripts.whatsapp_client import (
    InvalidPhoneNumberError,
    PhoneNotOnWhatsAppError,
    UnauthorizedError,
    AccountDisconnectedError,
    RateLimitError
)

try:
    result = await client.start_new_conversation(...)
except InvalidPhoneNumberError:
    print("Invalid phone number format. Use E.164: +33612345678")
except PhoneNotOnWhatsAppError:
    print("Phone number not registered on WhatsApp")
except UnauthorizedError:
    print("Invalid API key")
except AccountDisconnectedError:
    print("WhatsApp account disconnected. Reconnect needed.")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after} seconds")
```

## Phone Number Format

Always use E.164 format:
- Must start with `+`
- Followed by country code and number
- No spaces, dashes, or other characters

**Examples:**
- Valid: `+33612345678`, `+14155552671`, `+262692593845`
- Invalid: `0612345678`, `+0`, `+33 6 12 34 56 78`

## File Limits

- Max file size: 15 MB per file
- Supported formats:
  - Images: JPG, PNG, GIF, WEBP
  - Videos: MP4, AVI, MOV
  - Audio: OGG, MP3, WAV, AAC
  - Documents: PDF, DOC, DOCX, XLS, XLSX

## Scripts

### `scripts/whatsapp_client.py`

Main client class: `UnipileWhatsAppClient`

**Methods:**
- Account: `create_account()`, `reconnect_account()`, `get_account_status()`, `poll_until_connected()`
- Messaging: `send_text_message()`, `send_message_with_attachments()`, `send_image()`, `send_video()`, `send_audio()`, `start_new_conversation()`
- Chats: `get_chats()`, `get_chat_messages()`
- Verification: `check_phone_exists_on_whatsapp()`
- Webhooks: `create_webhook()`, `list_webhooks()`, `delete_webhook()`

**Exceptions:**
- `UnipileError` - Base exception
- `UnauthorizedError` - Invalid API key
- `AccountDisconnectedError` - Account disconnected
- `NotFoundError` - Resource not found
- `RateLimitError` - Rate limit exceeded
- `InternalServerError` - Server error
- `InvalidPhoneNumberError` - Invalid phone format
- `PhoneNotOnWhatsAppError` - Phone not on WhatsApp
- `UnprocessableEntityError` - 422 error

## Important Notes

- All methods are async - use `await`
- Phone validation is automatic for new conversations
- Client automatically checks if phone is on WhatsApp before messaging
- Webhooks must respond with HTTP 200 within 30 seconds
- Account must be in "OK" status to send messages
