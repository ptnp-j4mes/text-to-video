import type { HealthResponse, ImageItem, JobItem, ScriptGenerateResponse, VoiceItem } from "@/lib/types";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:5432";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    ...init,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export function getFileUrl(category: string, fileName: string): string {
  return `${baseUrl}/files/${category}/${fileName}`;
}

export function resolveStorageFileUrl(absolutePath: string | null | undefined): string | null {
  if (!absolutePath) {
    return null;
  }

  const marker = `${absolutePath.includes("\\") ? "\\storage\\" : "/storage/"}`;
  const index = absolutePath.lastIndexOf(marker);
  if (index === -1) {
    return null;
  }

  const relative = absolutePath.slice(index + marker.length);
  const [category, ...rest] = relative.split(/[\\/]/).filter(Boolean);
  if (!category || rest.length === 0) {
    return null;
  }

  return getFileUrl(category, rest.join("/"));
}

export function resolveStorageDirectoryUrl(absolutePath: string | null | undefined): string | null {
  if (!absolutePath) {
    return null;
  }

  const normalizedPath = absolutePath.replaceAll("\\", "/");
  const slashIndex = normalizedPath.lastIndexOf("/");
  if (slashIndex <= 0) {
    return null;
  }

  return `file://${encodeURI(normalizedPath.slice(0, slashIndex))}`;
}

export async function getHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>("/health");
}

export async function listVoices(): Promise<VoiceItem[]> {
  return requestJson<VoiceItem[]>("/voices");
}

export async function listImages(): Promise<ImageItem[]> {
  return requestJson<ImageItem[]>("/images");
}

export async function listJobs(): Promise<JobItem[]> {
  return requestJson<JobItem[]>("/jobs");
}

export async function getJob(jobId: string): Promise<JobItem> {
  return requestJson<JobItem>(`/jobs/${jobId}`);
}

export async function revealFileInFinder(path: string): Promise<{ status: string }> {
  return requestJson<{ status: string }>("/files/reveal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path }),
  });
}

export async function uploadVoice(form: FormData): Promise<VoiceItem> {
  const response = await fetch(`${baseUrl}/voices`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as VoiceItem;
}

export async function uploadImage(form: FormData): Promise<ImageItem> {
  const response = await fetch(`${baseUrl}/images`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as ImageItem;
}

export async function generateScript(payload: {
  topic: string;
  duration_seconds: number;
  language: string;
  mood: string;
  audience: string;
}): Promise<ScriptGenerateResponse> {
  return requestJson<ScriptGenerateResponse>("/scripts/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function createAvatarJob(payload: {
  voice_id: string;
  image_id: string;
  text: string;
  language: string;
  options: {
    refine_lipsync: boolean;
    output_format: string;
    motion_preset: string;
    target_duration_seconds: number;
    voice_age_preset?: string;
    voice_pitch_shift_semitones?: number | null;
    voice_speed?: number | null;
    voice_low_mid_gain_db?: number | null;
    voice_emotion_preset?: string;
    voice_emotion_strength?: number;
  };
}): Promise<{ job_id: string; status: string }> {
  return requestJson<{ job_id: string; status: string }>("/jobs/generate-avatar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function createVeoImageVideoJob(form: FormData): Promise<{ job_id: string; status: string }> {
  const response = await fetch(`${baseUrl}/jobs/generate-veo-image-video`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as { job_id: string; status: string };
}

export async function retryJob(jobId: string): Promise<{ job_id: string; status: string }> {
  return requestJson<{ job_id: string; status: string }>(`/jobs/${jobId}/retry`, {
    method: "POST",
  });
}
