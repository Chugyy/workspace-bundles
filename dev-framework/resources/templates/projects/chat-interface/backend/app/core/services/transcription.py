from io import BytesIO
from openai import AsyncOpenAI
from config.config import settings


async def transcribe_audio(audio_bytes: bytes, mime_type: str) -> str:
    """Send audio bytes to OpenAI Whisper and return the transcription text."""
    ext = _ext_from_mime(mime_type)
    buf = BytesIO(audio_bytes)
    buf.name = f"audio.{ext}"

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.audio.transcriptions.create(
        model="whisper-1",
        file=buf,
    )
    return response.text


def _ext_from_mime(mime_type: str) -> str:
    mapping = {
        "audio/webm": "webm",
        "audio/ogg": "ogg",
        "audio/wav": "wav",
        "audio/mp4": "mp4",
        "audio/mpeg": "mp3",
        "audio/mp3": "mp3",
    }
    return mapping.get(mime_type, "webm")
