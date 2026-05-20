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

This repository is wired for local development with:

- FastAPI backend
- Next.js 15 frontend
- Local worker for OmniVoice + SadTalker
- SQLite metadata store
- Local file storage for uploads and outputs

## Quick start

1. Install system dependencies from `docs/plan.markdown`.
2. Create a Python virtual environment at the repo root.
3. Install backend dependencies from `services/api/pyproject.toml` and `services/worker/pyproject.toml`.
4. Install frontend dependencies in `apps/web`.
5. Start the API, worker, and web app.

## Run on macOS

From the repo root:

```bash
cd  /GitHub/text-to-video
source .venv/bin/activate
bash scripts/run_all.sh
```

That command starts:

- Web app at `http://127.0.0.1:5431`
- API at `http://127.0.0.1:5432`
- Worker in the same terminal session

If you prefer separate terminals:

```bash
cd  /GitHub/text-to-video
source .venv/bin/activate
python -m uvicorn services.api.app.main:app --host 127.0.0.1 --port 5432 --reload
```

```bash
cd  /GitHub/text-to-video
source .venv/bin/activate
python services/worker/worker.py
```

```bash
cd /GitHub/text-to-video/apps/web
npm run dev
```

## Run on Windows

The easiest way to run the bash helper scripts on Windows is through **Git Bash** or **WSL**.

### Option A: Git Bash or WSL

From the repo root:

```bash
cd /c/Users/<your-username>/Documents/GitHub/text-to-video
bash scripts/run_all.sh
```

Or run the services separately:

```bash
cd /c/Users/<your-username>/Documents/GitHub/text-to-video
python -m uvicorn services.api.app.main:app --host 127.0.0.1 --port 5432 --reload
```

```bash
cd /c/Users/<your-username>/Documents/GitHub/text-to-video
python services/worker/worker.py
```

```bash
cd /c/Users/<your-username>/Documents/GitHub/text-to-video/apps/web
npm run dev
```

### Option B: PowerShell

If you do not want to use bash, run the services manually in three terminals:

```powershell
cd C:\Users\<your-username>\Documents\GitHub\text-to-video
.venv\Scripts\Activate.ps1
python -m uvicorn services.api.app.main:app --host 127.0.0.1 --port 5432 --reload
```

```powershell
cd C:\Users\<your-username>\Documents\GitHub\text-to-video
.venv\Scripts\Activate.ps1
python services\worker\worker.py
```

```powershell
cd C:\Users\<your-username>\Documents\GitHub\text-to-video\apps\web
npm run dev
```

## One-command dev

Run all three services in one terminal on macOS, Git Bash, or WSL:

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
