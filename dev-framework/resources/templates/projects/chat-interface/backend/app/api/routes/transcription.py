# app/api/routes/transcription.py

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.core.services.transcription import transcribe_audio
from app.core.utils.auth import require_auth

router = APIRouter(prefix="/transcribe", tags=["transcription"])


class TranscriptionResponse(BaseModel):
    text: str


@router.post("", response_model=TranscriptionResponse)
async def transcribe(audio: UploadFile = File(...), _: str = Depends(require_auth)):
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be an audio file")

    audio_bytes = await audio.read()
    text = await transcribe_audio(audio_bytes, audio.content_type)
    return TranscriptionResponse(text=text)
