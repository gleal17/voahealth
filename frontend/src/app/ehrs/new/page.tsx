"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useCreateEHR, useTranscribeAudio } from "@/shared/hooks/use-ehrs";
import { extractApiError } from "@/shared/lib/errors";

function buildExtraPayload(rawValue: string): Record<string, unknown> {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return {};
  }

  return { notes: trimmed };
}

const ehrSchema = z.object({
  patient_name: z.string().min(1, "Nome do paciente é obrigatório."),
  consultation_type: z.enum(["presencial", "telemedicina"], {
    message: "Selecione o tipo de consulta.",
  }),
  transcription: z.string().min(1, "Transcrição é obrigatória."),
  extra: z.string().optional(),
});

type EHRFormData = z.infer<typeof ehrSchema>;

const ACCEPTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
];

export default function NewEHRPage() {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EHRFormData>({
    resolver: zodResolver(ehrSchema),
    defaultValues: {
      patient_name: "",
      consultation_type: undefined,
      transcription: "",
      extra: "",
    },
  });

  const createEHR = useCreateEHR();
  const transcribe = useTranscribeAudio();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function onSubmit(data: EHRFormData) {
    setSubmitError(null);

    createEHR.mutate(
      {
        patient_name: data.patient_name,
        consultation_type: data.consultation_type,
        transcription: data.transcription,
        extra: buildExtraPayload(data.extra ?? ""),
      },
      {
        onError: (err) => {
          setSubmitError(extractApiError(err, "Erro ao criar prontuário."));
        },
      },
    );
  }

  function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_AUDIO_TYPES.includes(file.type)) {
      setSubmitError("Formato de áudio não suportado. Use MP3, WAV, OGG, WebM ou M4A.");
      return;
    }

    setAudioFileName(file.name);
    setSubmitError(null);

    transcribe.mutate(file, {
      onSuccess: (result) => {
        setValue("transcription", result.text, { shouldValidate: true });
      },
      onError: (err) => {
        setAudioFileName(null);
        setSubmitError(extractApiError(err, "Erro na transcrição do áudio."));
      },
    });
  }

  const isBusy = isSubmitting || createEHR.isPending || transcribe.isPending;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      {/* Back link */}
      <Link
        href="/ehrs"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-white mb-6"
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
        Voltar
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mb-8">
        Novo Prontuário
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Patient name */}
        <fieldset disabled={isBusy}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Nome do Paciente <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              {...register("patient_name")}
              placeholder="Nome completo do paciente"
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500"
            />
            {errors.patient_name && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.patient_name.message}</p>
            )}
          </label>
        </fieldset>

        {/* Consultation type */}
        <fieldset disabled={isBusy}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Tipo de Consulta <span className="text-red-500">*</span>
            </span>
            <select
              {...register("consultation_type")}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500"
            >
              <option value="">Selecione…</option>
              <option value="presencial">Presencial</option>
              <option value="telemedicina">Telemedicina</option>
            </select>
            {errors.consultation_type && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.consultation_type.message}</p>
            )}
          </label>
        </fieldset>

        {/* Audio upload */}
        <div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Transcrição de Áudio (opcional)
          </span>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
            Envie um arquivo de áudio para transcrever automaticamente, ou digite a transcrição manualmente abaixo.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              className="hidden"
              disabled={isBusy}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {transcribe.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
                  Transcrevendo…
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                    <path
                      d="M8 2v8m0 0L5 7m3 3l3-3M3 12h10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Enviar Áudio
                </>
              )}
            </button>
            {audioFileName && !transcribe.isPending && (
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                {audioFileName}
              </span>
            )}
          </div>
        </div>

        {/* Transcription */}
        <fieldset disabled={isBusy}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Transcrição <span className="text-red-500">*</span>
            </span>
            <textarea
              {...register("transcription")}
              rows={6}
              placeholder="Paciente relata que está sentindo…"
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-y dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500"
            />
            {errors.transcription && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.transcription.message}</p>
            )}
          </label>
        </fieldset>

        {/* Extra info */}
        <fieldset disabled={isBusy}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Observações adicionais
            </span>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              Escreva informações livres como especialidade, convênio, alergias ou
              contexto clínico.
            </p>
            <textarea
              {...register("extra")}
              rows={5}
              placeholder="Ex.: Clínica geral, convênio SUS, sem alergias conhecidas."
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-y dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500"
            />
          </label>
        </fieldset>

        {/* Submit error */}
        {submitError && (
          <div className="flex items-start justify-between rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
            <p className="text-sm text-red-700 dark:text-red-400">{submitError}</p>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="ml-3 flex-shrink-0 text-red-400 hover:text-red-600 transition dark:text-red-500 dark:hover:text-red-300"
              aria-label="Fechar"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/ehrs"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-950"
          >
            {createEHR.isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Criando…
              </>
            ) : (
              "Criar Prontuário"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
