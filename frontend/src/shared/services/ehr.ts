import { http } from "@/shared/lib/http";
import type {
  EHRDetail,
  EHRSummary,
  Document,
  PaginatedResponse,
  TranscriptionResult,
} from "@/shared/types/api";

interface CreateEHRPayload {
  patient_name: string;
  consultation_type: "presencial" | "telemedicina";
  transcription: string;
  extra: Record<string, unknown>;
}

export async function fetchEHRs(
  page: number = 1,
  pageSize: number = 10,
): Promise<PaginatedResponse<EHRSummary>> {
  const { data } = await http.get<PaginatedResponse<EHRSummary>>("/ehrs/", {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function fetchEHR(id: string): Promise<EHRDetail> {
  const { data } = await http.get<EHRDetail>(`/ehrs/${id}/`);
  return data;
}

export async function createEHR(payload: CreateEHRPayload): Promise<EHRDetail> {
  const { data } = await http.post<EHRDetail>("/ehrs/", payload);
  return data;
}

export async function generateDocument(
  ehrId: string,
  templateIdentifier: string,
): Promise<Document> {
  const { data } = await http.post<Document>(`/ehrs/${ehrId}/generate/`, {
    template_identifier: templateIdentifier,
  });
  return data;
}

export async function updateDocument(
  ehrId: string,
  docId: string,
  content: string,
): Promise<Document> {
  const { data } = await http.patch<Document>(
    `/ehrs/${ehrId}/documents/${docId}/`,
    { content },
  );
  return data;
}

export async function transcribeAudio(
  file: File,
): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append("audio", file);

  const { data } = await http.post<TranscriptionResult>(
    "/transcriptions/",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}
