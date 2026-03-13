import { AxiosError } from "axios";
import type { ApiError } from "@/shared/types/api";

const ERROR_CODE_MESSAGES: Record<string, string> = {
  gemini_not_configured:
    "Serviço de LLM (Gemini) não configurado. Contate o administrador.",
  gemini_unavailable:
    "Serviço de LLM (Gemini) temporariamente indisponível. Tente novamente em alguns instantes.",
  gemini_invalid_response:
    "O serviço de LLM (Gemini) retornou uma resposta inválida. Tente novamente.",
  template_invalid: "Template inválido para geração de documento.",
  not_found: "Recurso não encontrado.",
};

const STATUS_MESSAGES: Record<number, string> = {
  400: "Dados inválidos. Verifique os campos e tente novamente.",
  404: "Recurso não encontrado.",
  502: "Erro de comunicação com serviço externo. Tente novamente.",
  503: "Serviço temporariamente indisponível. Tente novamente em alguns instantes.",
};

export function extractApiError(
  err: unknown,
  fallback = "Ocorreu um erro inesperado. Tente novamente.",
): string {
  if (err instanceof AxiosError) {
    if (!err.response) {
      return "Sem conexão com o servidor. Verifique sua rede e tente novamente.";
    }

    const data = err.response.data as ApiError | undefined;

    if (data?.code && ERROR_CODE_MESSAGES[data.code]) {
      return ERROR_CODE_MESSAGES[data.code];
    }

    if (data?.detail) {
      return data.detail;
    }

    if (STATUS_MESSAGES[err.response.status]) {
      return STATUS_MESSAGES[err.response.status];
    }
  }

  if (err instanceof Error) {
    return err.message;
  }

  return fallback;
}

export function isNotFoundError(err: unknown): boolean {
  if (err instanceof AxiosError) {
    return err.response?.status === 404;
  }
  return false;
}
