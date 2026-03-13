"use client";

import React from "react";

export function Dialog({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-900">
        {title && <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>}
        <div>{children}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300">Fechar</button>
        </div>
      </div>
    </div>
  );
}

export default Dialog;
