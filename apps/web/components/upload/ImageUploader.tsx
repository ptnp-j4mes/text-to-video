"use client";

import { useState } from "react";
import { Upload } from "lucide-react";

import { uploadImage } from "@/lib/api";
import type { ImageItem } from "@/lib/types";

type Props = {
  onUploaded?: (image: ImageItem) => void;
};

export function ImageUploader({ onUploaded }: Props) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setMessage("Please choose a portrait image.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("name", name || "Portrait image");
      form.append("file", file);
      const result = await uploadImage(form);
      setMessage(`Saved ${result.name} as ${result.image_id}.`);
      onUploaded?.(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="image-name">Image name</label>
        <input
          id="image-name"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Avatar portrait"
        />
      </div>
      <div className="field">
        <label htmlFor="image-file">Portrait image</label>
        <input
          id="image-file"
          className="file-input"
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </div>
      <button className="button-secondary" type="submit" disabled={loading}>
        <Upload size={16} />
        {loading ? "Saving..." : "Upload image"}
      </button>
      {message ? <div className="helper">{message}</div> : null}
    </form>
  );
}

