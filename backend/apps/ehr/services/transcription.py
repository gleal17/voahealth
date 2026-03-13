from __future__ import annotations

import logging

from django.conf import settings
from google import genai
from rest_framework.exceptions import APIException
import tempfile
import os
import mimetypes

from .base import BaseTranscriptionService, TranscriptionResult  # noqa: F401
from .contracts import TranscriptionResponse

logger = logging.getLogger(__name__)


class GeminiNotConfigured(APIException):
    status_code = 503
    default_detail = "Serviço de transcrição não configurado."
    default_code = "gemini_not_configured"


class GeminiUnavailable(APIException):
    status_code = 503
    default_detail = "Serviço de transcrição indisponível."
    default_code = "gemini_unavailable"


class GeminiInvalidResponse(APIException):
    status_code = 502
    default_detail = "Resposta inválida do serviço de transcrição."
    default_code = "gemini_invalid_response"


class GeminiTranscriptionService(BaseTranscriptionService):
    """Transcribes audio files using Gemini."""

    def transcribe_audio(self, audio_file, mime_type: str) -> TranscriptionResult:
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise GeminiNotConfigured()

        model_name = settings.GEMINI_TRANSCRIPTION_MODEL
        client = genai.Client(api_key=api_key)

        tmp_path = None
        try:
            # google-genai client.files.upload expects a path-like object (str/Path).
            # Django's InMemoryUploadedFile is not path-like, so persist to a temp
            # file first. If the uploaded file already has a temporary file path
            # (TemporaryUploadedFile), use it directly.
            if hasattr(audio_file, "temporary_file_path"):
                file_arg = audio_file.temporary_file_path()
            else:
                # create a NamedTemporaryFile and write uploaded chunks
                suffix = mimetypes.guess_extension(mime_type) or ""
                tf = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
                tmp_path = tf.name
                try:
                    for chunk in audio_file.chunks():
                        tf.write(chunk)
                finally:
                    tf.close()
                file_arg = tmp_path

            uploaded = client.files.upload(
                file=file_arg,
                config=genai.types.UploadFileConfig(mime_type=mime_type),
            )

            response = client.models.generate_content(
                model=model_name,
                contents=[
                    genai.types.Content(
                        parts=[
                            genai.types.Part.from_uri(
                                file_uri=uploaded.uri,
                                mime_type=uploaded.mime_type,
                            ),
                            genai.types.Part.from_text(
                                text=(
                                    "Transcreva o áudio acima fielmente em português do Brasil. "
                                    "Retorne somente o texto transcrito, sem formatação adicional."
                                )
                            ),
                        ],
                    ),
                ],
            )
        except GeminiNotConfigured:
            raise
        except Exception as exc:
            logger.exception("Gemini API call failed")
            raise GeminiUnavailable() from exc
        finally:
            # cleanup temporary file if we created one
            try:
                if tmp_path and os.path.exists(tmp_path):
                    os.unlink(tmp_path)
            except Exception:
                logger.debug("Failed to remove temp file %s", tmp_path)

        text = (response.text or "").strip() if response else ""
        if not text:
            raise GeminiInvalidResponse()

        # Validate output contract
        validated = TranscriptionResponse(text=text, provider="gemini", model=model_name)

        return TranscriptionResult(
            text=validated.text, provider=validated.provider, model=validated.model,
        )
