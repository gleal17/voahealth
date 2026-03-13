import type { EHRDetail, EHRSummary, PaginatedResponse } from "@/shared/types/api";

function getServerApiBaseUrl() {
  const baseUrl =
    process.env.API_INTERNAL_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8000/api";

  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getServerApiBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchEHRsServer(page: number = 1, pageSize: number = 10) {
  const searchParams = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  return fetchJson<PaginatedResponse<EHRSummary>>(`/ehrs/?${searchParams.toString()}`);
}

export function fetchEHRServer(id: string) {
  return fetchJson<EHRDetail>(`/ehrs/${id}/`);
}
