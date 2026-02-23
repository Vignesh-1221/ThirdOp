# Ollama (Gemma:7b) MedGemma Integration

This document describes the local Ollama-based clinical reasoning engine, where each file lives, how to run the integration test, and how it plugs into the existing backend.

---

## File locations

| File | Purpose |
|------|--------|
| **`backend/services/medgemma_service.py`** | Python service: calls Ollama `/api/generate`, strips markdown, parses JSON, enforces `{ concerns, qa }` shape, returns structured errors on failure. Entrypoint: `generate_clinical_reasoning(structured_input: dict) -> dict`. |
| **`backend/services/ollamaMedGemmaBridge.js`** | Node bridge: spawns the Python script with lab JSON on stdin, reads result JSON from stdout, returns `{ concerns, qa }` or throws. Used when `USE_OLLAMA_MEDGEMMA=true`. |
| **`backend/services/llmService.js`** | LLM router: `generateMedGemmaReasoning()` uses Ollama bridge when env is set, otherwise Gemini. |
| **`backend/tests/test_medgemma_integration.py`** | Integration test: sample structured lab input, calls `generate_clinical_reasoning`, prints parsed output and reports malformed structure. |
| **`backend/requirements-medgemma.txt`** | Python deps for the service (`requests`). |

---

## How to run the integration test

1. **Python dependencies**  
   Use a virtual environment (recommended if your system Python is externally managed):
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate   # On Windows: .venv\Scripts\activate
   pip install -r requirements-medgemma.txt
   ```
   Or install globally if your environment allows:
   ```bash
   pip install -r backend/requirements-medgemma.txt
   ```

2. **Ensure Ollama is running** with the model pulled:
   ```bash
   ollama run gemma:7b
   ```
   (One run is enough to pull; you can stop with Ctrl+C and keep `ollama serve` running.)

3. **Run the test** (from repo root; activate the venv first if you created one in `backend/`):
   ```bash
   python backend/tests/test_medgemma_integration.py
   ```
   Or from `backend/`:
   ```bash
   cd backend && python tests/test_medgemma_integration.py
   ```

4. **What you should see**: Printed structured lab input, then the parsed output (either `concerns` and `qa` arrays or an `error` with `message`). The test validates that the result has the strict keys `title`/`reason` and `question`/`answer` and prints "Structure OK" or lists errors if malformed.

---

## How to integrate into the existing backend

- **MedGemma API**  
  The existing route **`POST /api/thirdop/medgemma`** (in `backend/routes/thirdop.routes.js`) already calls `generateMedGemmaReasoning(structuredLabInput)`. No route changes are required.

- **Switching to Ollama**  
  Set in your environment (e.g. `backend/.env`):
  ```env
  USE_OLLAMA_MEDGEMMA=true
  ```
  Optional overrides:
  - `OLLAMA_MEDGEMMA_URL` — default `http://localhost:11434/api/generate`
  - `OLLAMA_MEDGEMMA_MODEL` — default `gemma:7b`
  - `OLLAMA_MEDGEMMA_TIMEOUT` — default `120` (seconds)

- **Behavior**  
  When `USE_OLLAMA_MEDGEMMA` is set, `llmService.generateMedGemmaReasoning()` uses `ollamaMedGemmaBridge.js`, which runs `medgemma_service.py` with the same `structuredLabInput` object. The Python service returns only clean JSON (no markdown); the bridge parses it and returns `{ concerns, qa }` to the route. On error (e.g. Ollama down, bad JSON), the bridge throws; the route catches and returns 500 with a safe message, so the frontend never receives markdown or raw error payloads.

- **CLI usage**  
  You can also call the Python service directly for debugging:
  ```bash
  echo '{"CREATININE (mg/dL)": 1.8, "eGFR": 42}' | python3 backend/services/medgemma_service.py
  ```
  Or with a file:
  ```bash
  python3 backend/services/medgemma_service.py path/to/lab.json
  ```

---

## Return structure (strict)

All successful responses to the frontend conform to:

```json
{
  "concerns": [
    { "title": "...", "reason": "..." }
  ],
  "qa": [
    { "question": "...", "answer": "..." }
  ]
}
```

The Python service strips markdown/code fences, parses JSON, and normalizes so only these keys are present. On parse or API failure it returns an error object (with `error: true`, `message`, and empty `concerns`/`qa`); the Node bridge turns that into a thrown `Error`, so the API response remains a normal JSON body or 500 with a safe message.
