/**
 * Modular ThirdOp execution: run only modules whose markers are present.
 */

const kidneyModule = require('./kidneyModule');
const diabetesModule = require('./diabetesModule');
const hematologyModule = require('./hematologyModule');
const lipidModule = require('./lipidModule');
const nutritionalModule = require('./nutritionalModule');
const allergyModule = require('./allergyModule');

const MODULES = [
  kidneyModule,
  diabetesModule,
  hematologyModule,
  lipidModule,
  nutritionalModule,
  allergyModule
];

/**
 * Run all applicable modules on validated canonical data.
 * Kidney module runs only when kidney markers AND mlPrediction are present.
 * @param {Object} params
 * @param {Object} params.validated - Validated canonical report data
 * @param {Object} [params.mlPrediction] - Required for kidney module
 * @param {Object} [params.reportMetadata]
 * @returns {{ kidney: Object|null, other: Object[] }}
 */
function runApplicableModules({ validated, mlPrediction, reportMetadata = {} }) {
  const results = { kidney: null, other: [] };

  for (const mod of MODULES) {
    if (mod === kidneyModule) {
      const out = kidneyModule.run({ validated, mlPrediction, reportMetadata });
      if (out) results.kidney = out;
      continue;
    }
    const out = mod.run({ validated });
    if (out) results.other.push(out);
  }

  return results;
}

/**
 * Check if kidney module can run (has markers + ML).
 */
function canRunKidney(validated, mlPrediction) {
  return kidneyModule.hasRequiredMarkers(validated) &&
    mlPrediction &&
    mlPrediction.status === 'success' &&
    mlPrediction.prediction != null &&
    Array.isArray(mlPrediction.probabilities) &&
    mlPrediction.probabilities.length === 2;
}

module.exports = {
  runApplicableModules,
  canRunKidney,
  kidneyModule,
  diabetesModule,
  hematologyModule,
  lipidModule,
  nutritionalModule,
  allergyModule,
  MODULES
};
