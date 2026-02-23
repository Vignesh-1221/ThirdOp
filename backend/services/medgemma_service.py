#!/usr/bin/env python3
"""
MedGemma / Ollama clinical reasoning service.

Calls a locally running Ollama model (e.g. gemma:7b) with structured lab JSON,
returns normalized { concerns } only (title, reason, doctorQuestions per concern).
No patient Q&A. Ollama-based nephrology reasoning.
"""

from __future__ import annotations

import json
import os
import re
import sys
from typing import Any

import requests


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

OLLAMA_URL = os.environ.get("OLLAMA_MEDGEMMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.environ.get("OLLAMA_MEDGEMMA_MODEL", "gemma:7b")
OLLAMA_TIMEOUT = int(os.environ.get("OLLAMA_MEDGEMMA_TIMEOUT", "120"))
OLLAMA_TEMPERATURE = 0.0
OLLAMA_STREAM = False


# ---------------------------------------------------------------------------
# Prompt: deterministic concern structure by riskLevel; questionsToAskDoctor (patient voice)
# ---------------------------------------------------------------------------

MEDGEMMA_SYSTEM_PROMPT = """You are a medically cautious lab report explanation assistant helping patients understand abnormal nephrology lab values before consulting a doctor.

The input includes a computed riskLevel field: LOW, MODERATE, or HIGH.

STRICT STRUCTURAL RULES — concern count must follow riskLevel:

- If riskLevel = HIGH: Return EXACTLY 3 concerns. Choose the 3 most clinically significant abnormal lab parameters.
- If riskLevel = MODERATE: Return 2 or 3 concerns maximum.
- If riskLevel = LOW: Return 1 or 2 concerns maximum.

Each concern MUST correspond to a specific abnormal lab parameter. Do NOT merge unrelated abnormalities into one umbrella concern. Titles must reflect the specific lab abnormality (e.g. "Low eGFR", "Elevated Creatinine").

For EACH concern:
- Provide a calm, patient-friendly explanation. Do NOT diagnose. Do NOT recommend treatment. Avoid alarming language.
- Generate EXACTLY 3 questionsToAskDoctor. Questions must be phrased in patient voice. Example style: "What could be causing this?", "Is this temporary?", "Do I need additional tests?" Questions must be directly related to that concern.

STRICT RULES:
- Use ONLY the values explicitly provided. Do NOT invent or assume any lab values.
- Do NOT use markdown. Do NOT include extra keys. Do NOT include summary sections.
- Return ONE valid JSON object only. No text before or after. No code fences or comments.

Output MUST be exactly this structure:

{"concerns":[{"title":"string","reason":"string","questionsToAskDoctor":["string","string","string"]}]}

Here is the structured lab input (includes riskLevel and lab values):

"""


# ---------------------------------------------------------------------------
# Prompt: Any Report Analysis (Quick Actions) — general multi-system, not nephrology
# ---------------------------------------------------------------------------

MEDGEMMA_ANY_REPORT_PROMPT = """You are a medically cautious lab report explanation assistant working inside the ThirdOp platform under Quick Actions → Any Report Analysis.

This feature helps patients understand abnormal lab results before consulting a doctor.

This is NOT the nephrology engine. This is general multi-system analysis.

Input: Structured abnormal lab values only. All values provided are already detected as outside their normal reference range.

Instructions:
- Interpret ONLY the provided abnormal lab values.
- Do NOT invent new findings. Do NOT diagnose diseases. Do NOT rank diseases. Do NOT assign risk levels.
- Use calm, responsible language.

For EACH abnormal value: Create exactly ONE concern. Provide explanation. Provide EXACTLY 3 questionsToAskDoctor in patient voice. Suggest ONE recommendedDepartment. If multiple organ systems → "Internal Medicine". Provide 2–3 safe precautions.

Return STRICT JSON only. No markdown. No extra keys. One valid JSON object only.

{
  "concerns": [
    {
      "title": "string",
      "reason": "string",
      "questionsToAskDoctor": ["string", "string", "string"]
    }
  ],
  "recommendedDepartment": "string",
  "precautions": ["string", "string"]
}

Here are the abnormal lab values:

"""


def _build_prompt(structured_input: dict[str, Any]) -> str:
    """Build the full prompt by appending structured lab JSON."""
    if structured_input is None or not isinstance(structured_input, dict):
        payload = "{}"
    else:
        payload = json.dumps(structured_input, indent=2)
    return MEDGEMMA_SYSTEM_PROMPT + payload


def _build_any_report_prompt(abnormalities: list[Any]) -> str:
    """Build the Any Report prompt by appending abnormal lab values JSON."""
    if not isinstance(abnormalities, list):
        payload = "[]"
    else:
        payload = json.dumps(abnormalities, indent=2)
    return MEDGEMMA_ANY_REPORT_PROMPT + payload


# ---------------------------------------------------------------------------
# Markdown / code-block stripping
# ---------------------------------------------------------------------------

def _strip_markdown_and_code_blocks(raw: str) -> str:
    """
    Remove markdown code fences (e.g. ```json ... ```) and trim.
    Ensures only raw JSON string is left for parsing.
    """
    if not raw or not isinstance(raw, str):
        return ""
    text = raw.strip()
    # Remove opening fence: ```json or ``` (optional language tag)
    text = re.sub(r"^```\w*\s*\n?", "", text)
    # Remove closing fence
    text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


# ---------------------------------------------------------------------------
# Response shape validation and normalization (concerns only; no qa)
# ---------------------------------------------------------------------------

def _normalize_concern(c: Any) -> dict[str, Any] | None:
    """Ensure one concern has title (string), reason (string), doctorQuestions (array of strings). Accepts questionsToAskDoctor or doctorQuestions from model; outputs doctorQuestions for API (up to 3). Missing default to []."""
    if not c or not isinstance(c, dict):
        return None
    title = c.get("title")
    reason = c.get("reason")
    if title is None and reason is None:
        return None
    raw_questions = c.get("questionsToAskDoctor") or c.get("doctorQuestions")
    if not isinstance(raw_questions, list):
        doctor_questions: list[str] = []
    else:
        doctor_questions = [
            str(q).strip()
            for q in raw_questions[:3]
            if q is not None and str(q).strip()
        ]
    return {
        "title": str(title).strip() if title is not None else "",
        "reason": str(reason).strip() if reason is not None else "",
        "doctorQuestions": doctor_questions,
    }


def _enforce_structure(parsed: dict[str, Any]) -> dict[str, Any]:
    """
    Enforce strict return structure: concerns only.
    Each concern must contain title (string), reason (string), doctorQuestions (array of strings from questionsToAskDoctor). If missing, default to [].
    """
    concerns_raw = parsed.get("concerns")
    concerns: list[dict[str, Any]] = []
    if isinstance(concerns_raw, list):
        for c in concerns_raw:
            n = _normalize_concern(c)
            if n and (n["title"] or n["reason"]):
                concerns.append(n)
    return {"concerns": concerns}


def _normalize_any_report_concern(c: Any) -> dict[str, Any] | None:
    """One concern for Any Report: title, reason, doctorQuestions (from questionsToAskDoctor, up to 3)."""
    if not c or not isinstance(c, dict):
        return None
    title = c.get("title")
    reason = c.get("reason")
    if title is None and reason is None:
        return None
    raw_questions = c.get("questionsToAskDoctor") or c.get("doctorQuestions")
    if not isinstance(raw_questions, list):
        doctor_questions: list[str] = []
    else:
        doctor_questions = [
            str(q).strip()
            for q in raw_questions[:3]
            if q is not None and str(q).strip()
        ]
    return {
        "title": str(title).strip() if title is not None else "",
        "reason": str(reason).strip() if reason is not None else "",
        "doctorQuestions": doctor_questions,
    }


def _enforce_any_report_structure(parsed: dict[str, Any]) -> dict[str, Any]:
    """
    Enforce Any Report output: concerns[], recommendedDepartment (string), precautions (array of strings).
    If missing, recommendedDepartment defaults to ""; precautions defaults to [].
    """
    concerns_raw = parsed.get("concerns")
    concerns: list[dict[str, Any]] = []
    if isinstance(concerns_raw, list):
        for c in concerns_raw:
            n = _normalize_any_report_concern(c)
            if n and (n["title"] or n["reason"]):
                concerns.append(n)
    recommended = parsed.get("recommendedDepartment")
    if not isinstance(recommended, str):
        recommended = ""
    else:
        recommended = recommended.strip()
    prec_raw = parsed.get("precautions")
    if not isinstance(prec_raw, list):
        precautions: list[str] = []
    else:
        precautions = [str(p).strip() for p in prec_raw if p is not None and str(p).strip()][:3]
    return {
        "concerns": concerns,
        "recommendedDepartment": recommended,
        "precautions": precautions,
    }


# ---------------------------------------------------------------------------
# Ollama API call and error handling
# ---------------------------------------------------------------------------

def _call_ollama(prompt: str) -> str:
    """
    POST to Ollama /api/generate; returns the full response text.
    Raises on network/API errors.
    """
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": OLLAMA_STREAM,
        "options": {"temperature": OLLAMA_TEMPERATURE},
    }
    resp = requests.post(
        OLLAMA_URL,
        json=payload,
        timeout=OLLAMA_TIMEOUT,
        headers={"Content-Type": "application/json"},
    )
    resp.raise_for_status()
    data = resp.json()
    # When stream=false, full text is in "response"
    text = data.get("response")
    if text is None:
        raise ValueError("Ollama response missing 'response' field")
    return text if isinstance(text, str) else str(text)


def _call_ollama_generic(prompt: str) -> str:
    """Same as _call_ollama but uses OLLAMA_GENERIC_* env (Any Report Analysis). Temperature = 0.0."""
    url = os.environ.get("OLLAMA_GENERIC_URL", OLLAMA_URL)
    model = os.environ.get("OLLAMA_GENERIC_MODEL", OLLAMA_MODEL)
    timeout = int(os.environ.get("OLLAMA_GENERIC_TIMEOUT", str(OLLAMA_TIMEOUT)))
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": OLLAMA_STREAM,
        "options": {"temperature": 0.0},
    }
    resp = requests.post(
        url,
        json=payload,
        timeout=timeout,
        headers={"Content-Type": "application/json"},
    )
    resp.raise_for_status()
    data = resp.json()
    text = data.get("response")
    if text is None:
        raise ValueError("Ollama response missing 'response' field")
    return text if isinstance(text, str) else str(text)


# ---------------------------------------------------------------------------
# Main entry: generate_clinical_reasoning
# ---------------------------------------------------------------------------

def generate_clinical_reasoning(structured_input: dict[str, Any]) -> dict[str, Any]:
    """
    Run clinical reasoning on structured lab input via Ollama (e.g. gemma:7b).

    - Sends structured_input as JSON in the prompt.
    - Strips markdown/code blocks from model output.
    - Parses JSON and enforces shape: concerns[] with title, reason, doctorQuestions.
    - On JSON parse failure, returns a structured error object (no exception).

    Args:
        structured_input: Lab values as a dict (e.g. reportData or canonical lab JSON).

    Returns:
        On success:
            { "concerns": [ {"title": "...", "reason": "...", "doctorQuestions": ["...", ...]}, ... ] }
        On parse/API error:
            { "error": true, "message": "...", "concerns": [] }
    """
    try:
        prompt = _build_prompt(structured_input)
        raw_text = _call_ollama(prompt)
    except requests.exceptions.RequestException as e:
        return {
            "error": True,
            "message": f"Ollama request failed: {e!s}",
            "concerns": [],
        }
    except ValueError as e:
        return {
            "error": True,
            "message": f"Ollama response invalid: {e!s}",
            "concerns": [],
        }

    cleaned = _strip_markdown_and_code_blocks(raw_text)
    if not cleaned:
        return {
            "error": True,
            "message": "Model returned empty or non-JSON content",
            "concerns": [],
        }

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as e:
        return {
            "error": True,
            "message": f"JSON parse failed: {e!s}",
            "concerns": [],
        }

    if not isinstance(parsed, dict):
        return {
            "error": True,
            "message": "Model did not return a JSON object",
            "concerns": [],
        }

    return _enforce_structure(parsed)


def generate_any_report_reasoning(abnormalities: list[Any]) -> dict[str, Any]:
    """
    Run Any Report (general multi-system) lab explanation via Ollama.
    Uses MEDGEMMA_ANY_REPORT_PROMPT. Temperature = 0.0 for deterministic output.

    Args:
        abnormalities: List of { parameter, value, status } (structured abnormal lab values only).

    Returns:
        On success:
            {
                "concerns": [ {"title": "...", "reason": "...", "doctorQuestions": ["...", ...]}, ... ],
                "recommendedDepartment": "string",
                "precautions": ["string", ...]
            }
        On parse/API error:
            { "error": true, "message": "...", "concerns": [], "recommendedDepartment": "", "precautions": [] }
    """
    err_out = {
        "error": True,
        "concerns": [],
        "recommendedDepartment": "",
        "precautions": [],
    }
    try:
        prompt = _build_any_report_prompt(abnormalities)
        raw_text = _call_ollama_generic(prompt)
    except requests.exceptions.RequestException as e:
        return { **err_out, "message": f"Ollama request failed: {e!s}" }
    except ValueError as e:
        return { **err_out, "message": f"Ollama response invalid: {e!s}" }

    cleaned = _strip_markdown_and_code_blocks(raw_text)
    if not cleaned:
        return { **err_out, "message": "Model returned empty or non-JSON content" }

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as e:
        return { **err_out, "message": f"JSON parse failed: {e!s}" }

    if not isinstance(parsed, dict):
        return { **err_out, "message": "Model did not return a JSON object" }

    return _enforce_any_report_structure(parsed)


# ---------------------------------------------------------------------------
# CLI: read JSON from stdin or first arg (file path), print result JSON
# Supports mode "any_report" via stdin: {"mode": "any_report", "abnormalities": [...]}
# ---------------------------------------------------------------------------

def _main() -> None:
    """Read structured input from stdin (or file path arg), print result JSON."""
    if len(sys.argv) > 1:
        path = sys.argv[1]
        try:
            with open(path, "r", encoding="utf-8") as f:
                structured_input = json.load(f)
        except (OSError, json.JSONDecodeError) as e:
            out = {"error": True, "message": str(e), "concerns": []}
            print(json.dumps(out))
            sys.exit(1)
    else:
        try:
            raw = sys.stdin.read()
            structured_input = json.loads(raw) if raw.strip() else {}
        except json.JSONDecodeError as e:
            out = {"error": True, "message": str(e), "concerns": []}
            print(json.dumps(out))
            sys.exit(1)

    if isinstance(structured_input, dict) and structured_input.get("mode") == "any_report":
        abnormalities = structured_input.get("abnormalities", [])
        result = generate_any_report_reasoning(abnormalities)
        print(json.dumps(result))
    else:
        result = generate_clinical_reasoning(structured_input)
        print(json.dumps(result))


if __name__ == "__main__":
    _main()
