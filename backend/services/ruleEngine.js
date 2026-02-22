/**
 * Rule-based fallback for differential diagnosis.
 * Returns the same shape as LLM: { status, message, rankedDifferentials }.
 * Used when Gemini fails (429, timeout, network).
 */
const { analyzeThirdOpCase } = require('./thirdopEngine');

const CONFIDENCE_TO_LIKELIHOOD = (c) => {
  if (c >= 0.6) return 'High';
  if (c >= 0.35) return 'Moderate';
  return 'Low';
};

/**
 * Generate rule-based differential result (same format as LLM).
 * @param {Object} input - { reportData, mlPrediction, reportMetadata }
 * @returns {{ status: string, message: string, rankedDifferentials: Array }}
 */
function generateFallbackDifferential(input) {
  const decision = analyzeThirdOpCase(input);
  const raw = decision.rankedDifferentials || [];

  const status =
    decision.riskTier === 'high' ? 'pathological' :
    decision.riskTier === 'medium' ? 'low-risk' :
    'healthy';

  const message =
    status === 'healthy'
      ? 'Lab values within or near normal limits; rule-based review did not suggest significant pathology.'
      : status === 'low-risk'
        ? 'Mild abnormalities noted; rule-based differential considerations below.'
        : 'Abnormalities suggest possible pathology; rule-based differential considerations below.';

  const rankedDifferentials = raw.slice(0, 5).map((item) => ({
    condition: item.condition || 'Consideration',
    likelihood: CONFIDENCE_TO_LIKELIHOOD(item.confidence),
    reasoning: item.rationale || item.reasoning || ''
  }));

  return { status, message, rankedDifferentials };
}

module.exports = { generateFallbackDifferential };
