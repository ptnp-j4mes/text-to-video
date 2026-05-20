# AI Voice Avatar

Local-first monorepo for:

- Voice cloning TTS with OmniVoice
- Talking avatar generation with SadTalker
- Optional lip-sync refinement with Wav2Lip
- FastAPI backend
- Next.js 15 frontend
- SQLite metadata store
- Local file storage for uploads and outputs

## Structure

```txt
apps/web         Next.js UI
services/api     FastAPI app
services/worker  Local worker scaffold
storage          Local database and artifacts
docs             Project notes and API contract
scripts          Convenience scripts
```

## Status

This repository is scaffolded to match the implementation plan in `docs/plan.markdown`.
The AI model integrations are wired as interfaces and placeholders so the project can be extended without reshaping the repo.

## Quick start

1. Install system dependencies from `docs/plan.markdown`.
2. Create Python virtual environment.
3. Install backend dependencies.
4. Install frontend dependencies.
5. Run the API, worker, and web app from the root scripts or `Makefile`.

## One-command dev

Run all three services in one terminal:

```bash
bash scripts/run_all.sh
```

## AI model setup

- OmniVoice is invoked through the `omnivoice-infer` CLI.
- SadTalker is expected at `models/SadTalker/inference.py` by default.
- The worker looks for generated audio under `storage/outputs/audio` and video under `storage/outputs/video`.
- If your model repositories live elsewhere, adjust `services/api/.env`.
- Key environment overrides:
  - `OMNIVOICE_PYTHON`
  - `OMNIVOICE_COMMAND`
  - `OMNIVOICE_MODEL`
  - `SADTALKER_PYTHON`
  - `SADTALKER_REPO`
  - `SADTALKER_SCRIPT`

### Suggested local setup

```bash
git clone https://github.com/OpenTalker/SadTalker.git models/SadTalker
pip install git+https://github.com/k2-fsa/OmniVoice.git
```

## Default ports

- Web app: `http://127.0.0.1:5431`
- API: `http://127.0.0.1:5432`

The first command gives the worker a local SadTalker repo. The second installs the OmniVoice CLI so `omnivoice-infer` is available on PATH.
