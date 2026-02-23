# Nephrofind — IgA Nephropathy & Lab Decision Support

Full-stack app for IgA Nephropathy assessment and lab report analysis: **XGBoost predictions** + **rule-based decision support** + **Ollama/MedGemma** clinical reasoning.

---

## What it does

- **Upload lab reports** (PDF) → extract and store clinical values  
- **ML prediction** → XGBoost (IgAN yes/no) on creatinine, urea, albumin, uric acid, eGFR, ACR  
- **ThirdOp** → Combines ML + clinical rules → risk tier (low/medium/high), decision (monitor / request tests / escalate), differentials  
- **MedGemma (Ollama)** → Patient-friendly concerns and “questions to ask doctor” (optional)  
- **Multi-module** → Kidney (with ML), diabetes, hematology, lipid, nutritional, allergy — only runs modules whose markers are present  
- **Quick Actions** → “Any Report” analysis for general abnormal labs (Ollama, non-nephrology)

---

## Stack

| Layer      | Tech |
|-----------|------|
| Frontend  | React 19, MUI 7, React Router 7, Axios, Chart.js |
| Backend   | Node, Express, MongoDB/Mongoose, JWT, Multer |
| ML        | Python 3.8+, XGBoost (subprocess from Node) |
| Reasoning | Ollama (e.g. `gemma:7b`) via `medgemma_service.py` |

**Ports:** Frontend 3000, Backend 5009. MongoDB 27017. Ollama 11434 (optional).

---

## Architecture (short)

```
React (3000) → Express (5009) → MongoDB
                    ↓
              ML subprocess (XGBoost)
              Ollama (MedGemma) — optional
```

- **ThirdOp flow:** Normalize/validate report data → run **applicable modules** (kidney only if kidney markers + ML) → rule-based risk + differentials → optional MedGemma concerns.  
- **Kidney path:** Needs 6 lab values + successful ML prediction; then full decision support + optional LLM insights.

---

## Project layout

```
├── backend/
│   ├── lib/              # keyNormalizer, sanityValidation
│   ├── models/           # User, Report, Doctor, Appointment, Differential
│   ├── modules/          # kidney, diabetes, hematology, lipid, nutritional, allergy
│   ├── routes/           # auth, reports, ml, thirdop, doctors, appointments, health
│   ├── services/         # thirdopController, thirdopEngine, differentialService,
│   │                     # ruleEngine, llmService, ollamaMedGemmaBridge,
│   │                     # medgemma_service.py (Python)
│   └── server.js
├── frontend/src/         # React app (pages, components, context)
├── final/                # Python ML (train, model, predict, scaler)
└── README.md
```

---

## Setup

**Prerequisites:** Node 14+, Python 3.8+, MongoDB, (optional) Ollama with e.g. `gemma:7b`

1. **MongoDB** — run on 27017 (e.g. `brew services start mongodb-community`).
2. **Backend**
   ```bash
   cd backend && npm install && node server.js
   ```
3. **Python ML** (for predictions)
   ```bash
   cd final && python3 -m venv venv && source venv/bin/activate
   pip install -r requirements.txt
   ```
   Backend calls the ML script via subprocess; no separate Flask needed.
4. **Frontend**
   ```bash
   cd frontend && npm install && npm start
   ```
5. **Ollama (optional, for MedGemma / Any Report)**  
   Install Ollama, run `ollama run gemma:7b`.  
   In `backend/.env` (see `.env.example`): set `OLLAMA_MEDGEMMA_URL`, `OLLAMA_MEDGEMMA_MODEL`, and optionally `USE_OLLAMA_GENERIC` for Any Report.

---

## Main APIs

| Method | Endpoint | Purpose |
|--------|----------|--------|
| POST   | `/api/auth/register`, `/api/auth/login` | Auth (JWT) |
| GET/POST | `/api/reports` | List / upload reports |
| POST   | `/api/ml/predict` | ML prediction (reportId + reportData) |
| POST   | `/api/thirdop/analyze` | Full ThirdOp (risk, decision, differentials, optional MedGemma) |
| POST   | `/api/thirdop/medgemma` | MedGemma concerns only |
| GET    | `/api/health/ollama` | Check Ollama availability |

Protected routes: `Authorization: Bearer <token>`.

---

## ThirdOp logic (summary)

- **Input:** Normalized report data + ML prediction (for kidney).  
- **Modules:** Only runs modules that have required markers; kidney also requires valid ML.  
- **Risk:** Rule-based (e.g. eGFR stages, ACR, creatinine) + ML signal → combined tier; overrides for eGFR &lt; 30, ACR &gt; 300, etc.  
- **Decision:** low → monitor, medium → request_additional_tests, high → escalate.  
- **Differentials:** Rule-based list (IgAN, diabetic nephropathy, etc.); optional MedGemma adds **concerns** (title, reason, questionsToAskDoctor).  
- **Caching:** Differential (and optionally llmInsights) cached per report.

---

## Security & notes

- JWT + bcrypt; protected routes; CORS and file upload checks.  
- ThirdOp is **non-diagnostic**; for decision support only.  
- Model needs all 6 features; MedGemma/Ollama is optional.

---

## License

Educational / research use.
