/**
 * Differential service: cache-first for differential (rule-based); clinical reasoning from MedGemma (Ollama).
 * Flow: 1) Rule-based decision 2) Cached differential or rule-based differential 3) Explanation/concerns from MedGemma (Ollama).
 */
const Differential = require('../models/differential.model');
const { analyzeThirdOpCase } = require('./thirdopEngine');
const { generateDifferential, generateMedGemmaReasoning } = require('./llmService');
const { generateFallbackDifferential } = require('./ruleEngine');

const LLM_INSIGHTS_FALLBACK = {
  rankedConcerns: [],
  overallInterpretation: 'Clinical reasoning unavailable. Rule-based analysis completed.',
  concerns: [],
  summary: 'Clinical reasoning unavailable. Rule-based analysis completed.'
};

/**
 * Build API llmInsights shape from MedGemma output (concerns with title, reason, doctorQuestions).
 * Frontend expects rankedConcerns with title, reasoning, and doctorQuestions (bullet list under each accordion).
 * @param {Array<{ title: string, reason: string, doctorQuestions?: string[] }>} concerns - From generateMedGemmaReasoning
 * @returns {Object} - { rankedConcerns, overallInterpretation, concerns, summary }
 */
function llmInsightsFromMedGemma(concerns) {
  const list = Array.isArray(concerns) ? concerns : [];
  const rankedConcerns = list.map((c) => ({
    title: typeof c.title === 'string' ? c.title : '',
    reasoning: typeof c.reason === 'string' ? c.reason : '',
    doctorQuestions: Array.isArray(c.doctorQuestions) ? c.doctorQuestions.filter((q) => typeof q === 'string' && q.trim()) : []
  }));
  const firstReason = rankedConcerns[0]?.reasoning ?? '';
  return {
    rankedConcerns,
    overallInterpretation: firstReason,
    concerns: rankedConcerns.map((c) => c.title).filter(Boolean),
    summary: firstReason
  };
}

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
 * When present, includes llmInsights (stored shape) so caller can reuse without calling the reasoning service again.
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
 * Full ThirdOp analysis: rule-based decision + differential (cache → LLM → fallback) + explanation from MedGemma only.
 * This path does NOT use any cloud LLM for explanation/clinical reasoning; only MedGemma (Ollama). Risk and escalation stay rule-based.
 * @param {string} reportId
 * @param {Object} reportData - Normalized report data (display keys e.g. 'CREATININE (mg/dL)')
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

  if (cached) {
    differentialResult = {
      status: cached.status,
      message: cached.message,
      rankedDifferentials: cached.rankedDifferentials || [],
      source: cached.source
    };
  } else {
    try {
      differentialResult = await generateDifferential(decision, input);
      await saveDifferential(reportId, differentialResult, 'llm', null);
    } catch (err) {
      console.error('[ThirdOp] LLM differential failed, using rule fallback:', err.message);
      differentialResult = generateFallbackDifferential(input);
      await saveDifferential(reportId, differentialResult, 'rules_fallback', null);
    }
  }

  // Explanation and clinical reasoning: always from MedGemma (Ollama).
  let llmInsights = LLM_INSIGHTS_FALLBACK;
  let concerns = [];
  let explanationSource = 'rules';

  console.log('[ANALYZE] Using Ollama MedGemma');
  try {
    const riskLevel =
      decision.riskTier === 'high' ? 'HIGH' : decision.riskTier === 'medium' ? 'MODERATE' : 'LOW';
    const medgemmaPayload = { ...reportData, riskLevel };
    const medgemma = await generateMedGemmaReasoning(medgemmaPayload);
    concerns = Array.isArray(medgemma.concerns) ? medgemma.concerns : [];
    llmInsights = llmInsightsFromMedGemma(concerns);
    explanationSource = 'ollama';
    // Persist llmInsights for cache consistency (optional; next run still calls MedGemma for fresh result)
    await saveLlmInsights(reportId, llmInsights);
  } catch (e) {
    console.error('[ThirdOp] MedGemma clinical reasoning error:', e.message);
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
    concerns,
    explanation: '',
    explanationSource,
    recommendedActions: [],
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  generateDifferentialAnalysis,
  getCachedDifferential,
  saveDifferential
};
