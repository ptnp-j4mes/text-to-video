export type HealthResponse = {
  status: "ok";
  device: string;
  tts_engine: string;
  avatar_engine: string;
};

export type VoiceItem = {
  voice_id: string;
  name: string;
  status: string;
  duration_seconds?: number | null;
};

export type ImageItem = {
  image_id: string;
  name: string;
  status: string;
  face_detected: boolean;
};

export type JobItem = {
  id: string;
  job_type: string;
  status: string;
  voice_id?: string | null;
  image_id?: string | null;
  text?: string | null;
  language: string;
  options_json?: string | null;
  audio_output_path?: string | null;
  video_output_path?: string | null;
  error_message?: string | null;
  progress: number;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
};

export type ScriptGenerateResponse = {
  hook: string;
  script: string;
  subtitles: string[];
  caption: string;
  source: "ai" | "fallback";
};
