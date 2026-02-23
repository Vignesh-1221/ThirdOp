/**
 * ThirdOp controller: normalization, sanity validation, conditional module execution.
 * - Normalizes all reportData keys to canonical (lowercase, no spaces)
 * - Validates medical sanity (invalid values set to null, logged)
 * - Runs kidney path only when kidney markers + ML present; no global mandatory creatinine/urea/albumin
 */

const { normalizeReportData, canonicalToDisplay } = require('../lib/keyNormalizer');
const { validateReportData } = require('../lib/sanityValidation');
const { runApplicableModules, canRunKidney } = require('../modules');
const { generateDifferentialAnalysis } = require('./differentialService');

/**
 * Prepare report data for API/engine: normalize -> validate -> return canonical + display.
 * @param {Object} rawReportData - Raw from request or DB (any key format)
 * @param {Object} [options] - { log: (msg) => void }
 * @returns {{ canonical: Object, validated: Object, display: Object, warnings: string[] }}
 */
function prepareReportData(rawReportData, options = {}) {
  const log = options.log || (() => {});
  const { canonical, warnings: normWarnings } = normalizeReportData(rawReportData || {});
  const { validated, warnings: valWarnings } = validateReportData(canonical, { log });
  const warnings = [...normWarnings, ...valWarnings];
  const display = canonicalToDisplay(validated);
  return { canonical, validated, display, warnings };
}

/**
 * Run full ThirdOp analysis (differential + LLM) when kidney markers and ML are present.
 * Otherwise return a minimal response indicating no kidney analysis.
 * Re-analysis: pass reportId + normalized/validated data; always use stored reportData from DB when re-analyzing.
 *
 * @param {Object} params
 * @param {string} params.reportId
 * @param {Object} params.reportData - Raw report data (will be normalized and validated)
 * @param {Object} [params.mlPrediction] - Required for kidney decision support
 * @param {Object} [params.reportMetadata]
 * @param {Object} [params.prepared] - If provided, skip normalize/validate (e.g. re-analysis with already-prepared data)
 * @returns {Promise<Object>} Analysis result for POST /api/thirdop/analyze
 */
async function runThirdOpAnalysis({ reportId, reportData, mlPrediction, reportMetadata = {}, prepared = null }) {
  let validated;
  let display;
  let warnings = [];

  if (prepared && prepared.validated != null) {
    validated = prepared.validated;
    display = prepared.display || canonicalToDisplay(validated);
    warnings = prepared.warnings || [];
  } else {
    const prep = prepareReportData(reportData, { log: (msg) => console.warn('[ThirdOp]', msg) });
    validated = prep.validated;
    display = prep.display;
    warnings = prep.warnings;
  }

  const modulesResult = runApplicableModules({
    validated,
    mlPrediction: mlPrediction || null,
    reportMetadata
  });

  if (canRunKidney(validated, mlPrediction)) {
    const fullResult = await generateDifferentialAnalysis(
      reportId,
      display,
      mlPrediction,
      reportMetadata
    );
    return {
      ...fullResult,
      normalizedReportData: display,
      validationWarnings: warnings,
      moduleResults: modulesResult.other
    };
  }

  return {
    riskTier: null,
    decision: null,
    humanEscalation: false,
    confidence: null,
    clinicalIndicators: { abnormalValues: [], criticalFlags: [] },
    rankedDifferentials: [],
    status: 'no_kidney_analysis',
    message: 'Kidney markers or ML prediction not available; kidney decision support was not run.',
    differentialSource: null,
    llmInsights: null,
    explanation: '',
    explanationSource: 'rules',
    recommendedActions: [],
    timestamp: new Date().toISOString(),
    normalizedReportData: display,
    validationWarnings: warnings,
    moduleResults: modulesResult.other
  };
}

module.exports = {
  prepareReportData,
  runThirdOpAnalysis
};
