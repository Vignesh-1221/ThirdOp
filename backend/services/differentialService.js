/**
 * Differential service: cache-first, LLM primary, rule-engine fallback.
 * Flow: 1) Check cache by reportId → 2) If miss, call LLM → 3) On LLM failure, use ruleEngine.
 * Clinical reasoning (llmInsights) is cached in the same document; no repeated Gemini calls.
 * Never throws on Gemini failure; always returns a result.
 */
const Differential = require('../models/differential.model');
const { analyzeThirdOpCase } = require('./thirdopEngine');
const { generateClinicalReasoning } = require('./geminiService');
const { generateDifferential } = require('./llmService');
const { generateFallbackDifferential } = require('./ruleEngine');

const LLM_INSIGHTS_FALLBACK = {
  rankedConcerns: [],
  overallInterpretation: 'LLM analysis unavailable. Clinical analysis completed using rule-based system.',
  concerns: [],
  summary: 'LLM analysis unavailable. Clinical analysis completed using rule-based system.'
};

/**
 * Map stored llmInsights (DB shape) to API shape expected by frontend.
 * @param {Object} stored - { overallSummary, rankedConcerns, doctorQuestions, generatedAt }
 * @returns {Object} - { rankedConcerns, overallInterpretation, concerns, summary }
 */
function mapStoredLlmInsightsToApi(stored) {
  if (!stored) return null;
  const rankedConcerns = Array.isArray(stored.rankedConcerns) ? stored.rankedConcerns : [];
  const overallSummary = typeof stored.overallSummary === 'string' ? stored.overallSummary : '';
  return {
    rankedConcerns,
    overallInterpretation: overallSummary,
    concerns: rankedConcerns.map((c) => (c && c.title) || '').filter(Boolean),
    summary: overallSummary
  };
}

/**
 * Map API llmInsights to stored shape for DB.
 * @param {Object} api - { rankedConcerns, overallInterpretation, concerns, summary }
 * @returns {Object} - { overallSummary, rankedConcerns, doctorQuestions, generatedAt }
 */
function mapApiLlmInsightsToStored(api) {
  if (!api) return null;
  const rankedConcerns = Array.isArray(api.rankedConcerns) ? api.rankedConcerns : [];
  const overallSummary =
    typeof api.overallInterpretation === 'string' ? api.overallInterpretation
      : typeof api.summary === 'string' ? api.summary : '';
  const doctorQuestions = rankedConcerns.reduce((acc, c) => {
    if (Array.isArray(c.doctorQuestions)) acc.push(...c.doctorQuestions);
    return acc;
  }, []);
  return {
    overallSummary,
    rankedConcerns,
    doctorQuestions,
    generatedAt: new Date()
  };
}

/**
 * Get cached differential by reportId. Returns null if not found.
 * When present, includes llmInsights (stored shape) so caller can reuse without calling Gemini.
 */
async function getCachedDifferential(reportId) {
  const doc = await Differential.findOne({ reportId }).lean();
  if (!doc) return null;
  return {
    status: doc.status,
    message: doc.message,
    rankedDifferentials: doc.rankedDifferentials || [],
    source: doc.source,
    llmInsights: doc.llmInsights || null
  };
}

/**
 * Store differential result in cache. Optionally store llmInsights in the same document.
 * @param {string} reportId
 * @param {Object} payload - { status, message, rankedDifferentials }
 * @param {string} source - 'llm' | 'rules_fallback'
 * @param {Object} [llmInsightsApi] - API-shape llmInsights to cache (optional)
 */
async function saveDifferential(reportId, payload, source, llmInsightsApi = null) {
  const update = {
    reportId,
    status: payload.status,
    message: payload.message,
    rankedDifferentials: payload.rankedDifferentials || [],
    source
  };
  if (llmInsightsApi) {
    update.llmInsights = mapApiLlmInsightsToStored(llmInsightsApi);
  }
  await Differential.findOneAndUpdate(
    { reportId },
    update,
    { upsert: true, new: true }
  );
}

/**
 * Update only llmInsights for an existing differential document (e.g. doc existed without llmInsights).
 * @param {string} reportId
 * @param {Object} llmInsightsApi - API-shape llmInsights
 */
async function saveLlmInsights(reportId, llmInsightsApi) {
  const stored = mapApiLlmInsightsToStored(llmInsightsApi);
  if (!stored) return;
  await Differential.findOneAndUpdate(
    { reportId },
    { $set: { llmInsights: stored } },
    { new: true }
  );
}

/**
 * Full ThirdOp analysis: decision + clinical concerns (LLM) + differential (cache → LLM → fallback).
 * Clinical reasoning (llmInsights) is cached per reportId; Gemini is only called when missing.
 * @param {string} reportId
 * @param {Object} reportData - Normalized report data (keys like 'CREATININE (mg/dL)', etc.)
 * @param {Object} mlPrediction
 * @param {Object} [reportMetadata]
 * @returns {Promise<Object>} Full response payload for POST /api/thirdop/analyze
 */
async function generateDifferentialAnalysis(reportId, reportData, mlPrediction, reportMetadata = {}) {
  const input = {
    reportData,
    mlPrediction,
    reportMetadata
  };

  const decision = analyzeThirdOpCase(input);

  const cached = await getCachedDifferential(reportId);

  let differentialResult = null;
  let llmInsights = null;

  if (cached) {
    differentialResult = {
      status: cached.status,
      message: cached.message,
      rankedDifferentials: cached.rankedDifferentials || [],
      source: cached.source
    };
    if (cached.llmInsights) {
      llmInsights = mapStoredLlmInsightsToApi(cached.llmInsights);
    } else {
      try {
        llmInsights = await generateClinicalReasoning(decision, input);
      } catch (e) {
        console.error('[ThirdOp] Gemini clinical reasoning error:', e.message);
        llmInsights = LLM_INSIGHTS_FALLBACK;
      }
      if (!llmInsights) llmInsights = LLM_INSIGHTS_FALLBACK;
      await saveLlmInsights(reportId, llmInsights);
    }
  } else {
    try {
      llmInsights = await generateClinicalReasoning(decision, input);
    } catch (e) {
      console.error('[ThirdOp] Gemini clinical reasoning error:', e.message);
      llmInsights = LLM_INSIGHTS_FALLBACK;
    }
    if (!llmInsights) llmInsights = LLM_INSIGHTS_FALLBACK;

    try {
      differentialResult = await generateDifferential(decision, input);
      await saveDifferential(reportId, differentialResult, 'llm', llmInsights);
    } catch (err) {
      console.error('[ThirdOp] LLM differential failed, using rule fallback:', err.message);
      differentialResult = generateFallbackDifferential(input);
      await saveDifferential(reportId, differentialResult, 'rules_fallback', llmInsights);
    }
  }

  return {
    riskTier: decision.riskTier,
    decision: decision.decision,
    humanEscalation: decision.humanEscalation,
    confidence: decision.confidence,
    clinicalIndicators: decision.clinicalIndicators,
    rankedDifferentials: Array.isArray(differentialResult.rankedDifferentials)
      ? differentialResult.rankedDifferentials
      : [],
    status: differentialResult.status,
    message: differentialResult.message,
    differentialSource: differentialResult.source,
    llmInsights,
    explanation: '',
    explanationSource: 'rules',
    recommendedActions: [],
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  generateDifferentialAnalysis,
  getCachedDifferential,
  saveDifferential
};
