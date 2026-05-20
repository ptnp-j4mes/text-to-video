from __future__ import annotations

import numpy as np

# SadTalker still uses removed NumPy aliases in several modules.
# Patch them once at package import time so the whole repo can run on NumPy 1.26+.
if not hasattr(np, "float"):
    np.float = float  # type: ignore[attr-defined]
if not hasattr(np, "int"):
    np.int = int  # type: ignore[attr-defined]
if not hasattr(np, "bool"):
    np.bool = bool  # type: ignore[attr-defined]
