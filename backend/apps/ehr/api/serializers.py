from rest_framework import serializers

from apps.ehr.models import Document, EHR


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ["id", "ehr", "template_identifier", "content", "created_at"]
        read_only_fields = ["id", "ehr", "created_at"]


class DocumentContentSerializer(serializers.ModelSerializer):
    """Serializer for PATCH — only content is editable."""

    class Meta:
        model = Document
        fields = ["id", "ehr", "template_identifier", "content", "created_at"]
        read_only_fields = ["id", "ehr", "template_identifier", "created_at"]

    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("content não pode ser vazio.")
        return value


class DocumentNestedSerializer(serializers.ModelSerializer):
    """Lightweight serializer used when nesting inside EHR detail."""

    class Meta:
        model = Document
        fields = ["id", "template_identifier", "content", "created_at"]
        read_only_fields = fields


class EHRListSerializer(serializers.ModelSerializer):
    class Meta:
        model = EHR
        fields = [
            "id",
            "patient_name",
            "consultation_type",
            "transcription",
            "extra",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class EHRDetailSerializer(serializers.ModelSerializer):
    documents = DocumentNestedSerializer(many=True, read_only=True)

    class Meta:
        model = EHR
        fields = [
            "id",
            "patient_name",
            "consultation_type",
            "transcription",
            "extra",
            "created_at",
            "updated_at",
            "documents",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class EHRTranscriptionSerializer(serializers.ModelSerializer):
    """Serializer for PATCH — only transcription is editable."""

    documents = DocumentNestedSerializer(many=True, read_only=True)

    class Meta:
        model = EHR
        fields = [
            "id",
            "patient_name",
            "consultation_type",
            "transcription",
            "extra",
            "created_at",
            "updated_at",
            "documents",
        ]
        read_only_fields = [
            "id",
            "patient_name",
            "consultation_type",
            "extra",
            "created_at",
            "updated_at",
            "documents",
        ]

    def validate_transcription(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("transcription não pode ser vazia.")
        return value


class EHRCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EHR
        fields = [
            "id",
            "patient_name",
            "consultation_type",
            "transcription",
            "extra",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_extra(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("extra must be a JSON object.")
        return value


class GenerateDocumentSerializer(serializers.Serializer):
    template_identifier = serializers.ChoiceField(
        choices=Document.TemplateIdentifier.choices,
    )


class TranscriptionUploadSerializer(serializers.Serializer):
    SUPPORTED_MIME_TYPES = (
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/x-wav",
        "audio/vnd.wave",
        "audio/ogg",
        "audio/flac",
        "audio/x-flac",
        "audio/aac",
        "audio/webm",
        "audio/mp4",
        "audio/x-m4a",
        "audio/m4a",
        "audio/x-aac",
    )

    audio = serializers.FileField()

    def validate_audio(self, value):
        mime = getattr(value, "content_type", None) or ""
        if mime not in self.SUPPORTED_MIME_TYPES:
            raise serializers.ValidationError(
                f"MIME type '{mime}' não suportado. Tipos aceitos: {', '.join(self.SUPPORTED_MIME_TYPES)}"
            )
        return value
