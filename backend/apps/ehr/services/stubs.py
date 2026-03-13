"""
Stub services for local development / demo without real API keys.

Activated via USE_STUBS=true in .env.
"""

from __future__ import annotations

from .base import (
    BaseClinicalWritingService,
    BaseTranscriptionService,
    GeneratedDocumentResult,
    TranscriptionResult,
)

STUB_SOAP = (
    "S: Paciente do sexo feminino, 45 anos, relata cefaleia intensa há 3 dias, "
    "com piora ao acordar. Nega febre. Uso esporádico de paracetamol sem melhora.\n"
    "O: PA 130/85 mmHg, FC 78 bpm. Sem sinais de irritação meníngea.\n"
    "A: Cefaleia tensional\n"
    "P: Ibuprofeno 400 mg VO 8/8h por 5 dias. Retorno em 7 dias se persistir."
)

STUB_PRESCRIPTION = (
    "PRESCRIÇÃO MÉDICA\n\n"
    "1. Ibuprofeno 400 mg — 1 comprimido VO 8/8h por 5 dias\n"
    "2. Dipirona 500 mg — 1 comprimido VO 6/6h se dor (SOS)\n\n"
    "Orientações: manter hidratação, evitar automedicação e retornar se piora."
)

STUB_REFERRAL = (
    "ENCAMINHAMENTO MÉDICO\n\n"
    "Motivo: Cefaleia tensional recorrente, sem melhora com analgésicos comuns.\n"
    "Resumo clínico: Paciente feminina, 45a, episódios de cefaleia há 3 dias. "
    "PA 130/85, sem sinais focais. Uso de paracetamol sem resposta.\n"
    "Destino: Neurologia — investigação complementar e conduta especializada."
)

STUB_TEMPLATES = {
    "soap_note": STUB_SOAP,
    "prescription": STUB_PRESCRIPTION,
    "referral": STUB_REFERRAL,
}


class StubClinicalWritingService(BaseClinicalWritingService):
    """Returns hardcoded clinical documents for demo purposes."""

    def generate_document(
        self,
        transcription: str,
        template_identifier: str,
        consultation_type: str,
        extra: dict,
    ) -> GeneratedDocumentResult:
        content = STUB_TEMPLATES.get(template_identifier, STUB_SOAP)
        return GeneratedDocumentResult(
            content=content,
            provider="stub",
            model="stub-v1",
        )

    def stream_document(
        self,
        transcription: str,
        template_identifier: str,
        consultation_type: str,
        extra: dict,
    ):
        content = STUB_TEMPLATES.get(template_identifier, STUB_SOAP)
        # Simulate streaming by yielding small chunks
        words = content.split(" ")
        chunk: list[str] = []
        for w in words:
            chunk.append(w)
            if len(chunk) >= 4:
                yield " ".join(chunk) + " "
                chunk = []
        if chunk:
            yield " ".join(chunk)


class StubTranscriptionService(BaseTranscriptionService):
    """Returns a hardcoded transcription for demo purposes."""

    def transcribe_audio(self, audio_file, mime_type: str) -> TranscriptionResult:
        return TranscriptionResult(
            text=(
                "Paciente do sexo feminino, 45 anos, comparece à consulta relatando "
                "dor de cabeça intensa há 3 dias, com piora ao acordar. Nega febre. "
                "Refere uso esporádico de paracetamol sem melhora significativa. (texto do stub)"
            ),
            provider="stub",
            model="stub-v1",
        )
