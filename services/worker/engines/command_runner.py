from __future__ import annotations

import os
import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class CommandResult:
    stdout: str
    stderr: str


class CommandError(RuntimeError):
    pass


def run_command(
    args: list[str],
    *,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
) -> CommandResult:
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)

    completed = subprocess.run(
        args,
        cwd=str(cwd) if cwd is not None else None,
        env=merged_env,
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        raise CommandError(
            "Command failed with exit code "
            f"{completed.returncode}: {' '.join(args)}\n"
            f"STDOUT:\n{completed.stdout}\n"
            f"STDERR:\n{completed.stderr}"
        )
    return CommandResult(stdout=completed.stdout, stderr=completed.stderr)

