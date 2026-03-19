import uuid

from django.db import models


class EHR(models.Model):
    class ConsultationType(models.TextChoices):
        PRESENCIAL = "presencial", "Presencial"
        TELEMEDICINA = "telemedicina", "Telemedicina"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient_name = models.CharField(max_length=255)
    consultation_type = models.CharField(
        max_length=20,
        choices=ConsultationType.choices,
    )
    transcription = models.TextField()
    extra = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "EHR"
        verbose_name_plural = "EHRs"

    def __str__(self):
        return f"{self.patient_name} - {self.created_at:%Y-%m-%d}"


class Document(models.Model):
    class TemplateIdentifier(models.TextChoices):
        SOAP_NOTE = "soap_note", "SOAP Note"
        PRESCRIPTION = "prescription", "Prescription"
        REFERRAL = "referral", "Referral"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ehr = models.ForeignKey(
        EHR,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    template_identifier = models.CharField(
        max_length=20,
        choices=TemplateIdentifier.choices,
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Document"
        verbose_name_plural = "Documents"

    def __str__(self):
        return f"{self.template_identifier} - {self.ehr.patient_name}"
