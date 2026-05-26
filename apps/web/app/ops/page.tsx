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
    if (job.progress < 55) {
      return "TTS Agent";
    }
    return "Avatar Renderer";
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
        <div className="container ops-hero">
          <div className="ops-art-panel">
            <div className="ops-art-backdrop">
              <div className="ops-title">AGENT HQ</div>
              <div className="ops-room">
                <div className="server-stack">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="ops-monitor main-monitor">
                  <div className="monitor-title">WORKFLOW</div>
                  <div className="workflow-line" />
                  <div className="workflow-nodes">
                    <span>User</span>
                    <span>Planner</span>
                    <span>Worker</span>
                    <span>Output</span>
                  </div>
                </div>
                <div className="ops-monitor chart-monitor">
                  <div className="monitor-title">QUEUE</div>
                  <div className="bar-chart">
                    <span style={{ height: "35%" }} />
                    <span style={{ height: "70%" }} />
                    <span style={{ height: "50%" }} />
                    <span style={{ height: "85%" }} />
                  </div>
                </div>
                <div className="ops-desk">
                  <span className="desk-glow" />
                </div>
              </div>
            </div>
          </div>

          <div className="surface ops-status-panel">
            <div className="section-head compact-head">
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

            <div className="ops-metrics">
              <div className="stat">
                <div className="stat-label"><Clock size={15} />Queued</div>
                <div className="stat-value">{countJobs(jobs, "queued")}</div>
              </div>
              <div className="stat">
                <div className="stat-label"><Activity size={15} />Running</div>
                <div className="stat-value">{countJobs(jobs, "running")}</div>
              </div>
              <div className="stat">
                <div className="stat-label"><CheckCircle2 size={15} />Done</div>
                <div className="stat-value">{countJobs(jobs, "completed")}</div>
              </div>
              <div className="stat">
                <div className="stat-label"><TriangleAlert size={15} />Failed</div>
                <div className="stat-value">{countJobs(jobs, "failed")}</div>
              </div>
            </div>

            <div className="record-preview">
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
                  <div className="job-stage">
                    <span>{getAgentLabel(activePipeline)}</span>
                    <span>{activePipeline.progress}%</span>
                  </div>
                  <div className="progress" aria-label="Current pipeline progress">
                    <div className="progress-bar" style={{ width: `${activePipeline.progress}%` }} />
                  </div>
                  <div className="helper">{activePipeline.text?.slice(0, 180) || activePipeline.id}</div>
                </>
              ) : (
                <div className="empty-state">
                  <Bot size={18} />
                  <span className="muted">Queue a Veo or avatar generation job to light up this dashboard.</span>
                </div>
              )}
            </div>

            <div className="record-actions">
              <Link className="button" href="/veo">
                <Sparkles size={16} />
                Queue Veo job
              </Link>
              <Link className="button-secondary" href="/generate">
                <Film size={16} />
                Queue avatar job
              </Link>
            </div>
            <div className="helper">Last updated: {lastUpdated ?? "not yet"}</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="surface">
            <div className="section-head compact-head">
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
