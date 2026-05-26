"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Bot, CheckCircle2, Clock, Film, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { listJobs } from "@/lib/api";
import type { JobItem } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
};

const panelStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.05fr) minmax(360px, 0.95fr)",
  gap: "1rem",
  alignItems: "stretch",
} as const;

const artStyle = {
  minHeight: "31rem",
  borderRadius: "1.5rem",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  boxShadow: "var(--shadow)",
  overflow: "hidden",
  position: "relative",
  background:
    "radial-gradient(circle at 30% 20%, rgba(94,234,212,0.22), transparent 25%), radial-gradient(circle at 80% 60%, rgba(245,158,11,0.14), transparent 30%), linear-gradient(145deg, #07111c, #12172f 55%, #2f2b8f)",
} as const;

const chipStyle = {
  border: "1px solid rgba(94, 234, 212, 0.24)",
  borderRadius: "0.85rem",
  background: "rgba(4, 12, 20, 0.72)",
  padding: "0.75rem",
} as const;

function countJobs(jobs: JobItem[], status: string) {
  return jobs.filter((job) => job.status === status).length;
}

function getPipelineLabel(jobType: string) {
  if (jobType === "generate-veo-image-video") {
    return "Google Veo image-to-video";
  }
  if (jobType === "generate-avatar") {
    return "OmniVoice + SadTalker avatar";
  }
  return jobType;
}

function getAgentLabel(job: JobItem) {
  if (job.job_type === "generate-veo-image-video") {
    return "Veo Worker";
  }
  if (job.job_type === "generate-avatar") {
    return job.progress < 55 ? "TTS Agent" : "Avatar Renderer";
  }
  return "Worker";
}

export default function OperationsPage() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const nextJobs = await listJobs();
      setJobs(nextJobs);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const activeJobs = useMemo(() => jobs.filter((job) => job.status === "queued" || job.status === "running"), [jobs]);
  const recentJobs = useMemo(() => jobs.slice(0, 8), [jobs]);
  const activePipeline = activeJobs[0] ?? recentJobs[0] ?? null;

  return (
    <AppShell active="ops">
      <section className="section">
        <div className="container" style={panelStyle}>
          <div style={artStyle} aria-label="Agent HQ operations illustration">
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(94,234,212,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(94,234,212,0.06) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
            <div style={{ position: "absolute", left: "2rem", top: "1.5rem", fontSize: "clamp(2.4rem, 7vw, 5rem)", fontWeight: 900, letterSpacing: "-0.08em", textShadow: "0 5px 0 rgba(0,0,0,0.45), 0 0 28px rgba(94,234,212,0.45)" }}>
              AGENT HQ
            </div>
            <div style={{ position: "absolute", left: "2rem", right: "2rem", bottom: "2rem", display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "1rem" }}>
              <div style={chipStyle}>
                <div className="preview-title">System agents</div>
                <div className="list" style={{ marginTop: "0.8rem" }}>
                  <div className="list-item"><span>Veo Worker</span><span className={activeJobs.some((job) => job.job_type === "generate-veo-image-video") ? "badge" : "badge-muted"}>watching</span></div>
                  <div className="list-item"><span>TTS Agent</span><span className={activeJobs.some((job) => job.job_type === "generate-avatar" && job.progress < 55) ? "badge" : "badge-muted"}>watching</span></div>
                  <div className="list-item"><span>Avatar Renderer</span><span className={activeJobs.some((job) => job.job_type === "generate-avatar" && job.progress >= 55) ? "badge" : "badge-muted"}>watching</span></div>
                </div>
              </div>
              <div style={chipStyle}>
                <div className="preview-title">Workflow</div>
                <div className="job-stage" style={{ marginTop: "1rem" }}>
                  <span>Upload</span><span>Prompt</span><span>Queue</span><span>Render</span>
                </div>
                <div className="progress" aria-label="System load" style={{ marginTop: "1rem" }}>
                  <div className="progress-bar" style={{ width: `${activeJobs.length > 0 ? 82 : 18}%` }} />
                </div>
                <div className="helper" style={{ marginTop: "1rem" }}>
                  {activeJobs.length > 0 ? `${activeJobs.length} active job(s) are being coordinated.` : "All agents idle. Queue a job to start the room."}
                </div>
              </div>
            </div>
          </div>

          <div className="surface">
            <div className="section-head">
              <div>
                <span className="eyebrow">Live operations</span>
                <h1 className="page-title">What is running now?</h1>
                <p className="page-copy">
                  Agent HQ watches the local SQLite job queue and shows whether Veo, TTS, or avatar rendering is active.
                </p>
              </div>
              <button className="button-secondary" type="button" onClick={() => void refresh()} disabled={loading}>
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            <div className="stat-grid">
              <div className="stat"><div className="stat-label"><Clock size={15} />Queued</div><div className="stat-value">{countJobs(jobs, "queued")}</div></div>
              <div className="stat"><div className="stat-label"><Activity size={15} />Running</div><div className="stat-value">{countJobs(jobs, "running")}</div></div>
              <div className="stat"><div className="stat-label"><CheckCircle2 size={15} />Done</div><div className="stat-value">{countJobs(jobs, "completed")}</div></div>
              <div className="stat"><div className="stat-label"><TriangleAlert size={15} />Failed</div><div className="stat-value">{countJobs(jobs, "failed")}</div></div>
            </div>

            <div className="record-preview" style={{ marginTop: "1rem" }}>
              <div className="record-preview-head">
                <div>
                  <div className="preview-title">Current pipeline</div>
                  <div className="preview-note">
                    {activePipeline ? getPipelineLabel(activePipeline.job_type) : "No jobs have been created yet"}
                  </div>
                </div>
                <span className={activePipeline?.status === "completed" ? "badge" : "badge-muted"}>
                  {activePipeline ? STATUS_LABELS[activePipeline.status] ?? activePipeline.status : "Idle"}
                </span>
              </div>
              {activePipeline ? (
                <>
                  <div className="job-stage"><span>{getAgentLabel(activePipeline)}</span><span>{activePipeline.progress}%</span></div>
                  <div className="progress" aria-label="Current pipeline progress"><div className="progress-bar" style={{ width: `${activePipeline.progress}%` }} /></div>
                  <div className="helper">{activePipeline.text?.slice(0, 180) || activePipeline.id}</div>
                </>
              ) : (
                <div className="empty-state"><Bot size={18} /><span className="muted">Queue a Veo or avatar generation job to light up this dashboard.</span></div>
              )}
            </div>

            <div className="record-actions" style={{ marginTop: "1rem" }}>
              <Link className="button" href="/veo"><Sparkles size={16} />Queue Veo job</Link>
              <Link className="button-secondary" href="/generate"><Film size={16} />Queue avatar job</Link>
            </div>
            <div className="helper" style={{ marginTop: "0.8rem" }}>Last updated: {lastUpdated ?? "not yet"}</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="surface">
            <div className="section-head">
              <div>
                <h2>Recent queue activity</h2>
                <p className="page-copy">Latest jobs from the same queue used by History, Veo, and avatar generation.</p>
              </div>
              <Link className="button-ghost" href="/history">Open history</Link>
            </div>
            <div className="list">
              {recentJobs.map((job) => (
                <div className="list-item" key={job.id}>
                  <div>
                    <strong>{job.id}</strong>
                    <div className="muted">{getPipelineLabel(job.job_type)} · {getAgentLabel(job)}</div>
                  </div>
                  <div className="record-actions">
                    <span className={job.status === "completed" ? "badge" : "badge-muted"}>{STATUS_LABELS[job.status] ?? job.status}</span>
                    <Link className="button-ghost" href={`/history/${job.id}`}>Detail</Link>
                  </div>
                </div>
              ))}
              {recentJobs.length === 0 ? <div className="muted">No queue activity yet.</div> : null}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
