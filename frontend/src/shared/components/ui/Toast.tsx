"use client";

import React from "react";

export function Toast({ children, variant = "info" }: { children: React.ReactNode; variant?: "info" | "success" | "error" }) {
  const classes = {
    info: "bg-blue-600 text-white",
    success: "bg-emerald-600 text-white",
    error: "bg-red-600 text-white",
  } as const;

  return (
    <div className={`rounded-md px-3 py-2 text-sm shadow ${classes[variant]}`}>
      {children}
    </div>
  );
}

export default Toast;
