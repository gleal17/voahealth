"use client";

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
  updateDocument,
  transcribeAudio,
} from "@/shared/services/ehr";
import type { EHRDetail, EHRSummary, PaginatedResponse } from "@/shared/types/api";

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
