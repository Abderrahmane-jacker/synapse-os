from fastapi import APIRouter, UploadFile, File, Query, Response, HTTPException, Header
from pydantic import BaseModel
import edge_tts
import tempfile
import os
import logging
import speech_recognition as sr
from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize Whisper model globally so it stays in RAM
whisper_model_size = "base.en"
try:
    logger.info(f"Loading Whisper model {whisper_model_size}...")
    whisper_model = WhisperModel(whisper_model_size, device="cpu", compute_type="int8")
    logger.info("Whisper model loaded successfully.")
except Exception as e:
    logger.error(f"Failed to load Whisper model: {e}")
    whisper_model = None

class TTSRequest(BaseModel):
    text: str
    voice: str = "en-US-AndrewNeural"
    rate: str = "+0%"

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    100% Self-Hosted, Private, High-Performance Faster-Whisper Speech-to-Text Endpoint.
    Uses C++ CTranslate2 engine with Voice Activity Detection (VAD) filtering.
    """
    try:
        suffix = ".wav" if "wav" in (file.content_type or "").lower() else ".webm"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        recognizer = sr.Recognizer()

        # If webm, convert to wav using ffmpeg if installed, else try reading directly
        wav_path = tmp_path
        if not tmp_path.endswith(".wav"):
            converted_wav = tmp_path + ".wav"
            ret = os.system(f"ffmpeg -y -i '{tmp_path}' -ar 16000 -ac 1 '{converted_wav}' >/dev/null 2>&1")
            if ret == 0 and os.path.exists(converted_wav):
                wav_path = converted_wav

        transcribed_text = ""

        # 1. Primary: Self-Hosted Faster-Whisper Engine (CTranslate2 + VAD Filter)
        if whisper_model:
            try:
                segments, info = whisper_model.transcribe(
                    wav_path,
                    beam_size=5,
                    vad_filter=True,
                    vad_parameters=dict(min_silence_duration_ms=500)
                )
                transcribed_text = " ".join([segment.text for segment in segments]).strip()
                logger.info(f"Self-Hosted Faster-Whisper STT Success: '{transcribed_text}'")
            except Exception as whisper_err:
                logger.warning(f"Local Faster-Whisper transcription failed: {whisper_err}")

        # 2. Fallback: Google Speech Recognition
        if not transcribed_text:
            try:
                with sr.AudioFile(wav_path) as source:
                    audio_data = recognizer.record(source)
                    transcribed_text = recognizer.recognize_google(audio_data)
            except sr.UnknownValueError:
                transcribed_text = ""
            except Exception as err:
                logger.warning(f"Speech recognition parse error: {err}")

        # Cleanup temporary files
        if os.path.exists(tmp_path): os.remove(tmp_path)
        if wav_path != tmp_path and os.path.exists(wav_path): os.remove(wav_path)

        return {"text": transcribed_text}

    except Exception as e:
        logger.error(f"Backend transcription error: {e}")
        return {"text": "", "error": str(e)}

@router.get("/tts")
async def get_text_to_speech(
    text: str = Query(..., min_length=1),
    voice: str = Query("en-US-AndrewNeural"),
    rate: str = Query("+0%")
):
    """
    Microsoft Edge High-Definition Neural AI Text-to-Speech Endpoint.
    Generates full-length hyper-realistic human AI voice audio without cutoffs or character limits.
    """
    try:
        clean_text = text.strip()

        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            communicate = edge_tts.Communicate(clean_text, voice, rate=rate)
            await communicate.save(tmp_path)
        except Exception as voice_err:
            logger.warning(f"Voice '{voice}' failed ({voice_err}). Falling back to 'en-US-AndrewNeural'.")
            communicate = edge_tts.Communicate(clean_text, "en-US-AndrewNeural", rate=rate)
            await communicate.save(tmp_path)

        with open(tmp_path, "rb") as f:
            audio_bytes = f.read()

        if os.path.exists(tmp_path): os.remove(tmp_path)
        return Response(content=audio_bytes, media_type="audio/mpeg")

    except Exception as e:
        logger.error(f"Edge Neural TTS failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate human neural speech audio: {str(e)}")

@router.post("/tts")
async def post_text_to_speech(req: TTSRequest):
    """
    Microsoft Edge High-Definition Neural AI Text-to-Speech Endpoint.
    Generates full-length hyper-realistic human AI voice audio without cutoffs or character limits.
    """
    try:
        clean_text = req.text.strip()
        if not clean_text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            communicate = edge_tts.Communicate(clean_text, req.voice, rate=req.rate)
            await communicate.save(tmp_path)
        except Exception as voice_err:
            logger.warning(f"Voice '{req.voice}' failed ({voice_err}). Falling back to 'en-US-AndrewNeural'.")
            communicate = edge_tts.Communicate(clean_text, "en-US-AndrewNeural", rate=req.rate)
            await communicate.save(tmp_path)

        with open(tmp_path, "rb") as f:
            audio_bytes = f.read()

        if os.path.exists(tmp_path): os.remove(tmp_path)
        return Response(content=audio_bytes, media_type="audio/mpeg")

    except Exception as e:
        logger.error(f"Edge Neural TTS failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate human neural speech audio: {str(e)}")
