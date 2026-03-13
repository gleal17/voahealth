import React from "react";

const VARIANTS = {
  info: "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-200",
  success: "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-200",
  error: "bg-red-50 border-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-200",
} as const;

type AlertVariant = keyof typeof VARIANTS;

export function Alert({ variant = "info", children }: { variant?: AlertVariant; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${VARIANTS[variant]}`}>
      {children}
    </div>
  );
}

export default Alert;
