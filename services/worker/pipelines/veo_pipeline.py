from __future__ import annotations

import base64
import json
import mimetypes
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from services.api.app.config import get_settings
from services.api.app.services.storage_service import output_folder


class VeoApiError(RuntimeError):
    """Raised when the Gemini/Veo API returns an error or incomplete operation."""


@dataclass(slots=True)
class VeoImageToVideoJobContext:
    job_id: str
    prompt: str
    input_image: Path
    options: dict[str, Any]


class VeoImageToVideoPipeline:
    base_url = "https://generativelanguage.googleapis.com/v1beta"

    def __init__(self) -> None:
        self.settings = get_settings()

    def generate(self, job: VeoImageToVideoJobContext) -> Path:
        api_key = self.settings.gemini_api_key
        if not api_key:
            raise VeoApiError("GEMINI_API_KEY is required to generate videos with Google Veo")
        if not job.input_image.exists():
            raise FileNotFoundError(f"Input image not found: {job.input_image}")

        model = str(job.options.get("model") or self.settings.veo_model)
        model_path = model if model.startswith("models/") else f"models/{model}"
        image_bytes = job.input_image.read_bytes()
        mime_type = str(job.options.get("source_mime_type") or mimetypes.guess_type(job.input_image.name)[0] or "image/png")

        parameters = {
            "aspectRatio": self._option(job, "aspect_ratio", "16:9"),
            "durationSeconds": int(job.options.get("duration_seconds") or 8),
            "personGeneration": self._option(job, "person_generation", "allow_adult"),
            "resolution": self._option(job, "resolution", "720p"),
        }
        payload = {
            "instances": [
                {
                    "prompt": job.prompt,
                    "image": {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": base64.b64encode(image_bytes).decode("ascii"),
                        },
                    },
                },
            ],
            "parameters": parameters,
        }

        operation = self._request_json(
            url=f"{self.base_url}/{model_path}:predictLongRunning",
            api_key=api_key,
            method="POST",
            payload=payload,
        )
        operation_name = operation.get("name")
        if not isinstance(operation_name, str) or not operation_name:
            raise VeoApiError(f"Veo did not return an operation name: {operation}")

        completed = self._poll_operation(operation_name=operation_name, api_key=api_key)
        video_uri = self._extract_video_uri(completed)
        return self._download_video(video_uri=video_uri, api_key=api_key, job_id=job.job_id)

    def _option(self, job: VeoImageToVideoJobContext, key: str, default: str) -> str:
        value = job.options.get(key)
        return str(value) if value not in {None, ""} else default

    def _request_json(self, *, url: str, api_key: str, method: str = "GET", payload: dict[str, Any] | None = None) -> dict[str, Any]:
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = urllib.request.Request(
            url,
            data=body,
            method=method,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": api_key,
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                data = response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise VeoApiError(f"Veo API request failed with {exc.code}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise VeoApiError(f"Veo API request failed: {exc.reason}") from exc
        if not data:
            return {}
        return json.loads(data)

    def _poll_operation(self, *, operation_name: str, api_key: str) -> dict[str, Any]:
        deadline = time.monotonic() + self.settings.veo_operation_timeout_seconds
        poll_interval = max(2, self.settings.veo_poll_interval_seconds)
        status_url = f"{self.base_url}/{operation_name}"

        while time.monotonic() < deadline:
            operation = self._request_json(url=status_url, api_key=api_key)
            if operation.get("done") is True:
                if "error" in operation:
                    raise VeoApiError(f"Veo operation failed: {operation['error']}")
                return operation
            time.sleep(poll_interval)

        raise VeoApiError(f"Veo operation timed out after {self.settings.veo_operation_timeout_seconds} seconds")

    def _extract_video_uri(self, operation: dict[str, Any]) -> str:
        samples = (
            operation.get("response", {})
            .get("generateVideoResponse", {})
            .get("generatedSamples", [])
        )
        if not samples:
            raise VeoApiError(f"Veo operation completed without generated samples: {operation}")
        video = samples[0].get("video", {})
        video_uri = video.get("uri") or video.get("downloadUri")
        if not isinstance(video_uri, str) or not video_uri:
            raise VeoApiError(f"Veo operation completed without a downloadable video URI: {operation}")
        return video_uri

    def _download_video(self, *, video_uri: str, api_key: str, job_id: str) -> Path:
        request = urllib.request.Request(video_uri, headers={"x-goog-api-key": api_key})
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                video_bytes = response.read()
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise VeoApiError(f"Veo video download failed with {exc.code}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise VeoApiError(f"Veo video download failed: {exc.reason}") from exc

        destination = output_folder("video") / f"{job_id}_veo.mp4"
        destination.write_bytes(video_bytes)
        return destination
