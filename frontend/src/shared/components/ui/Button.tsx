"use client";

import React from "react";

export function Button({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={"inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition " + className}
    >
      {children}
    </button>
  );
}

export default Button;
