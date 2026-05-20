import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { ResultPreview } from "@/components/generator/ResultPreview";
import { getJob, revealFileInFinder } from "@/lib/api";

type Props = {
  params: {
    jobId: string;
  };
};

export default async function HistoryJobDetailPage({ params }: Props) {
  const job = await getJob(params.jobId).catch(() => null);

  if (!job) {
    notFound();
  }

  return (
    <AppShell active="history">
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h1 className="page-title">Job detail</h1>
              <p className="page-copy">Inspect the full job payload, output files, and retry controls.</p>
            </div>
            <Link className="button-ghost" href="/history">
              Back to history
            </Link>
          </div>
          <div className="grid-3">
            <div className="surface">
              <h3>Summary</h3>
              <div className="list">
                <div className="list-item">
                  <div>
                    <div className="muted">Job ID</div>
                    <strong>{job.id}</strong>
                  </div>
                  <span className={job.status === "completed" ? "badge" : "badge-muted"}>{job.status}</span>
                </div>
                <div className="list-item">
                  <div>
                    <div className="muted">Type</div>
                    <strong>{job.job_type}</strong>
                  </div>
                  <div className="muted">{job.language}</div>
                </div>
                <div className="list-item">
                  <div>
                    <div className="muted">Created</div>
                    <strong>{job.created_at}</strong>
                  </div>
                </div>
                <div className="list-item">
                  <div>
                    <div className="muted">Started</div>
                    <strong>{job.started_at ?? "Not started"}</strong>
                  </div>
                </div>
                <div className="list-item">
                  <div>
                    <div className="muted">Finished</div>
                    <strong>{job.finished_at ?? "Not finished"}</strong>
                  </div>
                </div>
              </div>
            </div>
            <div className="surface">
              <h3>Actions</h3>
              <div className="stack">
                {job.video_output_path || job.audio_output_path ? (
                  <button
                    className="button-secondary"
                    type="button"
                    onClick={() => void revealFileInFinder(job.video_output_path ?? job.audio_output_path ?? "").catch(() => {})}
                  >
                    Open Finder
                  </button>
                ) : (
                  <div className="muted">Finder is available after the job produces an output file.</div>
                )}
                <Link className="button-ghost" href="/history">
                  Back to history
                </Link>
              </div>
            </div>
            <div className="surface">
              <h3>Outputs</h3>
              <ResultPreview job={job} />
            </div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="surface">
            <h3>Inputs</h3>
            <div className="list">
              <div className="list-item">
                <div>
                  <div className="muted">Voice</div>
                  <strong>{job.voice_id ?? "-"}</strong>
                </div>
                <div className="muted">Image {job.image_id ?? "-"}</div>
              </div>
              <div className="list-item">
                <div>
                  <div className="muted">Prompt</div>
                  <strong>{job.text ?? "-"}</strong>
                </div>
              </div>
              <div className="list-item">
                <div>
                  <div className="muted">Options</div>
                  <strong>{job.options_json ?? "-"}</strong>
                </div>
              </div>
              {job.error_message ? (
                <div className="result-error">
                  <strong>Failure message</strong>
                  <div className="result-error-body">{job.error_message}</div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
