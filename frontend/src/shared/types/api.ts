export type ConsultationType = "presencial" | "telemedicina";

export type TemplateIdentifier = "soap_note" | "prescription" | "referral";

export interface EHRSummary {
  id: string;
  patient_name: string;
  consultation_type: ConsultationType;
  transcription: string;
  extra: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DocumentSummary {
  id: string;
  template_identifier: TemplateIdentifier;
  content: string;
  created_at: string;
}

export interface Document extends DocumentSummary {
  ehr: string;
}

export interface EHRDetail extends EHRSummary {
  documents: DocumentSummary[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  detail: string;
  code: string;
}

export interface TranscriptionResult {
  text: string;
  provider: string;
  model: string;
}
