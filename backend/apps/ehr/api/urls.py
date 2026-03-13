from django.urls import path
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .views import (
    DocumentListView,
    DocumentPartialUpdateView,
    EHRDetailView,
    EHRListCreateView,
    GenerateDocumentView,
    StreamGenerateDocumentView,
    TranscriptionView,
)


@api_view(["GET"])
def health_check(request):
    return Response({"status": "ok"})


urlpatterns = [
    path("", health_check, name="api-health"),
    # EHR
    path("ehrs/", EHRListCreateView.as_view(), name="ehr-list-create"),
    path("ehrs/<uuid:pk>/", EHRDetailView.as_view(), name="ehr-detail"),
    # Documents
    path("ehrs/<uuid:ehr_pk>/documents/", DocumentListView.as_view(), name="document-list"),
    path(
        "ehrs/<uuid:ehr_pk>/documents/<uuid:doc_pk>/",
        DocumentPartialUpdateView.as_view(),
        name="document-partial-update",
    ),
    # Generate
    path("ehrs/<uuid:ehr_pk>/generate/", GenerateDocumentView.as_view(), name="generate-document"),
    path("ehrs/<uuid:ehr_pk>/generate/stream/", StreamGenerateDocumentView.as_view(), name="generate-document-stream"),
    # Transcription
    path("transcriptions/", TranscriptionView.as_view(), name="transcription"),
]
