import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeToggle } from "@/shared/components/theme-toggle";

export const metadata: Metadata = {
  title: "Prontuários Eletrônicos",
  description: "Gerenciamento de EHRs com geração de documentos clínicos via IA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <Providers>
          <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80">
            <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
              <Link
                href="/ehrs"
                className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-slate-900 dark:text-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-500/25">
                  V
                </span>
                <span>
                  Voa<span className="text-emerald-600 dark:text-emerald-400"> Health</span>
                </span>
              </Link>
              <div className="flex items-center gap-1">
                <nav className="flex items-center gap-1 mr-1">
                  <Link
                    href="/ehrs"
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    Prontuários
                  </Link>
                </nav>
                <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
                <div className="ml-1">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </header>
          <main className="min-h-[calc(100vh-3.5rem)]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
