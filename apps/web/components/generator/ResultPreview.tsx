"use client";

import { AudioLines, Film, RotateCw } from "lucide-react";

import { revealFileInFinder, resolveStorageFileUrl, retryJob } from "@/lib/api";
import type { JobItem } from "@/lib/types";

type Props = {
  job?: JobItem | null;
  onRetried?: (jobId: string) => void;
};

export function ResultPreview({ job, onRetried }: Props) {
  if (!job) {
    return <div className="muted">Results will appear here after the worker completes a job.</div>;
  }

  async function handleRetry() {
    if (!job) {
      return;
    }
    const result = await retryJob(job.id);
    onRetried?.(result.job_id);
  }

  async function handleReveal(path: string) {
    if (!path) {
      return;
    }
    try {
      await revealFileInFinder(path);
    } catch {
      // Finder access is best-effort; keep the UI responsive if the host rejects it.
    }
  }

  return (
    <div className="results">
      <div className="list-item">
        <div>
          <div className="muted">Audio output</div>
          <strong>{job.audio_output_path ? "Generated" : "Pending"}</strong>
        </div>
        <div className="record-actions">
          {job.audio_output_path ? (
            <>
              <a
                className="button-ghost"
                href={resolveStorageFileUrl(job.audio_output_path) ?? job.audio_output_path}
                target="_blank"
                rel="noreferrer"
              >
                <AudioLines size={16} />
                Open audio
              </a>
              <button className="button-secondary" type="button" onClick={() => void handleReveal(job.audio_output_path ?? "")}>
                Open Finder
              </button>
            </>
          ) : null}
        </div>
      </div>
      <div className="list-item">
        <div>
          <div className="muted">Video output</div>
          <strong>{job.video_output_path ? "Generated" : "Pending"}</strong>
        </div>
        <div className="record-actions">
          {job.video_output_path ? (
            <>
              <a
                className="button-ghost"
                href={resolveStorageFileUrl(job.video_output_path) ?? job.video_output_path}
                target="_blank"
                rel="noreferrer"
              >
                <Film size={16} />
                Open video
              </a>
              <button className="button-secondary" type="button" onClick={() => void handleReveal(job.video_output_path ?? "")}>
                Open Finder
              </button>
            </>
          ) : null}
        </div>
      </div>
      {job.error_message ? (
        <div className="result-error">
          <div className="result-error-head">
            <strong>Job failed</strong>
            <button className="button-secondary" type="button" onClick={() => void handleRetry()}>
              <RotateCw size={16} />
              Retry job
            </button>
          </div>
          <div className="result-error-body">{job.error_message}</div>
        </div>
      ) : null}
    </div>
  );
}
