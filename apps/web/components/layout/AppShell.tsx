import type { ReactNode } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

type AppShellProps = {
  active?: "home" | "generate" | "veo" | "ops" | "voices" | "history";
  children: ReactNode;
};

export function AppShell({ active, children }: AppShellProps) {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <Link href="/" className="brand" aria-label="AI Voice Avatar home">
            <span className="brand-mark" />
            <span>AI Voice Avatar</span>
          </Link>
          <nav className="nav" aria-label="Primary">
            <Link className={active === "home" ? "active" : ""} href="/">
              Overview
            </Link>
            <Link className={active === "generate" ? "active" : ""} href="/generate">
              Generate
            </Link>
            <Link className={active === "veo" ? "active" : ""} href="/veo">
              Veo image video
            </Link>
            <Link className={active === "ops" ? "active" : ""} href="/ops">
              Agent HQ
            </Link>
            <Link className={active === "voices" ? "active" : ""} href="/voices">
              Voices
            </Link>
            <Link className={active === "history" ? "active" : ""} href="/history">
              History
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <div className="container" style={{ paddingTop: "0.5rem" }}>
        <div className="footer-note">
          <Sparkles size={14} style={{ verticalAlign: "text-top", marginRight: 6 }} />
          Local-first stack: Next.js 15, FastAPI, OmniVoice, SadTalker, and Google Veo.
        </div>
      </div>
    </div>
  );
}
