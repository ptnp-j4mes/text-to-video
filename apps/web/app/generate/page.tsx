"use client";

import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { ImageUploader } from "@/components/upload/ImageUploader";
import { JobProgress } from "@/components/generator/JobProgress";
import { ResultPreview } from "@/components/generator/ResultPreview";
import { TextPromptForm } from "@/components/generator/TextPromptForm";
import { VoiceUploader } from "@/components/upload/VoiceUploader";
import { listImages, listJobs, listVoices } from "@/lib/api";
import type { JobItem } from "@/lib/types";

export default function GeneratePage() {
  const [voiceId, setVoiceId] = useState("");
  const [imageId, setImageId] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [latestJob, setLatestJob] = useState<JobItem | null>(null);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const activeJob = jobs.find((job) => job.status === "running" || job.status === "queued") ?? null;
  const hasActiveJob = activeJob !== null;

  const refreshData = useCallback(async () => {
    const [voiceList, imageList, jobList] = await Promise.all([listVoices(), listImages(), listJobs()]);
    const nextActiveJob = jobList.find((job) => job.status === "running" || job.status === "queued") ?? null;
    setJobs(jobList);
    setLatestJob(jobList[0] ?? null);
    setVoiceId((current) => current || voiceList[0]?.voice_id || "");
    setImageId((current) => current || imageList[0]?.image_id || "");
    setJobId(nextActiveJob?.id ?? null);
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!hasActiveJob) {
      return;
    }
    const timer = window.setInterval(() => {
      void refreshData();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [hasActiveJob, refreshData]);

  return (
    <AppShell active="generate">
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h1 className="page-title">Generate avatar</h1>
              <p className="page-copy">
                Start by enrolling a voice and a portrait, then queue a generation job for the worker.
              </p>
            </div>
          </div>
          <div className="grid-3">
            <div className="surface">
              <h3>1. Upload voice</h3>
              <VoiceUploader
                compact
                onUploaded={(voice) => {
                  setVoiceId(voice.voice_id);
                  void refreshData();
                }}
              />
            </div>
            <div className="surface">
              <h3>2. Upload portrait</h3>
              <ImageUploader
                onUploaded={(image) => {
                  setImageId(image.image_id);
                  void refreshData();
                }}
              />
            </div>
            <div className="surface">
              <h3>3. Create job</h3>
              <TextPromptForm
                voiceId={voiceId}
                imageId={imageId}
                onCreated={(createdJobId) => {
                  setJobId(createdJobId);
                  void refreshData();
                }}
              />
            </div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container grid-3">
          <div className="surface">
            <h3>Selected inputs</h3>
            <div className="list">
              <div className="list-item">
                <span>Voice</span>
                <strong>{voiceId || "No voice selected"}</strong>
              </div>
              <div className="list-item">
                <span>Image</span>
                <strong>{imageId || "No image selected"}</strong>
              </div>
            </div>
          </div>
          <div className="surface">
            <h3>Active job</h3>
            <JobProgress activeJobId={activeJob?.id ?? jobId} />
          </div>
          <div className="surface">
            <h3>Result preview</h3>
            <ResultPreview
              job={latestJob}
              onRetried={(newJobId) => {
                setJobId(newJobId);
                void refreshData();
              }}
            />
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="surface">
            <h3>Recent queue items</h3>
            <div className="list">
              {jobs.map((job) => (
                <div className="list-item" key={job.id}>
                  <div>
                    <strong>{job.id}</strong>
                    <div className="muted">
                      {job.job_type} · {job.language}
                    </div>
                  </div>
                  <span className={job.status === "completed" ? "badge" : "badge-muted"}>{job.status}</span>
                </div>
              ))}
              {jobs.length === 0 ? <div className="muted">No jobs yet.</div> : null}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
