"use client";

import Link from "next/link";
import { useState } from "react";

import { useEHRs } from "@/shared/hooks/use-ehrs";
import { extractApiError } from "@/shared/lib/errors";
import { Badge } from "@/shared/components/badge";
import type { EHRSummary, PaginatedResponse } from "@/shared/types/api";

const CONSULTATION_LABELS: Record<string, string> = {
  presencial: "Presencial",
  telemedicina: "Telemedicina",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EHRsPageClient({
  initialData,
}: {
  initialData: PaginatedResponse<EHRSummary>;
}) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useEHRs(page, 10, initialData);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 animate-fade-in">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Prontuários
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {data ? `${data.count} registro${data.count !== 1 ? "s" : ""}` : "Carregando…"}
          </p>
        </div>
        <Link
          href="/ehrs/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Novo Prontuário
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600 dark:border-slate-600 dark:border-t-emerald-400" />
          <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">Carregando prontuários…</span>
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            {extractApiError(error, "Erro ao carregar prontuários.")}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-xs font-medium text-red-700 underline underline-offset-2 transition hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {data && data.results.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center dark:border-slate-700">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <svg
              className="h-8 w-8 text-slate-400 dark:text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Nenhum prontuário encontrado
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Crie o primeiro prontuário para começar.
          </p>
        </div>
      )}

      {data && data.results.length > 0 && (
        <div className="space-y-3">
          {data.results.map((ehr, i) => (
            <Link
              key={ehr.id}
              href={`/ehrs/${ehr.id}`}
              className="group block rounded-2xl glass-card p-5 transition-all hover:border-emerald-300 hover:shadow-lg dark:hover:border-emerald-700/60 animate-slide-up"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-50 text-sm font-bold text-emerald-700 dark:from-emerald-900/40 dark:to-teal-900/30 dark:text-emerald-300">
                    {ehr.patient_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold text-slate-900 transition-colors group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400">
                      {ehr.patient_name}
                    </h2>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <Badge variant={ehr.consultation_type}>
                        {CONSULTATION_LABELS[ehr.consultation_type] ?? ehr.consultation_type}
                      </Badge>
                      <span>{formatDate(ehr.created_at)}</span>
                    </div>
                    {ehr.transcription && (
                      <p className="mt-1.5 line-clamp-1 text-xs text-slate-400 dark:text-slate-500">
                        {ehr.transcription}
                      </p>
                    )}
                  </div>
                </div>
                <svg
                  className="h-5 w-5 flex-shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-emerald-500 dark:text-slate-600 dark:group-hover:text-emerald-400"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M7 4l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}

      {data && (data.previous || data.next) && (
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            disabled={!data.previous}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
              <path
                d="M9 3L5 7l4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Anterior
          </button>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Página {page}</span>
          <button
            onClick={() => setPage((currentPage) => currentPage + 1)}
            disabled={!data.next}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Próxima
            <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
              <path
                d="M5 3l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
