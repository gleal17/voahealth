"""
Backend test suite — PRD 13 + PRD 17.

Covers every mandatory route in the API contract (PRD 06) with
deterministic doubles for external services (Gemini),
plus PRD 17 additions: SSE streaming and Pydantic contracts.
"""

import io
import json
import uuid
from unittest.mock import patch, MagicMock

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.ehr.models import Document, EHR
from apps.ehr.services.base import GeneratedDocumentResult, TranscriptionResult


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _make_ehr(**overrides):
    defaults = {
        "patient_name": "Maria da Silva",
        "consultation_type": "presencial",
        "transcription": "Paciente relata dor de cabeça há 3 dias.",
        "extra": {"specialty": "clinica geral"},
    }
    defaults.update(overrides)
    return EHR.objects.create(**defaults)


def _make_document(ehr, **overrides):
    defaults = {
        "ehr": ehr,
        "template_identifier": "soap_note",
        "content": "S: Dor de cabeça\nO: PA 120/80\nA: Cefaleia\nP: Analgésico",
    }
    defaults.update(overrides)
    return Document.objects.create(**defaults)


def _fake_audio_file(name="audio.mp3", content_type="audio/mpeg"):
    f = io.BytesIO(b"\x00" * 128)
    f.name = name
    f.content_type = content_type
    return f


FAKE_TRANSCRIPTION = TranscriptionResult(
    text="Paciente relata dor de cabeça há 3 dias.",
    provider="gemini",
    model="gemini-2.5-flash",
)

FAKE_DOCUMENT = GeneratedDocumentResult(
    content="S: Dor de cabeça\nO: Exame normal\nA: Cefaleia tensional\nP: Paracetamol 500mg",
    provider="gemini",
    model="gemini-2.5-flash",
)


# ──────────────────────────────────────────────
# EHR CRUD Tests
# ──────────────────────────────────────────────

class EHRCreateTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_create_ehr_success(self):
        payload = {
            "patient_name": "João Souza",
            "consultation_type": "telemedicina",
            "transcription": "Paciente com febre há 2 dias.",
            "extra": {"specialty": "pediatria"},
        }
        resp = self.client.post("/api/ehrs/", payload, format="json")
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["patient_name"], "João Souza")
        self.assertEqual(data["consultation_type"], "telemedicina")
        self.assertIn("id", data)
        self.assertIn("created_at", data)

    def test_create_ehr_missing_patient_name(self):
        resp = self.client.post("/api/ehrs/", {
            "consultation_type": "presencial",
            "transcription": "Texto",
        }, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_create_ehr_invalid_consultation_type(self):
        resp = self.client.post("/api/ehrs/", {
            "patient_name": "Test",
            "consultation_type": "invalido",
            "transcription": "Texto",
        }, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_create_ehr_extra_must_be_object(self):
        resp = self.client.post("/api/ehrs/", {
            "patient_name": "Test",
            "consultation_type": "presencial",
            "transcription": "Texto",
            "extra": "not an object",
        }, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_create_ehr_extra_defaults_to_empty(self):
        resp = self.client.post("/api/ehrs/", {
            "patient_name": "Test",
            "consultation_type": "presencial",
            "transcription": "Texto",
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["extra"], {})


class EHRListTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_list_empty(self):
        resp = self.client.get("/api/ehrs/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["count"], 0)
        self.assertEqual(data["results"], [])

    def test_list_returns_paginated(self):
        for i in range(15):
            _make_ehr(patient_name=f"Patient {i}")
        resp = self.client.get("/api/ehrs/")
        data = resp.json()
        self.assertEqual(data["count"], 15)
        self.assertEqual(len(data["results"]), 10)  # default page_size
        self.assertIsNotNone(data["next"])

    def test_list_custom_page_size(self):
        for i in range(5):
            _make_ehr(patient_name=f"Patient {i}")
        resp = self.client.get("/api/ehrs/?page_size=3")
        data = resp.json()
        self.assertEqual(len(data["results"]), 3)

    def test_list_max_page_size_capped(self):
        for i in range(55):
            _make_ehr(patient_name=f"Patient {i}")
        resp = self.client.get("/api/ehrs/?page_size=100")
        data = resp.json()
        self.assertLessEqual(len(data["results"]), 50)

    def test_list_ordered_by_created_at_desc(self):
        e1 = _make_ehr(patient_name="First")
        e2 = _make_ehr(patient_name="Second")
        resp = self.client.get("/api/ehrs/")
        results = resp.json()["results"]
        self.assertEqual(results[0]["id"], str(e2.pk))
        self.assertEqual(results[1]["id"], str(e1.pk))


class EHRDetailTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_detail_success(self):
        ehr = _make_ehr()
        _make_document(ehr)
        resp = self.client.get(f"/api/ehrs/{ehr.pk}/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["patient_name"], ehr.patient_name)
        self.assertIn("documents", data)
        self.assertEqual(len(data["documents"]), 1)

    def test_detail_empty_documents(self):
        ehr = _make_ehr()
        resp = self.client.get(f"/api/ehrs/{ehr.pk}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["documents"], [])

    def test_detail_not_found(self):
        fake_id = uuid.uuid4()
        resp = self.client.get(f"/api/ehrs/{fake_id}/")
        self.assertEqual(resp.status_code, 404)

    def test_patch_transcription_success(self):
        ehr = _make_ehr()
        resp = self.client.patch(
            f"/api/ehrs/{ehr.pk}/",
            {"transcription": "Paciente refere melhora após medicação."},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        ehr.refresh_from_db()
        self.assertEqual(ehr.transcription, "Paciente refere melhora após medicação.")

    def test_patch_transcription_empty_value(self):
        ehr = _make_ehr()
        resp = self.client.patch(
            f"/api/ehrs/{ehr.pk}/",
            {"transcription": "   "},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_patch_transcription_not_found(self):
        fake_id = uuid.uuid4()
        resp = self.client.patch(
            f"/api/ehrs/{fake_id}/",
            {"transcription": "Atualização"},
            format="json",
        )
        self.assertEqual(resp.status_code, 404)


# ──────────────────────────────────────────────
# Document Tests
# ──────────────────────────────────────────────

class DocumentListTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_list_documents(self):
        ehr = _make_ehr()
        _make_document(ehr, template_identifier="soap_note")
        _make_document(ehr, template_identifier="prescription", content="Rx: Paracetamol")
        resp = self.client.get(f"/api/ehrs/{ehr.pk}/documents/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 2)

    def test_list_documents_ehr_not_found(self):
        fake_id = uuid.uuid4()
        resp = self.client.get(f"/api/ehrs/{fake_id}/documents/")
        self.assertEqual(resp.status_code, 404)


class DocumentEditTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_patch_document_success(self):
        ehr = _make_ehr()
        doc = _make_document(ehr)
        resp = self.client.patch(
            f"/api/ehrs/{ehr.pk}/documents/{doc.pk}/",
            {"content": "Conteúdo revisado pelo médico"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        doc.refresh_from_db()
        self.assertEqual(doc.content, "Conteúdo revisado pelo médico")

    def test_patch_document_empty_content(self):
        ehr = _make_ehr()
        doc = _make_document(ehr)
        resp = self.client.patch(
            f"/api/ehrs/{ehr.pk}/documents/{doc.pk}/",
            {"content": "   "},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_patch_document_ehr_not_found(self):
        ehr = _make_ehr()
        doc = _make_document(ehr)
        fake_ehr_id = uuid.uuid4()
        resp = self.client.patch(
            f"/api/ehrs/{fake_ehr_id}/documents/{doc.pk}/",
            {"content": "Test"},
            format="json",
        )
        self.assertEqual(resp.status_code, 404)

    def test_patch_document_wrong_ehr(self):
        ehr1 = _make_ehr(patient_name="Patient 1")
        ehr2 = _make_ehr(patient_name="Patient 2")
        doc1 = _make_document(ehr1)
        resp = self.client.patch(
            f"/api/ehrs/{ehr2.pk}/documents/{doc1.pk}/",
            {"content": "Should fail"},
            format="json",
        )
        self.assertEqual(resp.status_code, 404)

    def test_patch_document_not_found(self):
        ehr = _make_ehr()
        fake_doc_id = uuid.uuid4()
        resp = self.client.patch(
            f"/api/ehrs/{ehr.pk}/documents/{fake_doc_id}/",
            {"content": "Test"},
            format="json",
        )
        self.assertEqual(resp.status_code, 404)


# ──────────────────────────────────────────────
# Generate Document Tests (fake Gemini)
# ──────────────────────────────────────────────

class GenerateDocumentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.ehr = _make_ehr()

    @patch(
        "apps.ehr.api.views.get_clinical_writing_service",
    )
    def test_generate_soap_note(self, mock_get_service):
        mock_service = mock_get_service.return_value
        mock_service.generate_document.return_value = FAKE_DOCUMENT

        resp = self.client.post(
            f"/api/ehrs/{self.ehr.pk}/generate/",
            {"template_identifier": "soap_note"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["template_identifier"], "soap_note")
        self.assertIn("content", data)
        self.assertEqual(Document.objects.filter(ehr=self.ehr).count(), 1)

    @patch(
        "apps.ehr.api.views.get_clinical_writing_service",
    )
    def test_generate_prescription(self, mock_get_service):
        mock_service = mock_get_service.return_value
        mock_service.generate_document.return_value = FAKE_DOCUMENT

        resp = self.client.post(
            f"/api/ehrs/{self.ehr.pk}/generate/",
            {"template_identifier": "prescription"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["template_identifier"], "prescription")

    @patch(
        "apps.ehr.api.views.get_clinical_writing_service",
    )
    def test_generate_referral(self, mock_get_service):
        mock_service = mock_get_service.return_value
        mock_service.generate_document.return_value = FAKE_DOCUMENT

        resp = self.client.post(
            f"/api/ehrs/{self.ehr.pk}/generate/",
            {"template_identifier": "referral"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["template_identifier"], "referral")

    def test_generate_invalid_template(self):
        resp = self.client.post(
            f"/api/ehrs/{self.ehr.pk}/generate/",
            {"template_identifier": "invalid_template"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_generate_ehr_not_found(self):
        fake_id = uuid.uuid4()
        resp = self.client.post(
            f"/api/ehrs/{fake_id}/generate/",
            {"template_identifier": "soap_note"},
            format="json",
        )
        self.assertEqual(resp.status_code, 404)

    @patch(
        "apps.ehr.api.views.get_clinical_writing_service",
    )
    def test_generate_gemini_unavailable(self, mock_get_service):
        from apps.ehr.services.clinical_writing import GeminiUnavailable
        mock_service = mock_get_service.return_value
        mock_service.generate_document.side_effect = GeminiUnavailable()

        resp = self.client.post(
            f"/api/ehrs/{self.ehr.pk}/generate/",
            {"template_identifier": "soap_note"},
            format="json",
        )
        self.assertEqual(resp.status_code, 503)
        self.assertEqual(resp.json()["code"], "gemini_unavailable")

    @patch(
        "apps.ehr.api.views.get_clinical_writing_service",
    )
    def test_generate_gemini_not_configured(self, mock_get_service):
        from apps.ehr.services.clinical_writing import GeminiNotConfigured
        mock_service = mock_get_service.return_value
        mock_service.generate_document.side_effect = GeminiNotConfigured()

        resp = self.client.post(
            f"/api/ehrs/{self.ehr.pk}/generate/",
            {"template_identifier": "soap_note"},
            format="json",
        )
        self.assertEqual(resp.status_code, 503)
        self.assertEqual(resp.json()["code"], "gemini_not_configured")


# ──────────────────────────────────────────────
# Transcription Tests (fake Gemini)
# ──────────────────────────────────────────────

class TranscriptionTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch(
        "apps.ehr.api.views.get_transcription_service",
    )
    def test_transcribe_audio_success(self, mock_get_service):
        mock_service = mock_get_service.return_value
        mock_service.transcribe_audio.return_value = FAKE_TRANSCRIPTION

        audio = _fake_audio_file()
        resp = self.client.post(
            "/api/transcriptions/",
            {"audio": audio},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["text"], FAKE_TRANSCRIPTION.text)
        self.assertEqual(data["provider"], "gemini")
        self.assertIn("model", data)

    def test_transcribe_no_file(self):
        resp = self.client.post("/api/transcriptions/", {}, format="multipart")
        self.assertEqual(resp.status_code, 400)

    def test_transcribe_unsupported_mime(self):
        f = io.BytesIO(b"not audio")
        f.name = "document.pdf"
        f.content_type = "application/pdf"
        resp = self.client.post(
            "/api/transcriptions/",
            {"audio": f},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 400)

    @patch(
        "apps.ehr.api.views.get_transcription_service",
    )
    def test_transcribe_gemini_unavailable(self, mock_get_service):
        from apps.ehr.services.transcription import GeminiUnavailable
        mock_service = mock_get_service.return_value
        mock_service.transcribe_audio.side_effect = GeminiUnavailable()

        audio = _fake_audio_file()
        resp = self.client.post(
            "/api/transcriptions/",
            {"audio": audio},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 503)
        self.assertEqual(resp.json()["code"], "gemini_unavailable")

    @patch(
        "apps.ehr.api.views.get_transcription_service",
    )
    def test_transcribe_gemini_not_configured(self, mock_get_service):
        from apps.ehr.services.transcription import GeminiNotConfigured
        mock_service = mock_get_service.return_value
        mock_service.transcribe_audio.side_effect = GeminiNotConfigured()

        audio = _fake_audio_file()
        resp = self.client.post(
            "/api/transcriptions/",
            {"audio": audio},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 503)
        self.assertEqual(resp.json()["code"], "gemini_not_configured")


# ──────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────

class HealthCheckTests(TestCase):
    def test_health_check(self):
        resp = self.client.get("/api/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "ok")


# ──────────────────────────────────────────────
# Streaming SSE Tests (PRD 17)
# ──────────────────────────────────────────────

class StreamGenerateDocumentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.ehr = _make_ehr()

    @patch("apps.ehr.api.views.get_clinical_writing_service")
    def test_stream_returns_sse_events(self, mock_get_service):
        """Streaming endpoint yields chunk events then a done event."""
        mock_service = mock_get_service.return_value
        mock_service.stream_document.return_value = iter(["Hello ", "World"])

        resp = self.client.post(
            f"/api/ehrs/{self.ehr.pk}/generate/stream/",
            {"template_identifier": "soap_note"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp["Content-Type"], "text/event-stream")

        events = []
        for line in resp.streaming_content:
            decoded = line.decode() if isinstance(line, bytes) else line
            for part in decoded.strip().split("\n"):
                part = part.strip()
                if part.startswith("data: "):
                    events.append(json.loads(part[len("data: "):]))

        chunks = [e for e in events if e["type"] == "chunk"]
        done = [e for e in events if e["type"] == "done"]

        self.assertEqual(len(chunks), 2)
        self.assertEqual(chunks[0]["content"], "Hello ")
        self.assertEqual(chunks[1]["content"], "World")

        self.assertEqual(len(done), 1)
        doc_id = done[0]["document_id"]
        self.assertTrue(Document.objects.filter(pk=doc_id).exists())
        doc = Document.objects.get(pk=doc_id)
        self.assertEqual(doc.content, "Hello World")
        self.assertEqual(doc.template_identifier, "soap_note")

    @patch("apps.ehr.api.views.get_clinical_writing_service")
    def test_stream_error_yields_error_event(self, mock_get_service):
        """If the service raises during streaming, an error SSE event is emitted."""
        from apps.ehr.services.clinical_writing import GeminiUnavailable

        mock_service = mock_get_service.return_value
        mock_service.stream_document.side_effect = GeminiUnavailable()

        resp = self.client.post(
            f"/api/ehrs/{self.ehr.pk}/generate/stream/",
            {"template_identifier": "soap_note"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)

        events = []
        for line in resp.streaming_content:
            decoded = line.decode() if isinstance(line, bytes) else line
            for part in decoded.strip().split("\n"):
                part = part.strip()
                if part.startswith("data: "):
                    events.append(json.loads(part[len("data: "):]))

        error_events = [e for e in events if e["type"] == "error"]
        self.assertEqual(len(error_events), 1)

    def test_stream_ehr_not_found(self):
        fake_id = uuid.uuid4()
        resp = self.client.post(
            f"/api/ehrs/{fake_id}/generate/stream/",
            {"template_identifier": "soap_note"},
            format="json",
        )
        self.assertEqual(resp.status_code, 404)

    def test_stream_invalid_template(self):
        resp = self.client.post(
            f"/api/ehrs/{self.ehr.pk}/generate/stream/",
            {"template_identifier": "invalid_template"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)


class GeminiClinicalWritingServiceTests(TestCase):
    @override_settings(
        GEMINI_API_KEY="test-key",
        GEMINI_TRANSCRIPTION_MODEL="gemini-2.5-flash",
        GEMINI_WRITER_MODEL="",
    )
    @patch("apps.ehr.services.clinical_writing.genai.Client")
    def test_stream_uses_generate_content_stream(self, mock_client_cls):
        from apps.ehr.services.clinical_writing import GeminiClinicalWritingService

        chunk_one = MagicMock(text="Hello ")
        chunk_two = MagicMock(text="World")

        mock_client = mock_client_cls.return_value
        mock_client.models.generate_content_stream.return_value = iter([chunk_one, chunk_two])

        service = GeminiClinicalWritingService()

        chunks = list(
            service.stream_document(
                transcription="Paciente relata dor.",
                template_identifier="soap_note",
                consultation_type="presencial",
                extra={},
            )
        )

        self.assertEqual(chunks, ["Hello ", "World"])
        mock_client.models.generate_content_stream.assert_called_once()
        mock_client.models.generate_content.assert_not_called()


# ──────────────────────────────────────────────
# Pydantic Contract Tests (PRD 17)
# ──────────────────────────────────────────────

class PydanticContractTests(TestCase):
    """Verify Pydantic models enforce internal integration contracts."""

    def test_clinical_writing_request_valid(self):
        from apps.ehr.services.contracts import ClinicalWritingRequest

        req = ClinicalWritingRequest(
            transcription="Paciente relata dor.",
            template_identifier="soap_note",
            consultation_type="presencial",
            extra={"key": "value"},
        )
        self.assertEqual(req.template_identifier, "soap_note")

    def test_clinical_writing_request_invalid_template(self):
        from pydantic import ValidationError
        from apps.ehr.services.contracts import ClinicalWritingRequest

        with self.assertRaises(ValidationError):
            ClinicalWritingRequest(
                transcription="Paciente relata dor.",
                template_identifier="invalid",
                consultation_type="presencial",
            )

    def test_clinical_writing_request_empty_transcription(self):
        from pydantic import ValidationError
        from apps.ehr.services.contracts import ClinicalWritingRequest

        with self.assertRaises(ValidationError):
            ClinicalWritingRequest(
                transcription="",
                template_identifier="soap_note",
                consultation_type="presencial",
            )

    def test_clinical_writing_request_invalid_consultation_type(self):
        from pydantic import ValidationError
        from apps.ehr.services.contracts import ClinicalWritingRequest

        with self.assertRaises(ValidationError):
            ClinicalWritingRequest(
                transcription="Texto.",
                template_identifier="soap_note",
                consultation_type="online",
            )

    def test_clinical_writing_response_valid(self):
        from apps.ehr.services.contracts import ClinicalWritingResponse

        resp = ClinicalWritingResponse(
            content="S: Dor\nO: Normal\nA: Cefaleia\nP: Analgésico",
            provider="gemini",
            model="gemini-2.5-flash",
        )
        self.assertEqual(resp.provider, "gemini")

    def test_clinical_writing_response_empty_content(self):
        from pydantic import ValidationError
        from apps.ehr.services.contracts import ClinicalWritingResponse

        with self.assertRaises(ValidationError):
            ClinicalWritingResponse(
                content="", provider="gemini", model="gemini-2.5-flash",
            )

    def test_transcription_response_valid(self):
        from apps.ehr.services.contracts import TranscriptionResponse

        resp = TranscriptionResponse(
            text="Paciente diz que...",
            provider="gemini",
            model="gemini-2.5-flash",
        )
        self.assertEqual(resp.text, "Paciente diz que...")

    def test_transcription_response_empty_text(self):
        from pydantic import ValidationError
        from apps.ehr.services.contracts import TranscriptionResponse

        with self.assertRaises(ValidationError):
            TranscriptionResponse(
                text="", provider="gemini", model="gemini-2.5-flash",
            )
