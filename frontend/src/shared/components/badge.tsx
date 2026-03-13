import type { ReactNode } from "react";

const VARIANTS = {
  presencial: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-400/20",
  telemedicina: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-400/20",
  soap_note: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-400/20",
  prescription: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-400/20",
  referral: "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-400/20",
  neutral: "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-400/20",
} as const;

type BadgeVariant = keyof typeof VARIANTS;

export function Badge({
  variant = "neutral",
  children,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}
