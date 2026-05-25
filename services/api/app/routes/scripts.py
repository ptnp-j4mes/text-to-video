from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/scripts", tags=["scripts"])


class ScriptGenerateRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=180)
    duration_seconds: int = Field(default=25, ge=15, le=30)
    language: str = "th"
    mood: str = "gentle_reflective"
    audience: str = "คนทำงานที่กำลังเหนื่อย"


class ScriptGenerateResponse(BaseModel):
    hook: str
    script: str
    subtitles: list[str]
    caption: str
    source: Literal["ai", "fallback"]


def _target_word_hint(duration_seconds: int) -> str:
    if duration_seconds <= 15:
        return "35-55 คำไทย"
    if duration_seconds <= 20:
        return "55-75 คำไทย"
    return "80-110 คำไทย"


def _fallback_script(payload: ScriptGenerateRequest) -> ScriptGenerateResponse:
    topic = payload.topic.strip()
    if payload.duration_seconds <= 15:
        hook = "บางวันที่เราเหนื่อย..."
        script = (
            f"บางวันที่เราเหนื่อย... ไม่ได้แปลว่าเราอ่อนแอ\n\n"
            f"เรื่อง{topic} อาจทำให้ใจเราหนักไปบ้าง\n\n"
            "แต่ขอให้จำไว้นะครับ\nค่อย ๆ ไปก็ได้ แต่อย่าทิ้งตัวเอง"
        )
    elif payload.duration_seconds <= 20:
        hook = "ไม่เป็นไรนะ ถ้าวันนี้ยังไม่ไหว"
        script = (
            f"ไม่เป็นไรนะ ถ้าวันนี้เรื่อง{topic} ทำให้คุณรู้สึกเหนื่อย\n\n"
            "บางครั้งชีวิตไม่ได้ต้องการให้เราเก่งตลอดเวลา\n"
            "มันแค่อยากให้เราอดทนกับตัวเองอย่างอ่อนโยน\n\n"
            "พักได้ครับ แล้วค่อยเริ่มใหม่อีกครั้ง"
        )
    else:
        hook = "ถ้าวันนี้ไม่มีใครเห็นความพยายามของคุณ..."
        script = (
            "ถ้าวันนี้ไม่มีใครเห็นความพยายามของคุณ...\n"
            "ขอให้คุณรู้ไว้นะครับ ว่ามันไม่ได้สูญเปล่า\n\n"
            f"เรื่อง{topic} อาจทำให้คุณรู้สึกช้า เหนื่อย หรือไม่มั่นใจ\n"
            "แต่ทุกก้าวเล็ก ๆ ก็ยังเป็นก้าวที่พาคุณไปข้างหน้า\n\n"
            "พักได้ ช้าหน่อยก็ได้\n"
            "แต่อย่าหยุดเชื่อในคุณค่าของตัวเอง"
        )

    subtitles = [line.strip() for line in script.replace("...", "...").splitlines() if line.strip()]
    caption = f"{hook} #ข้อคิด #กำลังใจ #reels"
    return ScriptGenerateResponse(hook=hook, script=script, subtitles=subtitles, caption=caption, source="fallback")


def _extract_json_object(content: str) -> dict[str, object]:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.removeprefix("json").strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("AI response did not contain a JSON object")

    parsed = json.loads(cleaned[start : end + 1])
    if not isinstance(parsed, dict):
        raise ValueError("AI response JSON was not an object")
    return parsed


def _coerce_response(data: dict[str, object]) -> ScriptGenerateResponse:
    hook = str(data.get("hook") or "").strip()
    script = str(data.get("script") or "").strip()
    caption = str(data.get("caption") or "").strip()
    subtitles_value = data.get("subtitles")

    subtitles: list[str]
    if isinstance(subtitles_value, list):
        subtitles = [str(item).strip() for item in subtitles_value if str(item).strip()]
    else:
        subtitles = [line.strip() for line in script.splitlines() if line.strip()]

    if not hook or not script:
        raise ValueError("AI response was missing hook or script")

    return ScriptGenerateResponse(
        hook=hook,
        script=script,
        subtitles=subtitles,
        caption=caption or hook,
        source="ai",
    )


def _generate_with_ai(payload: ScriptGenerateRequest) -> ScriptGenerateResponse | None:
    api_key = os.environ.get("SCRIPT_AI_API_KEY") or os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        return None

    base_url = os.environ.get("SCRIPT_AI_BASE_URL", "https://api.deepseek.com").rstrip("/")
    model = os.environ.get("SCRIPT_AI_MODEL", "deepseek-v4-flash")
    url = f"{base_url}/chat/completions"

    system_prompt = (
        "You are a Thai short-form video scriptwriter for motivational Reels/TikTok/Shorts. "
        "Write natural Thai for an elderly warm speaker. Return JSON only."
    )
    user_prompt = f"""
Create a Thai motivational short video script.

Topic: {payload.topic}
Audience: {payload.audience}
Mood: {payload.mood}
Target duration: {payload.duration_seconds} seconds
Target length: {_target_word_hint(payload.duration_seconds)}

Rules:
- Thai language only.
- Short spoken sentences.
- Warm, human, reflective, not salesy.
- Suitable for an elderly Thai voice.
- Add natural pauses with line breaks.
- Keep subtitle lines short.

Return valid JSON with exactly these keys:
{{
  "hook": "string",
  "script": "string",
  "subtitles": ["string"],
  "caption": "string"
}}
""".strip()

    body = json.dumps(
        {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.8,
            "stream": False,
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
        content = response_payload["choices"][0]["message"]["content"]
        return _coerce_response(_extract_json_object(str(content)))
    except (KeyError, IndexError, ValueError, json.JSONDecodeError, urllib.error.URLError, TimeoutError):
        return None


@router.post("/generate", response_model=ScriptGenerateResponse)
def generate_script(payload: ScriptGenerateRequest) -> ScriptGenerateResponse:
    generated = _generate_with_ai(payload)
    if generated is not None:
        return generated
    return _fallback_script(payload)
