import Link from "next/link";
import { ArrowRight, Film, Mic2, Upload } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";

export default function HomePage() {
  return (
    <AppShell active="home">
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-panel">
            <span className="eyebrow">Local-first AI voice + avatar</span>
            <h1>Clone a voice, animate a portrait, and keep everything on your machine.</h1>
            <p className="page-copy">
              This scaffold follows the implementation plan: upload a reference voice, write a script,
              generate speech with OmniVoice, and render a talking-head video with SadTalker.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/generate">
                Start generating
                <ArrowRight size={16} />
              </Link>
              <Link className="button-secondary" href="/voices">
                Manage voices
              </Link>
            </div>
            <div className="stat-grid">
              <div className="stat">
                <div className="stat-value">Next.js 15</div>
                <div className="muted">UI and workflow shell</div>
              </div>
              <div className="stat">
                <div className="stat-value">FastAPI</div>
                <div className="muted">Upload and job API</div>
              </div>
              <div className="stat">
                <div className="stat-value">SQLite</div>
                <div className="muted">Local metadata store</div>
              </div>
            </div>
          </div>
          <div className="info-panel">
            <div className="stack">
              <div className="card">
                <Mic2 size={20} />
                <h3>Voice enrollment</h3>
                <p>Upload a few seconds of clean speech and keep a normalized copy for TTS.</p>
              </div>
              <div className="card">
                <Upload size={20} />
                <h3>Portrait upload</h3>
                <p>Front-facing images are validated before they are accepted into the pipeline.</p>
              </div>
              <div className="card">
                <Film size={20} />
                <h3>Avatar rendering</h3>
                <p>Jobs are queued locally and the worker writes outputs back into storage.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>What this scaffold already includes</h2>
              <p className="page-copy">A coherent repo layout with working endpoints, forms, and job records.</p>
            </div>
          </div>
          <div className="grid-3">
            <div className="card">
              <h3>Upload APIs</h3>
              <p>Voice and image enrollment endpoints, plus file serving for outputs.</p>
            </div>
            <div className="card">
              <h3>Queue records</h3>
              <p>Create generation jobs and track their progress in SQLite.</p>
            </div>
            <div className="card">
              <h3>Worker scaffold</h3>
              <p>A polling worker shell is ready for Omnivoice, SadTalker, and Wav2Lip integration.</p>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

