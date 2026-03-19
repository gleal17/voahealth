import json

from django.http import StreamingHttpResponse
from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ehr.models import Document, EHR
from apps.ehr.services import get_clinical_writing_service, get_transcription_service

from .pagination import EHRPagination
from .serializers import (
    DocumentContentSerializer,
    DocumentSerializer,
    EHRCreateSerializer,
    EHRDetailSerializer,
    EHRListSerializer,
    EHRTranscriptionSerializer,
    GenerateDocumentSerializer,
    TranscriptionUploadSerializer,
)


def _get_ehr_or_404(ehr_pk):
    try:
        return EHR.objects.get(pk=ehr_pk)
    except EHR.DoesNotExist:
        raise NotFound("EHR não encontrado.")


class EHRListCreateView(generics.ListCreateAPIView):
    queryset = EHR.objects.all()
    pagination_class = EHRPagination

    def get_serializer_class(self):
        if self.request.method == "POST":
            return EHRCreateSerializer
        return EHRListSerializer


class EHRDetailView(generics.RetrieveUpdateAPIView):
    queryset = EHR.objects.prefetch_related("documents")
    lookup_field = "pk"
    http_method_names = ["get", "patch"]

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return EHRTranscriptionSerializer
        return EHRDetailSerializer


class DocumentListView(generics.ListAPIView):
    serializer_class = DocumentSerializer
    pagination_class = None  # flat list per PRD 06

    def get_queryset(self):
        _get_ehr_or_404(self.kwargs["ehr_pk"])
        return Document.objects.filter(ehr_id=self.kwargs["ehr_pk"])


class DocumentPartialUpdateView(generics.UpdateAPIView):
    serializer_class = DocumentContentSerializer
    http_method_names = ["patch"]

    def get_queryset(self):
        return Document.objects.filter(ehr_id=self.kwargs["ehr_pk"])

    def get_object(self):
        _get_ehr_or_404(self.kwargs["ehr_pk"])
        try:
            return self.get_queryset().get(pk=self.kwargs["doc_pk"])
        except Document.DoesNotExist:
            raise NotFound(
                "Documento não encontrado ou não pertence ao EHR informado.",
            )


class GenerateDocumentView(APIView):
    """POST /api/ehrs/{id}/generate/ - generates a clinical document."""

    def post(self, request, ehr_pk):
        serializer = GenerateDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ehr = _get_ehr_or_404(ehr_pk)

        template_id = serializer.validated_data["template_identifier"]
        service = get_clinical_writing_service()
        result = service.generate_document(
            transcription=ehr.transcription,
            template_identifier=template_id,
            consultation_type=ehr.consultation_type,
            extra=ehr.extra,
        )

        document = Document.objects.create(
            ehr=ehr,
            template_identifier=template_id,
            content=result.content,
        )

        return Response(
            DocumentSerializer(document).data,
            status=status.HTTP_201_CREATED,
        )


class TranscriptionView(APIView):
    """POST /api/transcriptions/ - transcribes audio via Gemini."""

    parser_classes = [MultiPartParser]

    def post(self, request):
        serializer = TranscriptionUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        audio_file = serializer.validated_data["audio"]
        mime_type = audio_file.content_type

        service = get_transcription_service()
        result = service.transcribe_audio(audio_file, mime_type)

        return Response(
            {"text": result.text, "provider": result.provider, "model": result.model},
            status=status.HTTP_200_OK,
        )


class SSERenderer:
    media_type = "text/event-stream"
    format = "sse"
    charset = "utf-8"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


class StreamGenerateDocumentView(APIView):
    """POST /api/ehrs/{id}/generate/stream/ - SSE streaming document generation.

    Optional bonus endpoint. The standard POST /generate/ remains the
    primary (non-streaming) interface.  This endpoint streams the content
    as Server-Sent Events so the frontend can render tokens incrementally.
    """

    renderer_classes = [SSERenderer]

    def post(self, request, ehr_pk):
        serializer = GenerateDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ehr = _get_ehr_or_404(ehr_pk)

        template_id = serializer.validated_data["template_identifier"]

        def event_stream():
            service = get_clinical_writing_service()
            collected: list[str] = []
            try:
                for chunk in service.stream_document(
                    transcription=ehr.transcription,
                    template_identifier=template_id,
                    consultation_type=ehr.consultation_type,
                    extra=ehr.extra,
                ):
                    collected.append(chunk)
                    yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

                full_content = "".join(collected)
                document = Document.objects.create(
                    ehr=ehr,
                    template_identifier=template_id,
                    content=full_content,
                )
                yield (
                    f"data: {json.dumps({'type': 'done', 'document_id': str(document.pk)})}"
                    "\n\n"
                )
            except Exception as exc:
                error_detail = getattr(exc, "detail", str(exc))
                yield f"data: {json.dumps({'type': 'error', 'detail': str(error_detail)})}\n\n"

        response = StreamingHttpResponse(
            event_stream(), content_type="text/event-stream"
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response
