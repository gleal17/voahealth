"use client";

import { useEffect, useRef, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import {
  fetchEHRs,
  fetchEHR,
  createEHR,
  generateDocument,
  streamGenerateDocument,
  updateEHRTranscription,
  updateDocument,
  transcribeAudio,
} from "@/shared/services/ehr";
import { extractApiError } from "@/shared/lib/errors";
import type {
  EHRDetail,
  EHRSummary,
  PaginatedResponse,
  TemplateIdentifier,
} from "@/shared/types/api";

export function useEHRs(
  page: number = 1,
  pageSize: number = 10,
  initialData?: PaginatedResponse<EHRSummary>,
) {
  return useQuery({
    queryKey: ["ehrs", page, pageSize],
    queryFn: () => fetchEHRs(page, pageSize),
    initialData: page === 1 ? initialData : undefined,
  });
}

export function useEHR(id: string, initialData?: EHRDetail) {
  return useQuery({
    queryKey: ["ehr", id],
    queryFn: () => fetchEHR(id),
    enabled: !!id,
    initialData,
  });
}

export function useCreateEHR() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: createEHR,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ehrs"] });
      router.push(`/ehrs/${data.id}`);
    },
  });
}

export function useGenerateDocument(ehrId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateIdentifier: string) =>
      generateDocument(ehrId, templateIdentifier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ehr", ehrId] });
    },
  });
}

export function useUpdateEHRTranscription(ehrId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transcription: string) =>
      updateEHRTranscription(ehrId, transcription),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ehr", ehrId] });
      queryClient.invalidateQueries({ queryKey: ["ehrs"] });
    },
  });
}

export function useStreamGenerateDocument(ehrId: string) {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  async function start(templateIdentifier: TemplateIdentifier) {
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsStreaming(true);
    setStreamedContent("");
    setStreamError(null);

    try {
      const documentId = await streamGenerateDocument(ehrId, templateIdentifier, {
        signal: controller.signal,
        onChunk: (chunk) => {
          setStreamedContent((current) => current + chunk);
        },
      });

      await queryClient.invalidateQueries({ queryKey: ["ehr", ehrId] });
      setStreamedContent("");
      return documentId;
    } catch (error) {
      if (controller.signal.aborted) {
        return null;
      }

      const message = extractApiError(
        error,
        "Erro ao gerar documento em tempo real.",
      );
      setStreamError(message);
      throw error;
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }

      setIsStreaming(false);
    }
  }

  function cancel() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
  }

  function clearStreamError() {
    setStreamError(null);
  }

  return {
    start,
    cancel,
    clearStreamError,
    isStreaming,
    streamedContent,
    streamError,
  };
}

export function useUpdateDocument(ehrId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ docId, content }: { docId: string; content: string }) =>
      updateDocument(ehrId, docId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ehr", ehrId] });
    },
  });
}

export function useTranscribeAudio() {
  return useMutation({
    mutationFn: transcribeAudio,
  });
}
