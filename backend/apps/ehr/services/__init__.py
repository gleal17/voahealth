from .base import (  # noqa: F401
    BaseClinicalWritingService,
    BaseTranscriptionService,
    GeneratedDocumentResult,
    TranscriptionResult,
)


def get_transcription_service() -> BaseTranscriptionService:
    from django.conf import settings

    if settings.USE_STUBS:
        from .stubs import StubTranscriptionService
        return StubTranscriptionService()
    if not getattr(settings, "GEMINI_API_KEY", ""):
        from .stubs import StubTranscriptionService
        return StubTranscriptionService()

    from .transcription import GeminiTranscriptionService
    return GeminiTranscriptionService()


def get_clinical_writing_service() -> BaseClinicalWritingService:
    from django.conf import settings

    if settings.USE_STUBS:
        from .stubs import StubClinicalWritingService
        return StubClinicalWritingService()
    # Prefer Gemini for clinical writing. If no GEMINI_API_KEY is configured,
    # fallback to stubs to avoid runtime errors.
    if not getattr(settings, "GEMINI_API_KEY", ""):
        from .stubs import StubClinicalWritingService
        return StubClinicalWritingService()

    from .clinical_writing import GeminiClinicalWritingService
    return GeminiClinicalWritingService()
