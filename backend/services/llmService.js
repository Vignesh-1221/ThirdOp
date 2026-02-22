/**
 * LLM service for differential diagnosis.
 * Calls Gemini; on any failure (429, timeout, network) the underlying call throws
 * so differentialService can catch and use rule-engine fallback.
 */
const { generateDifferentialDiagnosis } = require('./geminiService');

/**
 * Call Gemini for differential diagnosis.
 * @param {Object} thirdOpResult - Decision from analyzeThirdOpCase
 * @param {Object} clinicalData - { reportData, mlPrediction, reportMetadata }
 * @returns {Promise<{ status: string, message: string, rankedDifferentials: Array }>}
 * @throws On 429, timeout, network error, or any Gemini failure
 */
async function generateDifferential(thirdOpResult, clinicalData) {
  return generateDifferentialDiagnosis(thirdOpResult, clinicalData);
}

module.exports = { generateDifferential };
