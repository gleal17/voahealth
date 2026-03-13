export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-5 w-5 animate-spin rounded-full border-2 border-current/20 border-t-current ${className}`}
      role="status"
    >
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
