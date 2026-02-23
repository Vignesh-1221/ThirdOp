/**
 * LLM service for differential diagnosis and MedGemma-style reasoning.
 * Differential: rule-based only (no cloud LLM). Fallback shape for ThirdOp.
 * MedGemma: Ollama only (gemma:7b) for nephrology clinical reasoning.
 */

const { generateFallbackDifferential } = require('./ruleEngine');
const { generateMedGemmaReasoningViaOllama } = require('./ollamaMedGemmaBridge');

/**
 * Return rule-based differential (same shape as former LLM). No cloud API.
 * @param {Object} thirdOpResult - Decision from analyzeThirdOpCase
 * @param {Object} clinicalData - { reportData, mlPrediction, reportMetadata }
 * @returns {Promise<{ status: string, message: string, rankedDifferentials: Array }>}
 */
async function generateDifferential(thirdOpResult, clinicalData) {
  return generateFallbackDifferential(clinicalData);
}

/**
 * MedGemma-style nephrology reasoning: structured lab JSON → concerns + patient Q&A. Ollama only.
 * @param {Object} structuredLabInput - Lab values as plain object
 * @returns {Promise<{ concerns: Array<{ title, reason }>, qa: Array<{ question, answer }> }>}
 */
async function generateMedGemmaReasoning(structuredLabInput) {
  return generateMedGemmaReasoningViaOllama(structuredLabInput);
}

module.exports = {
  generateDifferential,
  generateMedGemmaReasoning
};
