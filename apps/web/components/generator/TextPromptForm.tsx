"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { createAvatarJob } from "@/lib/api";

type Props = {
  voiceId: string;
  imageId: string;
  onCreated?: (jobId: string) => void;
};

export function TextPromptForm({ voiceId, imageId, onCreated }: Props) {
  const [text, setText] = useState("สวัสดีครับ วันนี้ผมจะมาทดสอบระบบ AI โคลนเสียงของผม");
  const [language, setLanguage] = useState("th");
  const [refineLipsync, setRefineLipsync] = useState(false);
  const [motionPreset, setMotionPreset] = useState("default");
  const [targetDurationSeconds, setTargetDurationSeconds] = useState("15");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!voiceId || !imageId) {
      setMessage("Please upload both a voice and an image first.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const result = await createAvatarJob({
        voice_id: voiceId,
        image_id: imageId,
        text,
        language,
        options: {
          refine_lipsync: refineLipsync,
          output_format: "mp4",
          motion_preset: motionPreset,
          target_duration_seconds: Number(targetDurationSeconds),
        },
      });
      setMessage(`Job ${result.job_id} queued.`);
      onCreated?.(result.job_id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="text-prompt">Text prompt</label>
        <textarea
          id="text-prompt"
          className="textarea"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type the script you want the cloned voice to speak..."
        />
      </div>
      <div className="split">
        <div className="field">
          <label htmlFor="language">Language</label>
          <select id="language" className="select" value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="th">Thai</option>
            <option value="en">English</option>
            <option value="ja">Japanese</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="refine-lipsync">Refine lip sync</label>
          <select
            id="refine-lipsync"
            className="select"
            value={refineLipsync ? "yes" : "no"}
            onChange={(event) => setRefineLipsync(event.target.value === "yes")}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="motion-preset">Motion preset</label>
        <select
          id="motion-preset"
          className="select"
          value={motionPreset}
          onChange={(event) => setMotionPreset(event.target.value)}
        >
          <option value="default">Normal motion</option>
          <option value="light_static">Light motion / static background</option>
        </select>
        <div className="helper">
          Best for full-body portraits: adds a little more head and shoulder motion while the background stays locked.
        </div>
      </div>
      <div className="field">
        <label htmlFor="target-duration">Target duration</label>
        <select
          id="target-duration"
          className="select"
          value={targetDurationSeconds}
          onChange={(event) => setTargetDurationSeconds(event.target.value)}
        >
          <option value="15">15 seconds</option>
          <option value="20">20 seconds</option>
          <option value="25">25 seconds</option>
          <option value="30">30 seconds</option>
        </select>
        <div className="helper">
          Audio length is guided toward this duration. Keep it between 15 and 30 seconds for the cleanest results.
        </div>
      </div>
      <button className="button" type="submit" disabled={loading}>
        <ArrowRight size={16} />
        {loading ? "Queueing..." : "Create avatar job"}
      </button>
      {message ? <div className="helper">{message}</div> : null}
    </form>
  );
}
