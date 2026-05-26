"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Bot, Cpu, Film, RefreshCw, Sparkles } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { getHealth, listJobs } from "@/lib/api";
import type { HealthResponse, JobItem } from "@/lib/types";

const AVATAR_JOB_TYPE = "generate-avatar";
const VEO_JOB_TYPE = "generate-veo-image-video";
const ACTIVE_STATUSES = new Set(["queued", "running"]);

function badgeClass(status: string) {
  if (status === "completed" || status === "ok" || status === "ready") {
    return "badge";
  }
  if (status === "failed" || status === "offline") {
    return "badge-danger";
  }
  return "badge-muted";
}

function countJobs(jobs: JobItem[], status: string) {
  return jobs.filter((job) => job.status === status).length;
}

function getPipelineStatus(jobs: JobItem[], jobType: string) {
  const selected = jobs.filter((job) => job.job_type === jobType);
  const running = countJobs(selected, "running");
  const queued = countJobs(selected, "queued");
  const completed = countJobs(selected, "completed");
  const failed = countJobs(selected, "failed");
  const label = running > 0 ? "running" : queued > 0 ? "queued" : failed > 0 && completed === 0 ? "attention" : completed > 0 ? "ready" : "idle";
  return { label, running, queued, completed, failed };
}

export default function AgentHqPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [healthResult, jobList] = await Promise.all([getHealth(), listJobs()]);
      setHealth(healthResult);
      setJobs(jobList);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (refreshError) {
      setHealth(null);
      setJobs([]);
      setError(refreshError instanceof Error ? refreshError.message : "Unable to load project status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const counts = useMemo(
    () => ({
      total: jobs.length,
      queued: countJobs(jobs, "queued"),
      running: countJobs(jobs, "running"),
      completed: countJobs(jobs, "completed"),
      failed: countJobs(jobs, "failed"),
      active: jobs.filter((job) => ACTIVE_STATUSES.has(job.status)).length,
    }),
    [jobs],
  );
  const avatar = useMemo(() => getPipelineStatus(jobs, AVATAR_JOB_TYPE), [jobs]);
  const veo = useMemo(() => getPipelineStatus(jobs, VEO_JOB_TYPE), [jobs]);
  const activeJobs = useMemo(() => jobs.filter((job) => ACTIVE_STATUSES.has(job.status)).slice(0, 6), [jobs]);
  const recentJobs = useMemo(() => jobs.slice(0, 8), [jobs]);

  const apiStatus = health?.status ?? "offline";
  const workerStatus = counts.running > 0 ? "running" : counts.queued > 0 ? "queue waiting" : "idle";

  return (
    <AppShell active="hq">
      <section className="section">
        <div className="container">
          <div className="hq-hero">
            <div className="hq-copy">
              <span className="eyebrow">Agent HQ live command center</span>
              <h1 className="page-title">ดูว่าระบบกำลังทำอะไรอยู่</h1>
              <p className="page-copy">
                รวมสถานะ API, worker queue, Avatar pipeline, Veo pipeline และ job ล่าสุดไว้ในหน้าเดียว
                เพื่อเห็นทันทีว่ากำลัง generate, รอคิว, สำเร็จ หรือ error อยู่ตรงไหน
              </p>
              <div className="hero-actions">
                <button className="button" type="button" onClick={() => void refresh()} disabled={loading}>
                  <RefreshCw size={16} />
                  {loading ? "Refreshing..." : "Refresh status"}
                </button>
                <Link className="button-secondary" href="/generate">Avatar generator</Link>
                <Link className="button-secondary" href="/veo">Veo image video</Link>
              </div>
              <div className="helper">Last updated: {lastUpdated ?? "not loaded yet"}</div>
              {error ? <div className="result-error">{error}</div> : null}
            </div>
            <div className="hq-visual" aria-label="AI Agent HQ status illustration">
              <div className="hq-title">AGENT HQ</div>
              <div className="hq-panel hq-panel-main">
                <div className="hq-panel-head"><span>WORKFLOW</span><span className="badge">LIVE</span></div>
                <div className="hq-flow"><span>User</span><i /><span>Planner</span><i /><span>Worker</span><i /><span>Output</span></div>
              </div>
              <div className="hq-panel hq-panel-left">
                <div className="hq-panel-head"><span>API</span><span className={badgeClass(apiStatus)}>{apiStatus}</span></div>
                <div className="hq-chart" />
              </div>
              <div className="hq-panel hq-panel-right">
                <div className="hq-panel-head"><span>QUEUE</span><span className={counts.active > 0 ? "badge" : "badge-muted"}>{counts.active} active</span></div>
                <div className="hq-bars"><span /><span /><span /></div>
              </div>
              <div className="hq-grid-glow" />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container hq-status-grid">
          <div className="surface hq-status-card"><div className="stat-label"><Activity size={16} /> API</div><div className="stat-value">{apiStatus}</div><span className={badgeClass(apiStatus)}>{health ? "online" : "offline"}</span><p>FastAPI health endpoint</p></div>
          <div className="surface hq-status-card"><div className="stat-label"><Cpu size={16} /> Worker queue</div><div className="stat-value">{workerStatus}</div><span className={counts.active > 0 ? "badge" : "badge-muted"}>{counts.active} active</span><p>queued/running jobs in SQLite</p></div>
          <div className="surface hq-status-card"><div className="stat-label"><Bot size={16} /> Avatar</div><div className="stat-value">{avatar.label}</div><span className={avatar.running > 0 ? "badge" : "badge-muted"}>{avatar.running} running / {avatar.queued} queued</span><p>OmniVoice + SadTalker jobs</p></div>
          <div className="surface hq-status-card"><div className="stat-label"><Sparkles size={16} /> Veo</div><div className="stat-value">{veo.label}</div><span className={veo.running > 0 ? "badge" : "badge-muted"}>{veo.running} running / {veo.queued} queued</span><p>Google Veo image-to-video jobs</p></div>
        </div>
      </section>

      <section className="section">
        <div className="container grid-3">
          <div className="surface"><h3>System counters</h3><div className="list"><div className="list-item"><span>Total jobs</span><strong>{counts.total}</strong></div><div className="list-item"><span>Queued</span><strong>{counts.queued}</strong></div><div className="list-item"><span>Running</span><strong>{counts.running}</strong></div><div className="list-item"><span>Completed</span><strong>{counts.completed}</strong></div><div className="list-item"><span>Failed</span><strong>{counts.failed}</strong></div></div></div>
          <div className="surface"><h3>Active work</h3><div className="list">{activeJobs.map((job) => <div className="list-item" key={job.id}><div><strong>{job.id}</strong><div className="muted">{job.job_type} · {job.progress}%</div></div><span className={badgeClass(job.status)}>{job.status}</span></div>)}{activeJobs.length === 0 ? <div className="muted">ตอนนี้ไม่มีงานที่ queued หรือ running</div> : null}</div></div>
          <div className="surface"><h3>Recent jobs</h3><div className="list">{recentJobs.map((job) => <div className="list-item" key={job.id}><div><strong>{job.id}</strong><div className="muted">{job.job_type}</div><div className="helper">{job.text?.slice(0, 80) || "No prompt text"}</div></div><div className="record-actions">{job.video_output_path ? <span className="badge"><Film size={14} /> Video</span> : null}<span className={badgeClass(job.status)}>{job.status}</span></div></div>)}{recentJobs.length === 0 ? <div className="muted">ยังไม่มี job ในระบบ</div> : null}</div></div>
        </div>
      </section>
    </AppShell>
  );
}
