"use client";

import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { createAvatarJob, generateScript } from "@/lib/api";
import type { ScriptGenerateResponse } from "@/lib/types";

type Props = {
  voiceId: string;
  imageId: string;
  onCreated?: (jobId: string) => void;
};

type ScriptMode = "manual" | "ai";

const DEFAULT_SCRIPT = "บางวันที่เราเหนื่อย...\nไม่ได้แปลว่าเราอ่อนแอ\n\nมันแปลว่าเราเดินทางมาไกลมากแล้ว\n\nพักได้ครับ แต่อย่าหยุดเชื่อในตัวเอง";

export function TextPromptForm({ voiceId, imageId, onCreated }: Props) {
  const [scriptMode, setScriptMode] = useState<ScriptMode>("manual");
  const [topic, setTopic] = useState("คนที่กำลังเหนื่อยแต่ยังต้องยิ้ม");
  const [audience, setAudience] = useState("คนทำงานที่กำลังเหนื่อย");
  const [text, setText] = useState(DEFAULT_SCRIPT);
  const [language, setLanguage] = useState("th");
  const [refineLipsync, setRefineLipsync] = useState(false);
  const [motionPreset, setMotionPreset] = useState("light_static");
  const [targetDurationSeconds, setTargetDurationSeconds] = useState("25");
  const [voiceAgePreset, setVoiceAgePreset] = useState("elderly_warm");
  const [voiceEmotionPreset, setVoiceEmotionPreset] = useState("gentle_reflective");
  const [voiceEmotionStrength, setVoiceEmotionStrength] = useState("0.65");
  const [generatedScript, setGeneratedScript] = useState<ScriptGenerateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleGenerateScript() {
    if (!topic.trim()) {
      setMessage("Please enter a topic before generating a script.");
      return;
    }

    setGeneratingScript(true);
    setMessage(null);
    try {
      const result = await generateScript({
        topic,
        duration_seconds: Number(targetDurationSeconds),
        language,
        mood: voiceEmotionPreset,
        audience,
      });
      setGeneratedScript(result);
      setText(result.script);
      setScriptMode("ai");
      setMessage(result.source === "ai" ? "AI script generated." : "Fallback script generated. Add an API key for AI output.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Script generation failed");
    } finally {
      setGeneratingScript(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!voiceId || !imageId) {
      setMessage("Please upload both a voice and an image first.");
      return;
    }
    if (!text.trim()) {
      setMessage("Please write or generate a script first.");
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
          voice_age_preset: voiceAgePreset,
          voice_emotion_preset: voiceEmotionPreset,
          voice_emotion_strength: Number(voiceEmotionStrength),
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
        <label>Script mode</label>
        <div className="toggle-group">
          <button
            className={scriptMode === "manual" ? "toggle active" : "toggle"}
            type="button"
            onClick={() => setScriptMode("manual")}
          >
            Write manually
          </button>
          <button
            className={scriptMode === "ai" ? "toggle active" : "toggle"}
            type="button"
            onClick={() => setScriptMode("ai")}
          >
            <Sparkles size={15} />
            AI generate
          </button>
        </div>
      </div>

      {scriptMode === "ai" ? (
        <div className="record-box">
          <div className="field">
            <label htmlFor="script-topic">Topic</label>
            <input
              id="script-topic"
              className="input"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="เช่น คนที่กำลังเหนื่อยแต่ยังต้องสู้"
            />
          </div>
          <div className="field">
            <label htmlFor="script-audience">Audience</label>
            <input
              id="script-audience"
              className="input"
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              placeholder="เช่น คนทำงานที่กำลังเหนื่อย"
            />
          </div>
          <button className="button-secondary" type="button" onClick={handleGenerateScript} disabled={generatingScript}>
            <Sparkles size={16} />
            {generatingScript ? "Generating script..." : "Generate script"}
          </button>
          {generatedScript ? (
            <div className="record-preview">
              <div className="record-preview-head">
                <div>
                  <div className="preview-title">{generatedScript.hook}</div>
                  <div className="preview-note">Source: {generatedScript.source}</div>
                </div>
              </div>
              <div className="helper">Caption: {generatedScript.caption}</div>
              <div className="helper">Subtitles: {generatedScript.subtitles.slice(0, 4).join(" / ")}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="text-prompt">Script for voice</label>
        <textarea
          id="text-prompt"
          className="textarea"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type the script you want the cloned voice to speak..."
        />
        <div className="helper">For 15-30 second clips, keep Thai scripts around 35-110 words.</div>
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
        </div>
      </div>

      <div className="split">
        <div className="field">
          <label htmlFor="voice-age">Voice age preset</label>
          <select id="voice-age" className="select" value={voiceAgePreset} onChange={(event) => setVoiceAgePreset(event.target.value)}>
            <option value="elderly_warm">Elderly warm</option>
            <option value="elderly_deep">Elderly deep</option>
            <option value="natural">Natural</option>
            <option value="none">No post-process</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="voice-emotion">Voice emotion</label>
          <select
            id="voice-emotion"
            className="select"
            value={voiceEmotionPreset}
            onChange={(event) => setVoiceEmotionPreset(event.target.value)}
          >
            <option value="warm_encouraging">Warm encouraging</option>
            <option value="gentle_reflective">Gentle reflective</option>
            <option value="hopeful">Hopeful</option>
            <option value="sad_soft">Sad soft</option>
            <option value="neutral">Neutral</option>
            <option value="none">None</option>
          </select>
        </div>
      </div>

      <div className="split">
        <div className="field">
          <label htmlFor="emotion-strength">Emotion strength</label>
          <select
            id="emotion-strength"
            className="select"
            value={voiceEmotionStrength}
            onChange={(event) => setVoiceEmotionStrength(event.target.value)}
          >
            <option value="0.35">Light</option>
            <option value="0.55">Medium</option>
            <option value="0.65">Strong</option>
            <option value="0.8">Very strong</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="motion-preset">Motion preset</label>
          <select
            id="motion-preset"
            className="select"
            value={motionPreset}
            onChange={(event) => setMotionPreset(event.target.value)}
          >
            <option value="light_static">Light motion / static background</option>
            <option value="default">Normal motion</option>
          </select>
        </div>
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
        <div className="helper">
          Use light motion with static background for Reels/TikTok. Strong emotion can sound unnatural with some reference voices.
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
