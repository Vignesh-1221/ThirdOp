const axios = require('axios');

/**
 * Gemini Clinical Reasoning Service
 * Stable REST implementation
 */

async function generateClinicalReasoning(thirdOpResult, clinicalData) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("Gemini API key missing.");
    return fallback("Gemini API key not configured.");
  }

  try {
    const prompt = buildClinicalPrompt(thirdOpResult, clinicalData);

    const apiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    console.log("[Gemini] Calling URL:", apiUrl);

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    };

    const response = await axios.post(apiUrl, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });

    const rawText =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.error("[Gemini] Empty response:", response.data);
      return fallback("Gemini returned empty response.");
    }

    // 🔥 Robust Markdown Cleaning
    let cleaned = rawText.trim();

    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, "");
      cleaned = cleaned.replace(/```$/, "");
      cleaned = cleaned.trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error("[Gemini] JSON Parse Failed:", cleaned);
      return fallback("Failed to parse Gemini response.");
    }

    const rawConcerns = Array.isArray(parsed.rankedConcerns)
      ? parsed.rankedConcerns
      : [];
    const rankedConcerns = rawConcerns.map((c) => {
      let doctorQuestions = [];
      if (Array.isArray(c?.doctorQuestions)) {
        doctorQuestions = c.doctorQuestions
          .filter((q) => typeof q === "string" && String(q).trim() !== "")
          .map((q) => String(q).trim());
      }
      return { ...c, doctorQuestions };
    });
    const overallInterpretation =
      typeof parsed.overallInterpretation === "string"
        ? parsed.overallInterpretation
        : "No overall interpretation generated.";

    return {
      rankedConcerns,
      overallInterpretation,
      // Backward compatibility for consumers expecting concerns/summary
      concerns: rankedConcerns.map((c) => (c && c.title) || "").filter(Boolean),
      summary: overallInterpretation
    };

  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error("[Gemini] Timeout occurred");
    }

    console.error("[Gemini] API Error:", error.message);
    if (error.response) {
      console.error("[Gemini] Error Response:", error.response.data);
    }

    return fallback("Gemini API call failed.");
  }
}

function fallback(message) {
  return {
    rankedConcerns: [],
    overallInterpretation: message,
    concerns: [],
    summary: message
  };
}

function buildClinicalPrompt(thirdOpResult, clinicalData) {
  const { reportData = {}, mlPrediction = {} } = clinicalData;

  const creatinine = reportData['CREATININE (mg/dL)'] ?? reportData.CREATININE ?? reportData.creatinine;
  const urea = reportData['UREA (mg/dL)'] ?? reportData.UREA ?? reportData.urea;
  const albumin = reportData['ALBUMIN (g/dL)'] ?? reportData.ALBUMIN ?? reportData.albumin;
  const egfr = reportData.eGFR ?? reportData.EGFR ?? reportData.egfr;
  const acr = reportData.ACR ?? reportData.acr;
  const uricAcid = reportData['URIC ACID (mg/dL)'] ?? reportData.URIC_ACID ?? reportData.uricAcid;

  const mlProb = Array.isArray(mlPrediction.probabilities)
    ? mlPrediction.probabilities[1]
    : null;
  const mlProbabilityStr = mlProb != null ? (mlProb * 100).toFixed(1) : "Not available";
  const mlPredictionLabel =
    mlPrediction.prediction === 1
      ? "IgA Nephropathy"
      : "Non-IgA Nephropathy";

  const riskTier = thirdOpResult.riskTier ?? "Not available";
  const decision = thirdOpResult.decision ?? "Not available";
  const confidenceStr =
    thirdOpResult.confidence != null
      ? (thirdOpResult.confidence * 100).toFixed(1)
      : "Not available";

  return `You are an advanced clinical decision-support assistant.

Your role is to function as a **Clinical Concern Prioritization Engine**.

You are analyzing nephrology-related laboratory data. Your task is NOT to diagnose diseases. Instead, you must:

• Identify clinically relevant concerns based on the provided lab values
• Consider abnormal values, borderline findings, and important patterns
• Prioritize concerns based on clinical significance
• Avoid naming specific diseases unless absolutely necessary
• Focus on physiological interpretation, not diagnostic labeling
• Be concise, structured, and medically accurate

You must rank concerns in order of importance (1 = highest priority).

Do NOT introduce unrelated medical conditions.
Do NOT provide definitive diagnoses.
Do NOT include explanations outside the JSON structure.

---

CLINICAL LAB VALUES:

- Creatinine: ${creatinine ?? "Not available"}
- Urea: ${urea ?? "Not available"}
- Albumin: ${albumin ?? "Not available"}
- eGFR: ${egfr ?? "Not available"}
- ACR: ${acr ?? "Not available"}
- Uric Acid: ${uricAcid ?? "Not available"}

---

ML MODEL OUTPUT:

- Predicted category: ${mlPredictionLabel}
- Confidence: ${mlProbabilityStr}%

---

RULE-BASED RISK OUTPUT:

- Risk Tier: ${riskTier}
- Decision: ${decision}
- Confidence Score: ${confidenceStr}%

---

TASK:

1. Identify the most clinically significant concerns from the lab data.
2. Rank them by importance (list in order: highest priority first).
3. Assign each concern a priority: exactly one of "High", "Moderate", or "Low".
4. Provide concise medical reasoning for each concern.
5. For each concern, generate doctorQuestions dynamically based on that concern's priority (see rules below).
6. Provide an overallInterpretation; adapt its tone to the overall severity (see rules below).

---

DYNAMIC DOCTOR QUESTIONS (doctorQuestions):

Generate patient-friendly discussion questions per concern based on severity:

- If priority is Low: Generate 1–2 gentle, preventive, reassurance-focused questions. Focus on lifestyle, monitoring, and general follow-up.

- If priority is Moderate: Generate 2–3 practical, clarification- and management-oriented questions. Focus on causes, monitoring, and next evaluation steps.

- If priority is High: Generate 3–4 action-oriented and evaluation-focused questions. At least one question must address urgency or immediate next steps.

QUESTION TONE (all priorities):
- Write every question from the PATIENT's perspective: the patient is asking the doctor. Use first-person phrasing the patient would use when preparing for an appointment, e.g. "Should I…", "Do I need…", "What does this mean for me?", "How can I improve…", "Is this something I should worry about?"
- Do NOT write as if the doctor is speaking to the patient. Do NOT use phrasing like "Can you tell me…", "Would you be open to…", "We noticed…", or "This finding suggests we should…". Questions must sound like a patient asking their doctor.
- Patient-friendly; avoid medical jargon and alarming language.
- Do NOT give medical advice, suggest diagnoses, or give treatment instructions.
- Be specific to the abnormal value or finding; do NOT be generic or repetitive.
- Do NOT reuse the same question phrasing across multiple concerns.
- Avoid repetitive templates like "What are the next steps?" or "How often should I recheck?" unless medically necessary for that concern.

---

OVERALL INTERPRETATION TONE:

Adapt the tone of overallInterpretation based on the overall severity of the case:
- Low → reassuring and calm.
- Moderate → balanced and informative.
- High → clear, firm, and urgency-aware but not panic-inducing.

---

RETURN ONLY VALID JSON IN THIS EXACT FORMAT:

{
  "overallInterpretation": "2-3 sentence executive clinical summary (tone adapted to severity)",
  "rankedConcerns": [
    {
      "title": "Clear clinical concern title",
      "priority": "High | Moderate | Low",
      "reasoning": "Concise and medically sound explanation",
      "doctorQuestions": [
        "Question 1",
        "Question 2"
      ]
    }
  ]
}

Important:
- priority must be exactly one of: "High", "Moderate", or "Low".
- doctorQuestions: array of strings; count by priority (Low: 1–2, Moderate: 2–3, High: 3–4). If no sensible questions, use empty array.
- Do not include markdown or backticks. Do not include any text outside JSON.
- Keep reasoning precise and clinically grounded.`;
}

// ---------------------------------------------------------------------------
// LLM-based differential diagnosis (replaces rule-based rankedDifferentials)
// ---------------------------------------------------------------------------

const DIFFERENTIAL_FALLBACK = {
  status: 'low-risk',
  message: 'Unable to generate differential interpretation.',
  rankedDifferentials: []
};

function buildDifferentialPrompt(thirdOpResult, clinicalData) {
  const { reportData = {}, mlPrediction = {} } = clinicalData;

  const creatinine = reportData['CREATININE (mg/dL)'] ?? reportData.CREATININE ?? reportData.creatinine;
  const urea = reportData['UREA (mg/dL)'] ?? reportData.UREA ?? reportData.urea;
  const albumin = reportData['ALBUMIN (g/dL)'] ?? reportData.ALBUMIN ?? reportData.albumin;
  const egfr = reportData.eGFR ?? reportData.EGFR ?? reportData.egfr;
  const acr = reportData.ACR ?? reportData.acr;
  const uricAcid = reportData['URIC ACID (mg/dL)'] ?? reportData.URIC_ACID ?? reportData.uricAcid;

  const mlProb = Array.isArray(mlPrediction.probabilities) ? mlPrediction.probabilities[1] : null;
  const mlProbability = mlProb != null ? (mlProb * 100).toFixed(1) : 'Not available';
  const mlPredictionLabel =
    mlPrediction.prediction === 1 ? 'IgA Nephropathy' : 'Non-IgA Nephropathy';

  const riskTier = thirdOpResult.riskTier ?? 'Not available';
  const decision = thirdOpResult.decision ?? 'Not available';

  return `You are an advanced nephrology decision-support assistant.

Your task is to generate a calm, clinically responsible differential interpretation based strictly on the provided laboratory values.

IMPORTANT BEHAVIOR RULES:

1. If lab values are normal or near-normal with no meaningful pathological pattern:
   - Return status = "healthy"
   - Provide a short reassurance message
   - DO NOT list any diseases
   - rankedDifferentials must be an empty array

2. If mild abnormalities exist without strong pathology:
   - Return status = "low-risk"
   - Provide a calm advisory message
   - You may list up to 2 possible mild considerations

3. If significant pathology is evident:
   - Return status = "pathological"
   - Provide EXACTLY 3 ranked differential diagnoses
   - Rank from most plausible to least plausible
   - Use calm, professional language
   - DO NOT use dramatic or alarming wording

STRICT RULES:
- Do NOT introduce unrelated diseases.
- Do NOT provide definitive diagnosis.
- This is decision support only.
- Base reasoning strictly on lab values.
- Do NOT output markdown.
- Do NOT output backticks.
- Return raw JSON only.

LAB VALUES:
- Creatinine: ${creatinine ?? 'Not available'}
- Urea: ${urea ?? 'Not available'}
- Albumin: ${albumin ?? 'Not available'}
- eGFR: ${egfr ?? 'Not available'}
- ACR: ${acr ?? 'Not available'}
- Uric Acid: ${uricAcid ?? 'Not available'}

ML CONTEXT:
- Prediction: ${mlPredictionLabel}
- Confidence: ${mlProbability}%

RISK CONTEXT:
- Risk Tier: ${riskTier}
- Decision: ${decision}

Return ONLY valid JSON in this EXACT format:

{
  "status": "healthy | low-risk | pathological",
  "message": "Short clinical summary message",
  "rankedDifferentials": [
    {
      "condition": "Condition name",
      "likelihood": "High | Moderate | Low",
      "reasoning": "Short clinical explanation"
    }
  ]
}

RULES:
- If status = healthy → rankedDifferentials must be [].
- If status = pathological → rankedDifferentials must contain exactly 3 items.
- Do not include any text outside JSON.`;
}

async function generateDifferentialDiagnosis(thirdOpResult, clinicalData) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[Gemini] API key missing for differential.');
    const err = new Error('Gemini API key not configured');
    err.code = 'CONFIG';
    throw err;
  }

  try {
    const prompt = buildDifferentialPrompt(thirdOpResult, clinicalData);
    const apiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    const response = await axios.post(apiUrl, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });

    const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      console.error('[Gemini] Differential empty response:', response.data);
      throw new Error('Gemini returned empty differential response');
    }

    let cleaned = rawText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '');
      cleaned = cleaned.replace(/```$/, '');
      cleaned = cleaned.trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error('[Gemini] Differential JSON parse failed:', cleaned);
      throw new Error('Gemini differential response parse failed');
    }

    const status =
      parsed.status === 'healthy' || parsed.status === 'low-risk' || parsed.status === 'pathological'
        ? parsed.status
        : 'low-risk';
    const message = typeof parsed.message === 'string' ? parsed.message : DIFFERENTIAL_FALLBACK.message;
    const rankedDifferentials = Array.isArray(parsed.rankedDifferentials) ? parsed.rankedDifferentials : [];

    return { status, message, rankedDifferentials };
  } catch (error) {
    if (error.response?.status === 429) {
      console.warn('[Gemini] Quota exceeded — switching to fallback');
    } else if (error.code === 'ECONNABORTED') {
      console.error('[Gemini] Differential timeout');
    } else if (error.response) {
      console.error('[Gemini] Differential API Error:', error.response.status, error.message);
    } else {
      console.error('[Gemini] Differential error:', error.message);
    }
    throw error;
  }
}

module.exports = { generateClinicalReasoning, generateDifferentialDiagnosis };
