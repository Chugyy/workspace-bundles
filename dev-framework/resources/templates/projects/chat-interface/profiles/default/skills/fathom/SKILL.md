---
name: fathom
description: Fetch transcripts from Fathom call recordings. Use when the user provides a Fathom URL (fathom.video/share/... or fathom.video/calls/...) or a numeric recording ID and wants to retrieve, analyze, or summarize a call transcript.
---

# Fathom

Retrieve call transcripts from Fathom (fathom.video) via the public API.

## Config

`config.json` (sibling of `scripts/`):
- `api_key` — Fathom API key (`X-Api-Key` header)
- `webhook_secret` — for webhook signature verification
- `base_url` — `https://api.fathom.ai/external/v1`

## Get Transcript

```bash
python scripts/get_transcript.py <url_or_recording_id>

# Supported inputs:
python scripts/get_transcript.py https://fathom.video/share/<token>
python scripts/get_transcript.py https://fathom.video/calls/<id>
python scripts/get_transcript.py 124392814
```

- **stdout** → formatted transcript (`[HH:MM:SS] Speaker: text`)
- **stderr** → includes `TEMP_FILE:/tmp/fathom_<title>_<id>.txt`

## Workflow

1. Run `get_transcript.py` with the URL/ID provided by the user
2. Parse `TEMP_FILE:...` from stderr to get the temp file path
3. Display the transcript to the user
4. Ask: **"Voulez-vous garder cette transcription pour plus tard ?"**
   - **Oui** → keep `/tmp/fathom_*.txt` as-is (or move to a custom path if the user specifies one)
   - **Non** → delete the temp file: `os.remove(temp_path)` or `rm <path>`

## URL Formats

| Format | Example |
|---|---|
| Share link | `https://fathom.video/share/mXQj66pK...` |
| Direct call | `https://fathom.video/calls/577353568` |
| Recording ID | `124392814` |

Share links are resolved by paginating `/meetings?include_transcript=true` and matching `share_url`.

## Notes

- Rate limit: 60 req/min
- API only accesses recordings owned by the key owner or shared to their team
- Transcript is embedded in the meetings list response — no second API call needed
