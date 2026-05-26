"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Film, ImagePlus, Sparkles } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { JobProgress } from "@/components/generator/JobProgress";
import { createVeoImageVideoJob, listJobs, revealFileInFinder, resolveStorageFileUrl } from "@/lib/api";
import type { JobItem } from "@/lib/types";

const VEO_JOB_TYPE = "generate-veo-image-video";
const DEFAULT_PROMPT =
  "Animate this image into a cinematic 8-second video. Add natural camera movement, realistic lighting, subtle motion, and matching ambient sound.";

export default function VeoImageVideoPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [resolution, setResolution] = useState("720p");
  const [durationSeconds, setDurationSeconds] = useState("8");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const veoJobs = useMemo(() => jobs.filter((job) => job.job_type === VEO_JOB_TYPE), [jobs]);
  const activeJob = veoJobs.find((job) => job.status === "running" || job.status === "queued") ?? null;
  const latestJob = veoJobs[0] ?? null;
  const outputUrl = resolveStorageFileUrl(latestJob?.video_output_path);

  const refreshJobs = useCallback(async () => {
    const jobList = await listJobs();
    setJobs(jobList);
    const nextActiveJob = jobList.find(
      (job) => job.job_type === VEO_JOB_TYPE && (job.status === "running" || job.status === "queued"),
    );
    setActiveJobId(nextActiveJob?.id ?? null);
  }, []);

  useEffect(() => {
    void refreshJobs().catch(() => setJobs([]));
  }, [refreshJobs]);

  useEffect(() => {
    if (!activeJob && !activeJobId) {
      return;
    }
    const timer = window.setInterval(() => {
      void refreshJobs().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [activeJob, activeJobId, refreshJobs]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!imageFile) {
      setMessage("Please upload an image first.");
      return;
    }
    if (!prompt.trim()) {
      setMessage("Please write a motion prompt first.");
      return;
    }

    const form = new FormData();
    form.append("file", imageFile);
    form.append("prompt", prompt.trim());
    form.append("aspect_ratio", aspectRatio);
    form.append("resolution", resolution);
    form.append("duration_seconds", durationSeconds);

    setLoading(true);
    setMessage(null);
    try {
      const result = await createVeoImageVideoJob(form);
      setActiveJobId(result.job_id);
      setMessage(`Veo job ${result.job_id} queued.`);
      await refreshJobs();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Veo generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleReveal(path: string | null | undefined) {
    if (!path) {
      return;
    }
    await revealFileInFinder(path).catch(() => undefined);
  }

  return (
    <AppShell active="veo">
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Google Veo image-to-video</span>
              <h1 className="page-title">Generate video from one image</h1>
              <p className="page-copy">
                Upload any starting frame, describe the movement, then let the worker call Google Veo and save the MP4
                into local storage.
              </p>
            </div>
          </div>
          <div className="grid-3">
            <form className="surface form" onSubmit={handleSubmit}>
              <h3>1. Image and motion prompt</h3>
              <div className="field">
                <label htmlFor="veo-image">Starting image</label>
                <input
                  id="veo-image"
                  className="file-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                />
                <div className="helper">
                  {imageFile ? `Selected: ${imageFile.name}` : "Use a clear frame close to the first scene you want."}
                </div>
              </div>
              <div className="field">
                <label htmlFor="veo-prompt">Motion prompt</label>
                <textarea
                  id="veo-prompt"
                  className="textarea"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Describe camera motion, subject movement, scene style, and audio..."
                />
                <div className="helper">Keep it direct: subject, movement, camera, mood, and sound.</div>
              </div>
              <button className="button" type="submit" disabled={loading}>
                <Sparkles size={16} />
                {loading ? "Queueing Veo job..." : "Generate with Veo"}
              </button>
              {message ? <div className="helper">{message}</div> : null}
            </form>

            <div className="surface form">
              <h3>2. Output settings</h3>
              <div className="field">
                <label htmlFor="veo-aspect">Aspect ratio</label>
                <select id="veo-aspect" className="select" value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}>
                  <option value="16:9">16:9 landscape</option>
                  <option value="9:16">9:16 portrait</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="veo-resolution">Resolution</label>
                <select
                  id="veo-resolution"
                  className="select"
                  value={resolution}
                  onChange={(event) => {
                    setResolution(event.target.value);
                    if (event.target.value === "1080p") {
                      setDurationSeconds("8");
                    }
                  }}
                >
                  <option value="720p">720p</option>
                  <option value="1080p">1080p</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="veo-duration">Duration</label>
                <select
                  id="veo-duration"
                  className="select"
                  value={durationSeconds}
                  onChange={(event) => setDurationSeconds(event.target.value)}
                  disabled={resolution === "1080p"}
                >
                  <option value="4">4 seconds</option>
                  <option value="6">6 seconds</option>
                  <option value="8">8 seconds</option>
                </select>
                <div className="helper">1080p jobs are locked to 8 seconds.</div>
              </div>
            </div>

            <div className="surface">
              <h3>3. Job progress</h3>
              <JobProgress activeJobId={activeJob?.id ?? activeJobId} />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid-3">
          <div className="surface">
            <h3>Latest Veo output</h3>
            {latestJob?.video_output_path && outputUrl ? (
              <div className="stack">
                <video className="preview-player" controls src={outputUrl} />
                <div className="record-actions">
                  <a className="button-ghost" href={outputUrl} target="_blank" rel="noreferrer">
                    <Film size={16} />
                    Open video
                  </a>
                  <button className="button-secondary" type="button" onClick={() => void handleReveal(latestJob.video_output_path)}>
                    Open Finder
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <ImagePlus size={18} />
                <span className="muted">The MP4 preview appears here after the worker completes the Veo job.</span>
              </div>
            )}
            {latestJob?.error_message ? (
              <div className="result-error" style={{ marginTop: "1rem" }}>
                <strong>Veo job failed</strong>
                <div className="result-error-body">{latestJob.error_message}</div>
              </div>
            ) : null}
          </div>

          <div className="surface">
            <h3>Recent Veo jobs</h3>
            <div className="list">
              {veoJobs.map((job) => (
                <div className="list-item" key={job.id}>
                  <div>
                    <strong>{job.id}</strong>
                    <div className="muted">{job.text?.slice(0, 120) || "No prompt"}</div>
                  </div>
                  <span className={job.status === "completed" ? "badge" : "badge-muted"}>{job.status}</span>
                </div>
              ))}
              {veoJobs.length === 0 ? <div className="muted">No Veo jobs yet.</div> : null}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
