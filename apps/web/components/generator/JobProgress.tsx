"use client";

import { useEffect, useState } from "react";

import { listJobs } from "@/lib/api";
import type { JobItem } from "@/lib/types";

type Props = {
  activeJobId?: string | null;
};

function getStageLabel(progress: number, status: string) {
  if (status === "failed") {
    return "Failed";
  }
  if (status === "completed") {
    return "Completed";
  }
  if (progress < 20) {
    return "Starting";
  }
  if (progress < 55) {
    return "Generating voice";
  }
  if (progress < 65) {
    return "Voice ready";
  }
  if (progress < 95) {
    return "Rendering avatar";
  }
  return "Finishing";
}

export function JobProgress({ activeJobId }: Props) {
  const [job, setJob] = useState<JobItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pollingTimer: number | null = null;

    const findJob = (jobs: JobItem[]) =>
      (activeJobId
        ? jobs.find((entry) => entry.id === activeJobId)
        : jobs.find((entry) => entry.status === "running" || entry.status === "queued")) ?? null;

    const stopPolling = () => {
      if (pollingTimer !== null) {
        window.clearInterval(pollingTimer);
        pollingTimer = null;
      }
    };

    const syncJob = async () => {
      try {
        const jobs = await listJobs();
        if (!cancelled) {
          const nextJob = findJob(jobs);
          setJob(nextJob);
          if (nextJob?.status !== "running" && nextJob?.status !== "queued") {
            stopPolling();
          } else if (pollingTimer === null) {
            pollingTimer = window.setInterval(() => {
              void syncJob();
            }, 1000);
          }
        }
      } catch {
        if (!cancelled) {
          setJob(null);
          stopPolling();
        }
      }
    };

    void syncJob();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [activeJobId]);

  if (!activeJobId) {
    return job ? (
      <div className="stack">
        <div className="list-item">
          <div>
            <strong>{job.id}</strong>
            <div className="muted">{job.job_type}</div>
          </div>
          <span className={job.status === "completed" ? "badge" : "badge-muted"}>{job.status}</span>
        </div>
        <div className="progress" aria-label="Job progress">
          <div className="progress-bar" style={{ width: `${job.progress}%` }} />
        </div>
        <div className="muted">Progress: {job.progress}%</div>
      </div>
    ) : (
      <div className="muted">No active job yet.</div>
    );
  }

  if (!job) {
    return <div className="muted">Fetching job status for {activeJobId}...</div>;
  }

  return (
    <div className="stack">
      <div className="list-item">
        <div>
          <strong>{job.id}</strong>
          <div className="muted">{job.job_type}</div>
        </div>
        <span className={job.status === "completed" ? "badge" : "badge-muted"}>{job.status}</span>
      </div>
      <div className="job-stage">
        <span>{getStageLabel(job.progress, job.status)}</span>
        <span>{job.progress}%</span>
      </div>
      <div className="progress" aria-label="Job progress">
        <div className="progress-bar" style={{ width: `${job.progress}%` }} />
      </div>
    </div>
  );
}
