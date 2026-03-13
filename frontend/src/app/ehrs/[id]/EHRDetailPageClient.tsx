"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/shared/components/badge";
import Card from "@/shared/components/ui/Card";
import Button from "@/shared/components/ui/Button";
import Select from "@/shared/components/ui/Select";
import Textarea from "@/shared/components/ui/Textarea";
import {
  useEHR,
  useStreamGenerateDocument,
  useUpdateEHRTranscription,
  useUpdateDocument,
} from "@/shared/hooks/use-ehrs";
import { extractApiError } from "@/shared/lib/errors";
import type {
  DocumentSummary,
  EHRDetail,
  TemplateIdentifier,
} from "@/shared/types/api";

const DocumentEditor = dynamic(
  () => import("@/shared/components/document-editor/DocumentEditor"),
  { ssr: false },
);

const TEMPLATE_OPTIONS = [
  { value: "soap_note", label: "SOAP Note" },
  { value: "prescription", label: "Prescricao" },
  { value: "referral", label: "Encaminhamento" },
] as const;

const TEMPLATE_LABELS: Record<string, string> = {
  soap_note: "SOAP Note",
  prescription: "Prescricao",
  referral: "Encaminhamento",
};

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

function DocumentCard({
  doc,
  ehrId,
  index,
}: {
  doc: DocumentSummary;
  ehrId: string;
  index: number;
}) {
  const [draftContent, setDraftContent] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const updateDoc = useUpdateDocument(ehrId);
  const content = draftContent ?? doc.content;
  const isDirty = draftContent !== null && draftContent !== doc.content;

  function handleSave() {
    setSaved(false);
    updateDoc.mutate(
      { docId: doc.id, content },
      {
        onSuccess: () => {
          setDraftContent(null);
          setSaved(true);
        },
      },
    );
  }

  return (
    <Card
      className="overflow-hidden p-0 animate-slide-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
    >
      <div className="border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 px-5 py-3.5">
            <Badge
              variant={
                doc.template_identifier as
                  | "soap_note"
                  | "prescription"
                  | "referral"
              }
            >
              {TEMPLATE_LABELS[doc.template_identifier] ?? doc.template_identifier}
            </Badge>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {formatDate(doc.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-2.5 px-5 py-3.5">
            {saved && !isDirty && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <svg width="14" height="14" fill="none" viewBox="0 0 16 16">
                  <path
                    d="M3 8.5l3.5 3.5 6.5-7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Salvo
              </span>
            )}
            {updateDoc.isError && (
              <span className="text-xs text-red-600 dark:text-red-400">
                {extractApiError(updateDoc.error, "Erro ao salvar")}
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={!isDirty || updateDoc.isPending}
              className={
                "bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-slate-900 " +
                (updateDoc.isPending ? "opacity-80" : "")
              }
            >
              {updateDoc.isPending ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-slate-900/30 dark:border-t-slate-900" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </div>
      </div>
      <div className="p-5">
        <DocumentEditor
          value={content}
          onChange={(html) => {
            setDraftContent(html);
            setSaved(false);
          }}
        />
      </div>
    </Card>
  );
}

export function EHRDetailPageClient({
  ehrId,
  initialData,
}: {
  ehrId: string;
  initialData: EHRDetail;
}) {
  const { data: ehr, isLoading, isError, error } = useEHR(ehrId, initialData);
  const generate = useStreamGenerateDocument(ehrId);
  const updateTranscription = useUpdateEHRTranscription(ehrId);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateIdentifier>(
    TEMPLATE_OPTIONS[0].value,
  );
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const [transcriptionDraft, setTranscriptionDraft] = useState<string | null>(null);
  const [transcriptionSaved, setTranscriptionSaved] = useState(false);

  async function handleGenerate() {
    setGenerateError(null);
    setGenerateSuccess(false);

    try {
      const documentId = await generate.start(selectedTemplate);

      if (!documentId) {
        return;
      }

      setGenerateSuccess(true);
      setTimeout(() => setGenerateSuccess(false), 4000);
    } catch (err) {
      setGenerateError(extractApiError(err, "Erro ao gerar documento."));
    }
  }

  function handleSaveTranscription() {
    setTranscriptionSaved(false);
    updateTranscription.mutate(transcriptionValue, {
      onSuccess: () => {
        setTranscriptionDraft(null);
        setTranscriptionSaved(true);
      },
    });
  }

  if (isLoading && !ehr) {
    return (
      <div className="mx-auto flex max-w-5xl items-center justify-center px-6 py-32">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600 dark:border-slate-600 dark:border-t-emerald-400" />
        <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">
          Carregando prontuario...
        </span>
      </div>
    );
  }

  if (!ehr) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 text-center animate-fade-in">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30">
          <svg
            className="h-8 w-8 text-red-400 dark:text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <p className="mb-1 text-base font-semibold text-red-700 dark:text-red-400">
          Erro ao carregar prontuario
        </p>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          {extractApiError(error, "Verifique sua conexao e tente novamente.")}
        </p>
        <Link
          href="/ehrs"
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Voltar para a listagem
        </Link>
      </div>
    );
  }

  const documents = ehr.documents ?? [];
  const refreshWarning = isError
    ? extractApiError(error, "Nao foi possivel atualizar os dados mais recentes.")
    : null;
  const transcriptionValue = transcriptionDraft ?? ehr.transcription;
  const isTranscriptionDirty =
    transcriptionDraft !== null && transcriptionDraft !== ehr.transcription;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 animate-fade-in">
      <Link
        href="/ehrs"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
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
        Prontuarios
      </Link>

      {refreshWarning && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          {refreshWarning}
        </div>
      )}

      <div className="mb-8 rounded-2xl glass-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50 text-lg font-bold text-emerald-700 dark:from-emerald-900/40 dark:to-teal-900/30 dark:text-emerald-300">
            {ehr.patient_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {ehr.patient_name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <Badge variant={ehr.consultation_type}>
                {CONSULTATION_LABELS[ehr.consultation_type] ?? ehr.consultation_type}
              </Badge>
              <span className="flex items-center gap-1.5">
                <svg width="14" height="14" fill="none" viewBox="0 0 16 16">
                  <rect
                    x="2"
                    y="2.5"
                    width="12"
                    height="11"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M2 6.5h12M5.5 1v3M10.5 1v3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                {formatDate(ehr.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <svg width="14" height="14" fill="none" viewBox="0 0 16 16">
              <path
                d="M8 2v1.5M8 12.5V14M3.5 5.5H2M14 5.5h-1.5M4.5 3.5L3.5 2.5M12.5 3.5l1-1M5 8a3 3 0 0 0 6 0V5a3 3 0 0 0-6 0v3ZM3.5 8A4.5 4.5 0 0 0 8 12.5 4.5 4.5 0 0 0 12.5 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Transcricao
          </h2>
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Ajuste a transcricao antes de gerar ou regenerar documentos.
                </div>
                <div className="flex items-center gap-2.5">
                  {transcriptionSaved && !isTranscriptionDirty && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <svg width="14" height="14" fill="none" viewBox="0 0 16 16">
                        <path
                          d="M3 8.5l3.5 3.5 6.5-7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Salvo
                    </span>
                  )}
                  {updateTranscription.isError && (
                    <span className="text-xs text-red-600 dark:text-red-400">
                      {extractApiError(
                        updateTranscription.error,
                        "Erro ao salvar a transcricao.",
                      )}
                    </span>
                  )}
                  <Button
                    onClick={handleSaveTranscription}
                    disabled={!isTranscriptionDirty || updateTranscription.isPending}
                    className={
                      "bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-slate-900 " +
                      (updateTranscription.isPending ? "opacity-80" : "")
                    }
                  >
                    {updateTranscription.isPending ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-slate-900/30 dark:border-t-slate-900" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar"
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-5">
              <Textarea
                value={transcriptionValue}
                onChange={(event) => {
                  setTranscriptionDraft(event.target.value);
                  setTranscriptionSaved(false);
                }}
                rows={10}
                className="min-h-[180px] whitespace-pre-wrap"
              />
            </div>
          </Card>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <svg width="14" height="14" fill="none" viewBox="0 0 16 16">
              <path
                d="M6 2l2.5 3.5L14 3l-2 5.5L14 14l-5.5-2.5L5 14l1-5.5L2 6l4-1z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Gerar Documento
          </h2>
          <div className="space-y-4 rounded-2xl glass-card p-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Template
              </label>
              <Select
                value={selectedTemplate}
                onChange={(e) =>
                  setSelectedTemplate(e.target.value as TemplateIdentifier)
                }
                disabled={generate.isStreaming}
              >
                {TEMPLATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generate.isStreaming}
              className={
                "w-full justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all " +
                (generate.isStreaming ? "opacity-70" : "")
              }
            >
              {generate.isStreaming ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Gerando ao vivo...
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                    <path
                      d="M6 2l2.5 3.5L14 3l-2 5.5L14 14l-5.5-2.5L5 14l1-5.5L2 6l4-1z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Gerar com IA
                </>
              )}
            </Button>
            {generate.isStreaming && (
              <Button
                onClick={generate.cancel}
                className="w-full justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar geracao
              </Button>
            )}
            {generateError && (
              <div className="flex items-start justify-between rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
                <p className="text-xs text-red-700 dark:text-red-400">
                  {generateError}
                </p>
                <button
                  onClick={() => setGenerateError(null)}
                  className="ml-2 flex-shrink-0 text-red-400 transition hover:text-red-600 dark:text-red-500 dark:hover:text-red-300"
                  aria-label="Fechar"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
                    <path
                      d="M3.5 3.5l7 7M10.5 3.5l-7 7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            )}
            {!generateError && generate.streamError && (
              <div className="flex items-start justify-between rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
                <p className="text-xs text-red-700 dark:text-red-400">
                  {generate.streamError}
                </p>
                <button
                  onClick={generate.clearStreamError}
                  className="ml-2 flex-shrink-0 text-red-400 transition hover:text-red-600 dark:text-red-500 dark:hover:text-red-300"
                  aria-label="Fechar"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
                    <path
                      d="M3.5 3.5l7 7M10.5 3.5l-7 7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            )}
            {generateSuccess && (
              <div className="animate-slide-down rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <svg width="14" height="14" fill="none" viewBox="0 0 16 16">
                    <path
                      d="M3 8.5l3.5 3.5 6.5-7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Documento gerado com sucesso!
                </p>
              </div>
            )}
            {generate.isStreaming && (
              <div className="rounded-xl border border-emerald-200/70 bg-white/80 p-4 shadow-sm dark:border-emerald-900/50 dark:bg-slate-950/40">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Previa em tempo real
                </div>
                <div className="max-h-56 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {generate.streamedContent || "Aguardando os primeiros trechos do documento..."}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {ehr.extra && Object.keys(ehr.extra).length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <svg width="14" height="14" fill="none" viewBox="0 0 16 16">
              <path
                d="M8 1v14M1 8h14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Outras Informacoes
          </h2>
          <div className="rounded-2xl glass-card p-5">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {Object.entries(ehr.extra).map(([key, value]) => (
                <div key={key}>
                  <dt className="mb-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {key}
                  </dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-200">
                    {String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <svg width="14" height="14" fill="none" viewBox="0 0 16 16">
            <path
              d="M4 2h5.172a2 2 0 0 1 1.414.586l2.828 2.828A2 2 0 0 1 14 6.828V12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M5 9h6M5 11.5h4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Documentos
          <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {documents.length}
          </span>
        </h2>

        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center dark:border-slate-700">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
              <svg
                className="h-6 w-6 text-slate-400 dark:text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Nenhum documento gerado ainda.
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Use o painel acima para gerar o primeiro.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc, index) => (
              <DocumentCard key={doc.id} doc={doc} ehrId={ehrId} index={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
