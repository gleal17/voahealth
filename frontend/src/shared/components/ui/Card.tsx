import React from "react";

export function Card({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={
        "rounded-2xl glass-card p-5 bg-white dark:bg-slate-900 " +
        className
      }
    >
      {children}
    </div>
  );
}

export default Card;
