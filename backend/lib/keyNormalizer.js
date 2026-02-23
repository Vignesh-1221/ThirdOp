/**
 * Key normalization layer for report data.
 * Converts all keys to canonical form: lowercase, no spaces.
 * Ensures consistent lookup regardless of source (DB, manual entry, PDF extraction).
 */

/** Canonical key (lowercase, no spaces) -> list of possible incoming key variants (case-insensitive match) */
const CANONICAL_ALIASES = {
  // Kidney
  creatinine: ['creatinine', 'creatinine (mg/dl)', 'creatinine(mg/dl)', 'creatine', 'creatininelevel', 'creatinelevel'],
  urea: ['urea', 'urea (mg/dl)', 'urea(mg/dl)', 'urealevel', 'blood urea', 'bun', 'blood urea nitrogen'],
  albumin: ['albumin', 'albumin (g/dl)', 'albumin(g/dl)', 'albuminlevel', 'serum albumin'],
  uricacid: ['uric acid', 'uric acid (mg/dl)', 'uric_acid', 'uricacid'],
  egfr: ['egfr', 'egfrvalue', 'gfr', 'glomerular filtration rate', 'egfr (ml/min)'],
  acr: ['acr', 'acrvalue', 'albumin-to-creatinine', 'albumin creatinine ratio'],

  // Diabetes
  glucose: ['glucose', 'fasting glucose', 'fasting blood sugar', 'fbs', 'blood glucose', 'glucose (mg/dl)'],
  hba1c: ['hba1c', 'hb a1c', 'glycated hemoglobin', 'glycosylated hemoglobin', 'a1c'],

  // Hematology
  hemoglobin: ['hemoglobin', 'haemoglobin', 'hb', 'hemoglobin (g/dl)', 'hblevel'],
  platelets: ['platelets', 'platelet', 'plt', 'platelets (x10^3/µl)'],
  wbc: ['wbc', 'white blood cell', 'leukocyte', 'leucocyte', 'wbc (x10^3/µl)'],
  rbc: ['rbc', 'red blood cell', 'erythrocyte', 'rbc (million/µl)'],
  hematocrit: ['hematocrit', 'hct', 'pcv', 'packed cell volume', 'hematocrit (%)'],

  // Lipid
  cholesterol: ['cholesterol', 'total cholesterol', 'serum cholesterol', 'cholesterol (mg/dl)'],
  ldl: ['ldl', 'ldl cholesterol', 'low density lipoprotein', 'ldl (mg/dl)'],
  hdl: ['hdl', 'hdl cholesterol', 'high density lipoprotein', 'hdl (mg/dl)'],
  triglyceride: ['triglyceride', 'triglycerides', 'tg', 'triglycerides (mg/dl)'],

  // Nutritional
  vitamind: ['vitamin d', 'vitamin d (ng/ml)', 'vit d', '25-hydroxyvitamin d', '25 oh vitamin d'],
  vitaminb12: ['vitamin b12', 'vitamin b12 (pg/ml)', 'vit b12', 'b12', 'cobalamin'],
  homocysteine: ['homocysteine', 'hcy', 'homocysteine (µmol/l)'],

  // Allergy / Immunology
  ige: ['ige', 'immunoglobulin e', 'total ige', 'ige (iu/ml)'],

  // Liver / chemistry
  alt: ['alt', 'sgpt', 'alanine aminotransferase', 'alt (u/l)'],
  ast: ['ast', 'sgot', 'aspartate aminotransferase', 'ast (u/l)'],
  bilirubin: ['bilirubin', 'total bilirubin', 'bilirubin (mg/dl)']
};

/** Normalize key string for lookup: lowercase, no spaces, no punctuation */
function keyToLookup(key) {
  return key.toLowerCase().replace(/\s+/g, '').replace(/[_\-\/\(\)\.]/g, '');
}

/** Build a flat map: normalized variant -> canonical key (e.g. "creatinine (mg/dl)" -> "creatinine") */
function buildVariantToCanonical() {
  const map = new Map();
  for (const [canonical, aliases] of Object.entries(CANONICAL_ALIASES)) {
    for (const a of aliases) {
      const normalized = keyToLookup(a);
      if (!map.has(normalized)) map.set(normalized, canonical);
    }
    const canonicalNorm = keyToLookup(canonical);
    if (!map.has(canonicalNorm)) map.set(canonicalNorm, canonical);
  }
  return map;
}

const variantToCanonical = buildVariantToCanonical();

/**
 * Normalize a single key to canonical form.
 * @param {string} key - Raw key (e.g. "Vitamin B12", "CREATININE (mg/dL)")
 * @returns {string} Canonical key (e.g. "vitaminb12", "creatinine")
 */
function normalizeKey(key) {
  if (key == null || typeof key !== 'string') return '';
  const normalized = keyToLookup(key);
  return variantToCanonical.get(normalized) || normalized;
}

/**
 * Normalize an entire report data object to canonical keys.
 * Preserves the last-seen value for each canonical key (later keys override).
 * @param {Object} raw - Raw report data (any key format)
 * @returns {Object} { canonical: { creatinine: 1.2, egfr: 90, ... }, warnings: [] }
 */
function normalizeReportData(raw) {
  const canonical = {};
  const warnings = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { canonical: {}, warnings: [] };
  }

  for (const [key, value] of Object.entries(raw)) {
    if (key === '' || value === undefined) continue;
    const can = normalizeKey(key);
    if (!can) continue;

    let numVal = value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '' || trimmed.toLowerCase() === 'nil' || trimmed.toLowerCase() === 'na') continue;
      numVal = Number(trimmed);
    }
    if (typeof numVal === 'number' && !Number.isFinite(numVal)) continue;
    if (numVal !== null && numVal !== undefined && typeof numVal !== 'number') continue;

    canonical[can] = numVal;
  }

  return { canonical, warnings };
}

/**
 * Get display keys for frontend compatibility (e.g. CREATININE (mg/dL), eGFR).
 * Use when returning reportData to clients that expect these labels.
 */
const CANONICAL_TO_DISPLAY = {
  creatinine: 'CREATININE (mg/dL)',
  urea: 'UREA (mg/dL)',
  albumin: 'ALBUMIN (g/dL)',
  uricacid: 'URIC ACID (mg/dL)',
  egfr: 'eGFR',
  acr: 'ACR',
  glucose: 'Glucose (mg/dL)',
  hba1c: 'HbA1c (%)',
  hemoglobin: 'Hemoglobin (g/dL)',
  platelets: 'Platelets (x10^3/µL)',
  wbc: 'WBC (x10^3/µL)',
  rbc: 'RBC (million/µL)',
  hematocrit: 'Hematocrit (%)',
  cholesterol: 'Cholesterol (mg/dL)',
  ldl: 'LDL (mg/dL)',
  hdl: 'HDL (mg/dL)',
  triglyceride: 'Triglycerides (mg/dL)',
  vitamind: 'Vitamin D (ng/mL)',
  vitaminb12: 'Vitamin B12 (pg/mL)',
  homocysteine: 'Homocysteine (µmol/L)',
  ige: 'IgE (IU/mL)',
  alt: 'ALT (U/L)',
  ast: 'AST (U/L)',
  bilirubin: 'Bilirubin (mg/dL)'
};

/**
 * Convert canonical object to display-key object for API responses.
 * @param {Object} canonical - { creatinine: 1.2, egfr: 90 }
 * @returns {Object} { 'CREATININE (mg/dL)': 1.2, eGFR: 90 }
 */
function canonicalToDisplay(canonical) {
  if (!canonical || typeof canonical !== 'object') return {};
  const out = {};
  for (const [can, value] of Object.entries(canonical)) {
    const display = CANONICAL_TO_DISPLAY[can] || can;
    out[display] = value;
  }
  return out;
}

module.exports = {
  normalizeKey,
  normalizeReportData,
  canonicalToDisplay,
  CANONICAL_ALIASES,
  CANONICAL_TO_DISPLAY
};
