from __future__ import annotations

import logging

from django.conf import settings
from google import genai
from rest_framework.exceptions import APIException

from .base import BaseClinicalWritingService, GeneratedDocumentResult  # noqa: F401
from .contracts import ClinicalWritingRequest, ClinicalWritingResponse

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = (
    "Você é um assistente médico especializado em documentação clínica. "
    "Gere documentos clínicos em português do Brasil, com linguagem técnica e objetiva. "
    "Retorne somente o documento solicitado, sem explicações adicionais."
)

TEMPLATE_INSTRUCTIONS = {
    "soap_note": (
        "Gere uma nota SOAP com exatamente estas seções, cada uma em sua própria linha:\n"
        "S: (Subjetivo - queixa principal e história relatada pelo paciente)\n"
        "O: (Objetivo - achados do exame físico e dados clínicos observáveis)\n"
        "A: (Avaliação - hipótese diagnóstica ou diagnóstico)\n"
        "P: (Plano - conduta terapêutica, exames e orientações)"
    ),
    "prescription": (
        "Gere uma prescrição médica estruturada contendo:\n"
        "- Medicações (nome, apresentação e quantidade)\n"
        "- Posologia (dose, via de administração e frequência)\n"
        "- Orientações ao paciente"
    ),
    "referral": (
        "Gere um encaminhamento médico estruturado contendo:\n"
        "- Motivo do encaminhamento\n"
        "- Resumo clínico (história, achados relevantes e conduta atual)\n"
        "- Destino (especialidade ou serviço de destino)"
    ),
}


class GeminiNotConfigured(APIException):
    status_code = 503
    default_detail = "Serviço de escrita clínica não configurado."
    default_code = "gemini_not_configured"


class GeminiUnavailable(APIException):
    status_code = 503
    default_detail = "Serviço de escrita clínica indisponível."
    default_code = "gemini_unavailable"


class GeminiInvalidResponse(APIException):
    status_code = 502
    default_detail = "Resposta inválida do serviço de escrita clínica."
    default_code = "gemini_invalid_response"


def _build_user_input(
    transcription: str,
    template_identifier: str,
    consultation_type: str,
    extra: dict,
) -> str:
    template_instruction = TEMPLATE_INSTRUCTIONS[template_identifier]

    parts = [
        f"Tipo de consulta: {consultation_type}.",
        template_instruction,
    ]

    if extra:
        parts.append(f"Metadados adicionais: {extra}")

    parts.append(f"Transcrição da consulta:\n\n{transcription}")
    parts.append("Gere o documento clínico solicitado baseado na transcrição acima.")

    return "\n\n".join(parts)


def _build_contents(user_input: str):
    return [
        genai.types.Content(
            parts=[
                genai.types.Part.from_text(text=SYSTEM_INSTRUCTION),
                genai.types.Part.from_text(text=user_input),
            ]
        )
    ]


class GeminiClinicalWritingService(BaseClinicalWritingService):
    """Generates clinical documents using Gemini (Google GenAI)."""

    def _get_client(self):
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise GeminiNotConfigured()

        # allow explicit writer model or fallback to the transcription model
        model_name = getattr(settings, "GEMINI_WRITER_MODEL", None) or settings.GEMINI_TRANSCRIPTION_MODEL
        client = genai.Client(api_key=api_key)
        return client, model_name

    def generate_document(
        self,
        transcription: str,
        template_identifier: str,
        consultation_type: str,
        extra: dict,
    ) -> GeneratedDocumentResult:
        # Validate input contract
        ClinicalWritingRequest(
            transcription=transcription,
            template_identifier=template_identifier,
            consultation_type=consultation_type,
            extra=extra,
        )

        client, model_name = self._get_client()
        user_input = _build_user_input(transcription, template_identifier, consultation_type, extra)

        try:
            response = client.models.generate_content(
                model=model_name,
                contents=_build_contents(user_input),
            )
        except GeminiNotConfigured:
            raise
        except Exception as exc:
            logger.exception("Gemini API call failed for clinical writing")
            raise GeminiUnavailable() from exc

        content = (response.text or "").strip() if response else ""
        if not content:
            raise GeminiInvalidResponse()

        # Validate output contract
        validated = ClinicalWritingResponse(content=content, provider="gemini", model=model_name)

        return GeneratedDocumentResult(
            content=validated.content,
            provider=validated.provider,
            model=validated.model,
        )

    def stream_document(
        self,
        transcription: str,
        template_identifier: str,
        consultation_type: str,
        extra: dict,
    ):
        ClinicalWritingRequest(
            transcription=transcription,
            template_identifier=template_identifier,
            consultation_type=consultation_type,
            extra=extra,
        )

        client, model_name = self._get_client()
        user_input = _build_user_input(transcription, template_identifier, consultation_type, extra)

        try:
            stream = client.models.generate_content_stream(
                model=model_name,
                contents=_build_contents(user_input),
            )
            for event in stream:
                # genai streaming events emit .delta or .text depending on SDK
                if hasattr(event, "delta"):
                    yield getattr(event, "delta")
                elif hasattr(event, "text"):
                    yield getattr(event, "text")
        except GeminiNotConfigured:
            raise
        except Exception as exc:
            logger.exception("Gemini API call failed (stream) for clinical writing")
            raise GeminiUnavailable() from exc
