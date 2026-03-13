import { http } from "@/shared/lib/http";
import { getApiErrorMessage } from "@/shared/lib/errors";
import type {
  ApiError,
  EHRDetail,
  EHRSummary,
  Document,
  PaginatedResponse,
  TemplateIdentifier,
  TranscriptionResult,
} from "@/shared/types/api";

interface CreateEHRPayload {
  patient_name: string;
  consultation_type: "presencial" | "telemedicina";
  transcription: string;
  extra: Record<string, unknown>;
}

interface StreamGenerateDocumentChunkEvent {
  type: "chunk";
  content: string;
}

interface StreamGenerateDocumentDoneEvent {
  type: "done";
  document_id: string;
}

interface StreamGenerateDocumentErrorEvent {
  type: "error";
  detail: string;
}

type StreamGenerateDocumentEvent =
  | StreamGenerateDocumentChunkEvent
  | StreamGenerateDocumentDoneEvent
  | StreamGenerateDocumentErrorEvent;

function getClientApiBaseUrl() {
  const baseUrl = http.defaults.baseURL;

  if (!baseUrl) {
    throw new Error("API base URL nao configurada.");
  }

  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function parseSSEEvent(rawEvent: string): StreamGenerateDocumentEvent | null {
  const data = rawEvent
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("");

  if (!data) {
    return null;
  }

  return JSON.parse(data) as StreamGenerateDocumentEvent;
}

function handleStreamEvent(
  event: StreamGenerateDocumentEvent,
  onChunk?: (chunk: string) => void,
) {
  if (event.type === "chunk") {
    onChunk?.(event.content);
    return null;
  }

  if (event.type === "done") {
    return event.document_id;
  }

  throw new Error(event.detail || "Erro durante a geracao do documento.");
}

async function buildStreamRequestError(response: Response) {
  let apiError: Partial<ApiError> | undefined;

  try {
    apiError = (await response.json()) as Partial<ApiError>;
  } catch {
    apiError = undefined;
  }

  const message = getApiErrorMessage({
    status: response.status,
    detail: apiError?.detail,
    code: apiError?.code,
    fallback: `Erro ao iniciar a geracao (${response.status}).`,
  });

  return new Error(message);
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

export async function updateEHRTranscription(
  ehrId: string,
  transcription: string,
): Promise<EHRDetail> {
  const { data } = await http.patch<EHRDetail>(`/ehrs/${ehrId}/`, {
    transcription,
  });
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

export async function streamGenerateDocument(
  ehrId: string,
  templateIdentifier: TemplateIdentifier,
  options?: {
    signal?: AbortSignal;
    onChunk?: (chunk: string) => void;
  },
): Promise<string> {
  const response = await fetch(
    `${getClientApiBaseUrl()}/ehrs/${ehrId}/generate/stream/`,
    {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_identifier: templateIdentifier,
      }),
      signal: options?.signal,
    },
  );

  if (!response.ok) {
    throw await buildStreamRequestError(response);
  }

  if (!response.body) {
    throw new Error("Nao foi possivel abrir o stream de geracao.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let documentId = "";

  while (true) {
    const { value, done } = await reader.read();

    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const normalizedBuffer = buffer.replace(/\r\n/g, "\n");
    const rawEvents = normalizedBuffer.split("\n\n");
    buffer = rawEvents.pop() ?? "";

    for (const rawEvent of rawEvents) {
      const event = parseSSEEvent(rawEvent);

      if (!event) {
        continue;
      }

      const completedDocumentId = handleStreamEvent(event, options?.onChunk);

      if (completedDocumentId) {
        documentId = completedDocumentId;
      }
    }

    if (done) {
      break;
    }
  }

  const finalEvent = parseSSEEvent(buffer.replace(/\r\n/g, "\n"));

  if (finalEvent) {
    const completedDocumentId = handleStreamEvent(finalEvent, options?.onChunk);

    if (completedDocumentId) {
      documentId = completedDocumentId;
    }
  }

  if (!documentId) {
    throw new Error("A geracao terminou sem confirmar o documento salvo.");
  }

  return documentId;
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
