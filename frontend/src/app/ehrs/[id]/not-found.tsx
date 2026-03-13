import Link from "next/link";

export default function EHRDetailNotFound() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20 text-center animate-fade-in">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
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
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          />
        </svg>
      </div>
      <p className="mb-1 text-base font-semibold text-slate-700 dark:text-slate-200">
        Prontuario nao encontrado
      </p>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        O prontuario solicitado nao existe ou foi removido.
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
