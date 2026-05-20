"use client";

import { useEffect, useRef, useState } from "react";
import { CircleStop, Mic2, Play, Trash2, Upload } from "lucide-react";

import { uploadVoice } from "@/lib/api";
import type { VoiceItem } from "@/lib/types";

type Props = {
  onUploaded?: (voice: VoiceItem) => void;
  compact?: boolean;
};

type Mode = "upload" | "record";

export function VoiceUploader({ onUploaded, compact = false }: Props) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("th");
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>("upload");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [canRecord, setCanRecord] = useState(false);
  const [mimeType, setMimeType] = useState("");
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canDelete = Boolean(file);

  useEffect(() => {
    setCanRecord(Boolean(globalThis.navigator?.mediaDevices?.getUserMedia));
    if (typeof MediaRecorder !== "undefined") {
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
      setMimeType(candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "");
    }
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      recorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!file) {
      setRecordedUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setRecordedUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  function clearRecordedSample() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setMessage("Recorded sample cleared.");
  }

  async function startRecording() {
    try {
      setMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        const extension = blob.type.includes("ogg") ? "ogg" : "webm";
        const recordedFile = new File([blob], `recorded-voice.${extension}`, {
          type: blob.type || "audio/webm",
        });
        setFile(recordedFile);
        chunksRef.current = [];
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((seconds) => seconds + 1);
      }, 1000);
      setMessage("Recording started. Speak clearly, then stop when you're done.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not access microphone");
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recorderRef.current?.stop();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    recorderRef.current = null;
    setIsRecording(false);
    setMessage("Recording saved. You can submit it now.");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setMessage(mode === "record" ? "Please record a sample first." : "Please choose a voice sample.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("name", name || "Voice sample");
      form.append("language", language);
      form.append("file", file);
      const result = await uploadVoice(form);
      setMessage(`Saved ${result.name} as ${result.voice_id}.`);
      onUploaded?.(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={compact ? "form uploader compact" : "form uploader"} onSubmit={handleSubmit}>
      <div className="field">
        <label>Source</label>
        <div className="toggle-group">
          <button
            type="button"
            className={mode === "upload" ? "toggle active" : "toggle"}
            onClick={() => {
              setMode("upload");
              setMessage(null);
            }}
          >
            <Upload size={14} />
            Upload
          </button>
          <button
            type="button"
            className={mode === "record" ? "toggle active" : "toggle"}
            onClick={() => {
              setMode("record");
              setMessage(null);
            }}
          >
            <Mic2 size={14} />
            Record
          </button>
        </div>
      </div>
      <div className="field">
        <label htmlFor="voice-name">Voice name</label>
        <input
          id="voice-name"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="My Thai voice"
        />
      </div>
      <div className="split">
        <div className="field">
          <label htmlFor="voice-language">Language</label>
          <select
            id="voice-language"
            className="select"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            <option value="th">Thai</option>
            <option value="en">English</option>
            <option value="ja">Japanese</option>
          </select>
        </div>
        {mode === "upload" ? (
          <div className="field">
            <label htmlFor="voice-file">Audio file</label>
            <input
              ref={fileInputRef}
              id="voice-file"
              className="file-input"
              type="file"
              accept=".wav,.mp3,.m4a,.webm,.ogg"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setMessage(null);
              }}
            />
          </div>
        ) : (
          <div className="field">
            <label>Microphone</label>
            <div className="record-box">
              <div className="record-meta">
                <span className={isRecording ? "badge" : "badge-muted"}>{isRecording ? "Recording" : "Ready"}</span>
                <span className="helper">{recordingSeconds}s</span>
              </div>
              <div className="record-actions">
                <button
                  className="button-secondary"
                  type="button"
                  onClick={startRecording}
                  disabled={loading || isRecording || !canRecord}
                >
                  <Mic2 size={16} />
                  Start recording
                </button>
                <button
                  className="button-secondary"
                  type="button"
                  onClick={stopRecording}
                  disabled={!isRecording}
                >
                  <CircleStop size={16} />
                  Stop
                </button>
              </div>
              <div className="helper">
                {canRecord ? "Chrome / Safari microphone access supported." : "Microphone recording is not available in this browser."}
              </div>
              {recordedUrl ? (
                <div className="record-preview">
                  <div className="record-preview-head">
                    <div>
                      <div className="preview-title">Voice preview</div>
                      <div className="helper">{file?.name}</div>
                    </div>
                    <button className="button-ghost" type="button" onClick={clearRecordedSample} disabled={!canDelete}>
                      <Trash2 size={16} />
                      Delete sample
                    </button>
                  </div>
                  <audio className="preview-player" controls src={recordedUrl} />
                  <div className="preview-note">
                    <Play size={14} />
                    Listen once before saving so you can confirm the take sounds right.
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
      <button className="button" type="submit" disabled={loading}>
        <Mic2 size={16} />
        {loading ? "Saving..." : mode === "record" ? "Save recording" : "Upload voice"}
      </button>
      {message ? <div className="helper">{message}</div> : null}
    </form>
  );
}
