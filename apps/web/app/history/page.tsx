"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { listJobs, revealFileInFinder } from "@/lib/api";
import type { JobItem } from "@/lib/types";

export default function HistoryPage() {
  const [jobs, setJobs] = useState<JobItem[]>([]);

  useEffect(() => {
    void listJobs().then(setJobs).catch(() => setJobs([]));
  }, []);

  return (
    <AppShell active="history">
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h1 className="page-title">History</h1>
              <p className="page-copy">Review queued and completed generations from the local SQLite database.</p>
            </div>
          </div>
          <div className="surface">
            <div className="list">
              {jobs.map((job) => (
                <div className="list-item" key={job.id}>
                  <div>
                    <strong>{job.id}</strong>
                    <div className="muted">
                      {job.job_type} · voice {job.voice_id ?? "-"} · image {job.image_id ?? "-"}
                    </div>
                  </div>
                  <div className="record-actions">
                    <Link className="button-ghost" href={`/history/${job.id}`}>
                      Open detail
                    </Link>
                    {job.video_output_path || job.audio_output_path ? (
                      <button
                        className="button-secondary"
                        type="button"
                        onClick={() => void revealFileInFinder(job.video_output_path ?? job.audio_output_path ?? "").catch(() => {})}
                      >
                        Open Finder
                      </button>
                    ) : null}
                    <span className={job.status === "completed" ? "badge" : "badge-muted"}>{job.status}</span>
                  </div>
                </div>
              ))}
              {jobs.length === 0 ? <div className="muted">No generation history yet.</div> : null}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
