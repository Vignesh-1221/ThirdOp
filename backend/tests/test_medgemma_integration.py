#!/usr/bin/env python3
"""
Integration tests for the MedGemma/Ollama clinical reasoning service.

Requires:
- Ollama running locally with model gemma:7b (e.g. ollama run gemma:7b once).
- Python deps: pip install requests (or use backend/requirements-medgemma.txt).

Run from repo root:
  python backend/tests/test_medgemma_integration.py
  # or
  cd backend && python tests/test_medgemma_integration.py
"""

from __future__ import annotations

import json
import os
import sys

# Allow importing the service from backend/services
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from services.medgemma_service import generate_clinical_reasoning


# Sample structured lab input (similar to reportData from PDF extraction)
SAMPLE_STRUCTURED_INPUT = {
    "CREATININE (mg/dL)": 1.8,
    "UREA (mg/dL)": 48,
    "ALBUMIN (g/dL)": 3.2,
    "eGFR": 42,
    "ACR": 180,
    "URIC ACID (mg/dL)": 7.1,
    "Hemoglobin": 11.2,
    "Sodium": 138,
    "Potassium": 4.8,
}


def _check_structure(result: dict) -> tuple[bool, list[str]]:
    """
    Validate that result has the strict return structure.
    Returns (ok, list of error messages).
    """
    errors = []
    if "concerns" not in result:
        errors.append("Missing 'concerns' key")
    else:
        if not isinstance(result["concerns"], list):
            errors.append("'concerns' must be a list")
        else:
            for i, c in enumerate(result["concerns"]):
                if not isinstance(c, dict):
                    errors.append(f"concerns[{i}] must be an object")
                else:
                    if "title" not in c:
                        errors.append(f"concerns[{i}] missing 'title'")
                    if "reason" not in c:
                        errors.append(f"concerns[{i}] missing 'reason'")
                    for k in c:
                        if k not in ("title", "reason"):
                            errors.append(f"concerns[{i}] has extra key: {k}")

    if "qa" not in result:
        errors.append("Missing 'qa' key")
    else:
        if not isinstance(result["qa"], list):
            errors.append("'qa' must be a list")
        else:
            for i, q in enumerate(result["qa"]):
                if not isinstance(q, dict):
                    errors.append(f"qa[{i}] must be an object")
                else:
                    if "question" not in q:
                        errors.append(f"qa[{i}] missing 'question'")
                    if "answer" not in q:
                        errors.append(f"qa[{i}] missing 'answer'")
                    for k in q:
                        if k not in ("question", "answer"):
                            errors.append(f"qa[{i}] has extra key: {k}")

    return len(errors) == 0, errors


def test_with_sample_input() -> None:
    """Call generate_clinical_reasoning with sample lab JSON and print result."""
    print("Input (structured lab):")
    print(json.dumps(SAMPLE_STRUCTURED_INPUT, indent=2))
    print()

    result = generate_clinical_reasoning(SAMPLE_STRUCTURED_INPUT)

    print("Output (parsed):")
    print(json.dumps(result, indent=2))
    print()

    if result.get("error"):
        print("Error reported by service:", result.get("message", "Unknown"))
        print("Use this for debugging; frontend should not receive markdown.")
        return

    ok, errs = _check_structure(result)
    if not ok:
        print("Malformed structure:")
        for e in errs:
            print("  -", e)
        return

    print("Structure OK: concerns and qa with strict keys (title/reason, question/answer).")
    print("No markdown returned; only clean JSON dict.")


def test_empty_input() -> None:
    """Ensure empty/minimal input does not crash and returns valid shape."""
    print("\n--- Empty input test ---")
    result = generate_clinical_reasoning({})
    print("Result keys:", list(result.keys()))
    if result.get("error"):
        print("Error (expected if Ollama unreachable):", result.get("message"))
    else:
        ok, errs = _check_structure(result)
        print("Structure OK:" if ok else "Errors: " + "; ".join(errs))


if __name__ == "__main__":
    test_with_sample_input()
    test_empty_input()
