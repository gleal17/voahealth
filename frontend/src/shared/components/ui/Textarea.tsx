"use client";

import React from "react";

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={
        "block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm leading-relaxed text-slate-800 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-y dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 dark:focus:border-emerald-500 dark:focus:bg-slate-800 " +
        (props.className ?? "")
      }
    />
  );
}

export default Textarea;
