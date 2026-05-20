"use client";

import { useEffect, useState } from "react";
import { AudioLines, FileAudio2, Mic2, Sparkles } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { VoiceUploader } from "@/components/upload/VoiceUploader";
import { listVoices } from "@/lib/api";
import type { VoiceItem } from "@/lib/types";

export default function VoicesPage() {
  const [voices, setVoices] = useState<VoiceItem[]>([]);

  async function refresh() {
    const data = await listVoices();
    setVoices(data);
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <AppShell active="voices">
      <section className="section">
        <div className="container stack">
          <div className="voice-hero">
            <div>
              <div className="eyebrow">
                <Sparkles size={14} />
                Voice studio
              </div>
              <h1 className="page-title">Voices</h1>
              <p className="page-copy">
                Upload a clean sample or record directly in the browser, then review the take before saving it into
                your local voice library.
              </p>
            </div>
            <div className="voice-stats">
              <div className="stat">
                <div className="stat-label">
                  <Mic2 size={14} />
                  Capture
                </div>
                <div className="stat-value">{voices.length}</div>
                <div className="muted">Saved voices in the catalog</div>
              </div>
              <div className="stat">
                <div className="stat-label">
                  <FileAudio2 size={14} />
                  Flow
                </div>
                <div className="stat-value">Upload</div>
                <div className="muted">or record, preview, delete, then save</div>
              </div>
            </div>
          </div>

          <div className="voice-grid">
            <div className="surface voice-panel">
              <h3>New voice sample</h3>
              <p>Choose a source, listen back if needed, and save only the best take.</p>
              <VoiceUploader onUploaded={() => void refresh()} />
            </div>

            <div className="surface voice-panel">
              <div className="section-head compact">
                <div>
                  <h3>Registered voices</h3>
                  <p>Each sample stays local and can be reused for avatar generation.</p>
                </div>
                <div className="badge-muted">{voices.length} total</div>
              </div>
              <div className="list">
                {voices.map((voice) => (
                  <div key={voice.voice_id} className="list-item">
                    <div>
                      <strong>{voice.name}</strong>
                      <div className="muted">
                        {voice.voice_id} · {voice.duration_seconds ? `${voice.duration_seconds.toFixed(1)}s` : "duration pending"}
                      </div>
                    </div>
                    <span className="badge">{voice.status}</span>
                  </div>
                ))}
                {voices.length === 0 ? (
                  <div className="empty-state">
                    <AudioLines size={18} />
                    <div>
                      <strong>No voices uploaded yet.</strong>
                      <div className="muted">Record a sample on the left to populate the library.</div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
