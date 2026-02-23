/**
 * Kidney module: runs only when kidney markers (creatinine, urea, albumin, egfr, acr) are present.
 * Depends on ML prediction for full decision support. Uses existing thirdopEngine logic.
 */

const { analyzeThirdOpCase } = require('../services/thirdopEngine');

const KIDNEY_MARKERS = ['creatinine', 'urea', 'albumin', 'egfr', 'acr'];

/**
 * @returns {string[]} Canonical keys; at least one should be present to run this module.
 */
function requiredMarkers() {
  return KIDNEY_MARKERS;
}

/**
 * Check if validated data has at least one kidney marker present.
 * @param {Object} validated - Canonical validated report data
 */
function hasRequiredMarkers(validated) {
  if (!validated || typeof validated !== 'object') return false;
  return KIDNEY_MARKERS.some((k) => validated[k] != null && validated[k] !== '');
}

/**
 * Build reportData shape expected by thirdopEngine (lowercase keys).
 * @param {Object} validated - Canonical validated data
 */
function toEngineReportData(validated) {
  if (!validated) return {};
  return {
    creatinine: validated.creatinine ?? null,
    urea: validated.urea ?? null,
    albumin: validated.albumin ?? null,
    uricAcid: validated.uricacid ?? null,
    egfr: validated.egfr ?? null,
    acr: validated.acr ?? null
  };
}

/**
 * Run kidney module. Requires ML prediction for full analysis.
 * @param {Object} params
 * @param {Object} params.validated - Validated canonical report data
 * @param {Object} params.mlPrediction - ML prediction (prediction, probabilities, status)
 * @param {Object} [params.reportMetadata]
 * @returns {Object|null} Kidney result (riskTier, decision, etc.) or null if cannot run
 */
function run({ validated, mlPrediction, reportMetadata = {} }) {
  if (!hasRequiredMarkers(validated)) return null;
  if (!mlPrediction || mlPrediction.status !== 'success') return null;
  if (mlPrediction.prediction === null || mlPrediction.prediction === undefined) return null;
  if (!Array.isArray(mlPrediction.probabilities) || mlPrediction.probabilities.length !== 2) return null;

  const reportData = toEngineReportData(validated);
  const input = {
    reportData,
    mlPrediction,
    reportMetadata
  };

  try {
    return analyzeThirdOpCase(input);
  } catch (err) {
    console.error('[KidneyModule] analyzeThirdOpCase error:', err.message);
    return null;
  }
}

module.exports = {
  requiredMarkers: () => [...KIDNEY_MARKERS],
  hasRequiredMarkers,
  run
};
