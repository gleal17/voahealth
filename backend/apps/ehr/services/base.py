from __future__ import annotations

import abc
from dataclasses import dataclass


@dataclass(frozen=True)
class TranscriptionResult:
    text: str
    provider: str
    model: str


class BaseTranscriptionService(abc.ABC):
    """Contract that every transcription provider must implement."""

    @abc.abstractmethod
    def transcribe_audio(self, audio_file, mime_type: str) -> TranscriptionResult:
        ...


@dataclass(frozen=True)
class GeneratedDocumentResult:
    content: str
    provider: str
    model: str


class BaseClinicalWritingService(abc.ABC):
    """Contract that every clinical-writing provider must implement."""

    @abc.abstractmethod
    def generate_document(
        self,
        transcription: str,
        template_identifier: str,
        consultation_type: str,
        extra: dict,
    ) -> GeneratedDocumentResult:
        ...
