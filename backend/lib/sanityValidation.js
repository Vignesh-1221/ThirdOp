/**
 * Medical sanity validation layer.
 * Rejects unrealistic values; sets invalid to null and logs warning.
 * All bounds are inclusive where applicable (min <= value <= max).
 */

const SANITY_BOUNDS = {
  creatinine: { min: 0.1, max: 30, unit: 'mg/dL' },
  urea: { min: 1, max: 300, unit: 'mg/dL' },
  albumin: { min: 0.5, max: 8, unit: 'g/dL' },
  uricacid: { min: 0, max: 25, unit: 'mg/dL' },
  egfr: { min: 0, max: 200, unit: 'mL/min/1.73m²' },
  acr: { min: 0, max: 10000, unit: 'mg/g' },

  glucose: { min: 20, max: 1000, unit: 'mg/dL' },
  hba1c: { min: 3.5, max: 20, unit: '%' },

  hemoglobin: { min: 2, max: 25, unit: 'g/dL' },
  platelets: { min: 1, max: 2000, unit: 'x10^3/µL' },
  wbc: { min: 0.1, max: 100, unit: 'x10^3/µL' },
  rbc: { min: 0.5, max: 10, unit: 'million/µL' },
  hematocrit: { min: 5, max: 65, unit: '%' },

  cholesterol: { min: 50, max: 500, unit: 'mg/dL' },
  ldl: { min: 0, max: 400, unit: 'mg/dL' },
  hdl: { min: 0, max: 150, unit: 'mg/dL' },
  triglyceride: { min: 0, max: 2000, unit: 'mg/dL' },

  vitamind: { min: 0, max: 200, unit: 'ng/mL' },
  vitaminb12: { min: 0, max: 2000, unit: 'pg/mL' },
  homocysteine: { min: 0, max: 100, unit: 'µmol/L' },

  ige: { min: 0, max: 10000, unit: 'IU/mL' },

  alt: { min: 0, max: 2000, unit: 'U/L' },
  ast: { min: 0, max: 2000, unit: 'U/L' },
  bilirubin: { min: 0, max: 50, unit: 'mg/dL' }
};

/**
 * Validate a single numeric value against sanity bounds.
 * @param {string} canonicalKey - Canonical parameter name
 * @param {number} value - Value to validate
 * @returns {{ value: number|null, warning: string|null }}
 */
function validateValue(canonicalKey, value) {
  if (value === null || value === undefined) return { value: null, warning: null };
  const num = Number(value);
  if (!Number.isFinite(num)) return { value: null, warning: `${canonicalKey}: non-numeric value rejected` };

  const bounds = SANITY_BOUNDS[canonicalKey];
  if (!bounds) return { value: num, warning: null };

  if (bounds.min != null && num < bounds.min) {
    return {
      value: null,
      warning: `Sanity: ${canonicalKey}=${num} below min ${bounds.min} ${bounds.unit}; value set to null.`
    };
  }
  if (bounds.max != null && num > bounds.max) {
    return {
      value: null,
      warning: `Sanity: ${canonicalKey}=${num} above max ${bounds.max} ${bounds.unit}; value set to null.`
    };
  }
  return { value: num, warning: null };
}

/**
 * Validate entire canonical report data object.
 * Mutates nothing; returns new object with invalid values set to null.
 * @param {Object} canonical - Canonical key -> value
 * @param {Object} [options] - { log: (msg) => void }
 * @returns {{ validated: Object, warnings: string[] }}
 */
function validateReportData(canonical, options = {}) {
  const log = options.log || (() => {});
  const warnings = [];
  const validated = {};

  if (!canonical || typeof canonical !== 'object') {
    return { validated: {}, warnings: [] };
  }

  for (const [key, value] of Object.entries(canonical)) {
    const result = validateValue(key, value);
    validated[key] = result.value;
    if (result.warning) {
      warnings.push(result.warning);
      log(result.warning);
    }
  }

  return { validated, warnings };
}

module.exports = {
  validateValue,
  validateReportData,
  SANITY_BOUNDS
};
