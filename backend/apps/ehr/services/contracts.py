"""
Pydantic models for internal validation of provider integration contracts.

These models validate data flowing between our service layer and external
LLM providers (Gemini). They do NOT replace DRF serializers for
the public API - they reinforce correctness at the integration boundary.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ──────────────────────────────────────────────
# Clinical-writing provider contracts
# ──────────────────────────────────────────────

class ClinicalWritingRequest(BaseModel):
    """Validates input before calling any clinical-writing provider."""

    transcription: str = Field(min_length=1)
    template_identifier: str = Field(pattern=r"^(soap_note|prescription|referral)$")
    consultation_type: str = Field(pattern=r"^(presencial|telemedicina)$")
    extra: dict = Field(default_factory=dict)


class ClinicalWritingResponse(BaseModel):
    """Validates output coming back from a clinical-writing provider."""

    content: str = Field(min_length=1)
    provider: str
    model: str


# ──────────────────────────────────────────────
# Transcription provider contracts
# ──────────────────────────────────────────────

class TranscriptionResponse(BaseModel):
    """Validates output coming back from a transcription provider."""

    text: str = Field(min_length=1)
    provider: str
    model: str
