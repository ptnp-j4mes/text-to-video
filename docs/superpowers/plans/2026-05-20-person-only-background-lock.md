# Person-Only Background Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `Light motion / static background` preset animate only the person in the portrait while keeping the rest of the image visually locked to the original background.

**Architecture:** We keep SadTalker as the motion generator, but add a post-processing compositor that uses a person segmentation mask from the source image to blend the generated person back onto the untouched background. The worker will render a normal SadTalker video first, then recompose each frame so the porch, walls, and sunset remain stable while the seated person gets subtle head, shoulder, and lip motion.

**Tech Stack:** FastAPI, Pydantic, SQLAlchemy, Python 3.11, OpenCV, MediaPipe Selfie Segmentation, Next.js, React.

---

### Task 1: Add a reusable person mask + compositor helper

**Files:**
- Create: `services/worker/utils/person_mask.py`
- Create: `services/worker/utils/video_composite.py`
- Create: `services/worker/tests/test_video_composite.py`

- [ ] **Step 1: Write the failing test**

```python
import numpy as np

from services.worker.utils.video_composite import composite_frame


def test_composite_frame_keeps_background_outside_mask():
    background = np.zeros((2, 2, 3), dtype=np.uint8)
    generated = np.full((2, 2, 3), 255, dtype=np.uint8)
    mask = np.array([[1.0, 0.0], [0.0, 1.0]], dtype=np.float32)

    result = composite_frame(background, generated, mask)

    assert result[0, 0, 0] == 255
    assert result[0, 1, 0] == 0
    assert result[1, 0, 0] == 0
    assert result[1, 1, 0] == 255
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:
```bash
source .venv/bin/activate
pytest services/worker/tests/test_video_composite.py -q
```

Expected: import failure because `composite_frame` does not exist yet.

- [ ] **Step 3: Write the compositor and mask helper**

```python
def composite_frame(background: np.ndarray, generated: np.ndarray, mask: np.ndarray) -> np.ndarray:
    alpha = np.clip(mask[..., None].astype(np.float32), 0.0, 1.0)
    blended = generated.astype(np.float32) * alpha + background.astype(np.float32) * (1.0 - alpha)
    return np.clip(blended, 0, 255).astype(np.uint8)
```

```python
def build_person_mask(image_bgr: np.ndarray) -> np.ndarray:
    # Use MediaPipe Selfie Segmentation when available.
    # Return a float32 mask in range 0..1 with gentle dilation/feathering.
```

- [ ] **Step 4: Run the test and verify it passes**

Run:
```bash
source .venv/bin/activate
pytest services/worker/tests/test_video_composite.py -q
```

Expected: `1 passed`.

- [ ] **Step 5: Commit the helper**

```bash
git add services/worker/utils/person_mask.py services/worker/utils/video_composite.py services/worker/tests/test_video_composite.py
git commit -m "feat: add person mask compositor utilities"
```

### Task 2: Wire the new preset through SadTalker rendering

**Files:**
- Modify: `services/api/pyproject.toml`
- Modify: `services/worker/engines/sadtalker_engine.py`
- Modify: `services/worker/pipelines/avatar_pipeline.py`
- Modify: `services/worker/worker.py`

- [ ] **Step 1: Write the failing test**

```python
from services.worker.engines.sadtalker_engine import SadTalkerEngine


def test_light_static_preset_maps_to_background_locked_mode():
    engine = SadTalkerEngine()
    config = engine.build_motion_config("light_static")

    assert config.preprocess == "full"
    assert config.still_mode is True
    assert config.expression_scale == "0.55"
    assert config.lock_background is True
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:
```bash
source .venv/bin/activate
pytest services/worker/tests/test_sadtalker_motion.py -q
```

Expected: `build_motion_config` does not exist yet.

- [ ] **Step 3: Implement the render flow**

```python
@dataclass(slots=True)
class MotionConfig:
    preprocess: str
    still_mode: bool
    expression_scale: str
    lock_background: bool


def build_motion_config(motion_preset: str | None) -> MotionConfig:
    if motion_preset in {"light", "light_static", "static", "static_background"}:
        return MotionConfig("full", True, "0.55", True)
    return MotionConfig("crop", False, "1.0", False)
```

```python
def render(...):
    result_path = run_sadtalker(...)
    if motion_config.lock_background:
        return composite_person_video(
            source_image=source_image,
            generated_video=result_path,
            output_video=output_video,
        )
    return result_path
```

```python
def composite_person_video(source_image: Path, generated_video: Path, output_video: Path) -> Path:
    # 1. Build a person mask from the source image.
    # 2. Read the SadTalker frames.
    # 3. Blend each frame over the locked background.
    # 4. Re-encode the output as mp4.
```

- [ ] **Step 4: Install the new dependency and run tests**

Run:
```bash
source .venv/bin/activate
pip install mediapipe
pytest services/worker/tests/test_sadtalker_motion.py -q
python -m py_compile $(find services -name '*.py' | sort)
```

Expected: tests pass and Python files compile.

- [ ] **Step 5: Commit the pipeline change**

```bash
git add services/api/pyproject.toml services/worker/engines/sadtalker_engine.py services/worker/pipelines/avatar_pipeline.py services/worker/worker.py
git commit -m "feat: lock background for light motion preset"
```

### Task 3: Expose the new behavior in the UI and job schema

**Files:**
- Modify: `services/api/app/schemas.py`
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/components/generator/TextPromptForm.tsx`
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Write the failing type check**

```ts
type MotionPreset = "default" | "light_static";

const presets: Array<{ value: MotionPreset; label: string }> = [
  { value: "default", label: "Normal motion" },
  { value: "light_static", label: "Light motion / static background" },
];
```

- [ ] **Step 2: Run the type check and confirm it fails**

Run:
```bash
cd apps/web
npx tsc --noEmit
```

Expected: `motion_preset` typing mismatch until the schema and API types are updated.

- [ ] **Step 3: Update the API contract and form**

```python
class JobOptions(BaseModel):
    refine_lipsync: bool = False
    output_format: str = "mp4"
    motion_preset: str = "default"
```

```tsx
<option value="default">Normal motion</option>
<option value="light_static">Light motion / static background</option>
<div className="helper">
  Best for full-body portraits when you want the person to move a little while the background stays fixed.
</div>
```

- [ ] **Step 4: Run UI verification**

Run:
```bash
cd apps/web
npx tsc --noEmit
```

Then open `http://127.0.0.1:5431/generate` and confirm the preset is visible and the page still lays out correctly.

- [ ] **Step 5: Commit the UI wiring**

```bash
git add services/api/app/schemas.py apps/web/lib/api.ts apps/web/components/generator/TextPromptForm.tsx apps/web/app/globals.css
git commit -m "feat: add light motion background lock preset"
```

### Task 4: Verify the sample portrait end-to-end

**Files:**
- Use: `/Users/bic-patanaphong/Downloads/ChatGPT Image Apr 29, 2026, 12_55_10 PM.png`
- Inspect: generated job output in `storage/outputs/video/`

- [ ] **Step 1: Queue a job using the sample image**

```bash
cd /Users/bic-patanaphong/Documents/text-to-video
bash scripts/run_all.sh
```

- [ ] **Step 2: Create a job with `Light motion / static background` selected**

Expected:
- The worker produces a video with the porch and sunset visually stable.
- Motion is concentrated on the couple, with only subtle upper-body and facial movement.
- The output remains a single mp4 under `storage/outputs/video/<job_id>.mp4`.

- [ ] **Step 3: Confirm the result in the browser**

Open:
```text
http://127.0.0.1:5431/generate
```

Expected: `Result preview` links to the generated mp4 and the playback shows locked background motion.

