/**
 * Generic Lab Analysis Service (Any Report Analysis).
 * Separate from kidney/ThirdOp: no ML, no analyzeThirdOpCase.
 * - Extracts text from PDF; normalizes for robust matching
 * - Extracts parameters via deterministic pattern matching (no LLM for parsing)
 * - Detects abnormalities via H/L flags, keywords, and reference ranges
 * - Generic engine: Ollama when USE_OLLAMA_GENERIC=true; otherwise rule-based only.
 */

const fs = require('fs');
const { generateGenericConcernsViaOllama } = require('./ollamaGenericBridge');
const Report = require('../models/report.model');
const { normalizeReportData } = require('../lib/keyNormalizer');
const { validateReportData } = require('../lib/sanityValidation');
const { canonicalToDisplay } = require('../lib/keyNormalizer');

// Expanded set; match case-insensitive (PART 2)
const SUPPORTED_PARAMS = [
  'Hemoglobin',
  'Platelets',
  'WBC',
  'RBC',
  'Hematocrit',
  'Creatinine',
  'Urea',
  'Blood Urea Nitrogen',
  'Glucose',
  'Fasting Blood Sugar',
  'HbA1c',
  'Vitamin D',
  'Vitamin B12',
  'Triglyceride',
  'HDL',
  'LDL',
  'Cholesterol',
  'Homocysteine',
  'IgE',
  'ALT',
  'AST',
  'SGPT',
  'SGOT',
  'Bilirubin',
  'Urine Glucose'
];

/** Canonical name for each (merge SGPT→ALT, SGOT→AST, Fasting Blood Sugar→Glucose, BUN→Urea) */
const PARAM_ALIASES = {
  'Hemoglobin': ['hemoglobin', 'haemoglobin', 'hb', 'hb\\s*\\(g/dl\\)', 'hb\\s*\\(g%?\\)'],
  'Platelets': ['platelets', 'platelet', 'plt'],
  'WBC': ['wbc', 'white\\s*blood\\s*cell', 'leucocyte', 'leukocyte'],
  'RBC': ['rbc', 'red\\s*blood\\s*cell', 'erythrocyte'],
  'Hematocrit': ['hematocrit', 'hct', 'pcv', 'packed\\s*cell\\s*volume'],
  'Creatinine': ['creatinine', 'creat\\.?', 'serum\\s*creatinine'],
  'Urea': ['urea', 'blood\\s*urea', 'bun', 'blood\\s*urea\\s*nitrogen'],
  'Blood Urea Nitrogen': ['blood\\s*urea\\s*nitrogen', 'bun'],
  'Glucose': ['fasting\\s*blood\\s*glucose', 'fasting\\s*sugar', 'blood\\s*glucose', 'glucose', 'fbs', 'fasting\\s*glucose'],
  'Fasting Blood Sugar': ['fasting\\s*blood\\s*sugar', 'fasting\\s*sugar', 'fbs'],
  'HbA1c': ['hba1c', 'hb\\s*a1c', 'glycated\\s*hemoglobin', 'glycosylated\\s*hemoglobin'],
  'Vitamin D': ['vitamin\\s*d', 'vit\\s*d', '25\\s*oh\\s*vitamin\\s*d', '25-hydroxyvitamin'],
  'Vitamin B12': ['vitamin\\s*b12', 'vit\\s*b12', 'b12', 'cobalamin'],
  'Triglyceride': ['triglyceride', 'triglycerides', 'tg'],
  'HDL': ['hdl', 'hdl\\s*cholesterol', 'high\\s*density'],
  'LDL': ['ldl', 'ldl\\s*cholesterol', 'low\\s*density'],
  'Cholesterol': ['cholesterol', 'total\\s*cholesterol', 'serum\\s*cholesterol'],
  'Homocysteine': ['homocysteine', 'hcy'],
  'IgE': ['ige', 'immunoglobulin\\s*e', 'total\\s*ige'],
  'ALT': ['alt', 'alanine\\s*aminotransferase', 'sgpt'],
  'AST': ['ast', 'aspartate\\s*aminotransferase', 'sgot'],
  'SGPT': ['sgpt'],  // merged into ALT when storing
  'SGOT': ['sgot'],  // merged into AST when storing
  'Bilirubin': ['bilirubin', 'total\\s*bilirubin', 'serum\\s*bilirubin'],
  'Urine Glucose': ['urine\\s*glucose', 'glucose\\s*\\(urine\\)', 'sugar\\s*in\\s*urine']
};

/** Canonical name to store under when alias matches (SGPT→ALT, SGOT→AST to avoid duplicate). */
const STORE_AS = { 'SGPT': 'ALT', 'SGOT': 'AST' };

/** Map canonical key (from keyNormalizer) to REFERENCE_RANGES / buildAbnormalities param name */
const CANONICAL_TO_REF_NAME = {
  creatinine: 'Creatinine',
  urea: 'Urea',
  glucose: 'Glucose',
  hba1c: 'HbA1c',
  hemoglobin: 'Hemoglobin',
  platelets: 'Platelets',
  wbc: 'WBC',
  rbc: 'RBC',
  hematocrit: 'Hematocrit',
  cholesterol: 'Cholesterol',
  ldl: 'LDL',
  hdl: 'HDL',
  triglyceride: 'Triglyceride',
  vitamind: 'Vitamin D',
  vitaminb12: 'Vitamin B12',
  homocysteine: 'Homocysteine',
  ige: 'IgE',
  alt: 'ALT',
  ast: 'AST',
  bilirubin: 'Bilirubin'
};

/** Fallback reference ranges when not in report; gender-aware where applicable */
const REFERENCE_RANGES = {
  Hemoglobin: [
    { gender: 'male', low: 13.5, high: 17.5, unit: 'g/dL' },
    { gender: 'female', low: 12.0, high: 15.5, unit: 'g/dL' },
    { gender: 'generic', low: 12.0, high: 17.5, unit: 'g/dL' }
  ],
  Platelets: [{ gender: 'generic', low: 150, high: 400, unit: 'x10^3/µL' }],
  WBC: [{ gender: 'generic', low: 4.5, high: 11.0, unit: 'x10^3/µL' }],
  RBC: [
    { gender: 'male', low: 4.5, high: 5.5, unit: 'million/µL' },
    { gender: 'female', low: 4.0, high: 5.0, unit: 'million/µL' },
    { gender: 'generic', low: 4.0, high: 5.5, unit: 'million/µL' }
  ],
  Hematocrit: [
    { gender: 'male', low: 38.8, high: 50.0, unit: '%' },
    { gender: 'female', low: 34.9, high: 44.5, unit: '%' },
    { gender: 'generic', low: 34.9, high: 50.0, unit: '%' }
  ],
  Creatinine: [{ gender: 'generic', low: 0.7, high: 1.3, unit: 'mg/dL' }],
  Urea: [{ gender: 'generic', low: 7, high: 20, unit: 'mg/dL' }],
  'Blood Urea Nitrogen': [{ gender: 'generic', low: 7, high: 20, unit: 'mg/dL' }],
  Glucose: [{ gender: 'generic', low: 70, high: 100, unit: 'mg/dL' }],
  'Fasting Blood Sugar': [{ gender: 'generic', low: 70, high: 100, unit: 'mg/dL' }],
  HbA1c: [{ gender: 'generic', low: 4, high: 5.6, unit: '%' }],
  'Vitamin D': [{ gender: 'generic', low: 20, high: 50, unit: 'ng/mL' }],
  'Vitamin B12': [{ gender: 'generic', low: 200, high: 900, unit: 'pg/mL' }],
  Triglyceride: [{ gender: 'generic', low: 0, high: 150, unit: 'mg/dL' }],
  HDL: [{ gender: 'generic', low: 40, high: 60, unit: 'mg/dL' }],
  LDL: [{ gender: 'generic', low: 0, high: 100, unit: 'mg/dL' }],
  Cholesterol: [{ gender: 'generic', low: 0, high: 200, unit: 'mg/dL' }],
  Homocysteine: [{ gender: 'generic', low: 5, high: 15, unit: 'µmol/L' }],
  IgE: [{ gender: 'generic', low: 0, high: 100, unit: 'IU/mL' }],
  ALT: [{ gender: 'generic', low: 7, high: 56, unit: 'U/L' }],
  AST: [{ gender: 'generic', low: 8, high: 48, unit: 'U/L' }],
  SGPT: [{ gender: 'generic', low: 7, high: 56, unit: 'U/L' }],
  SGOT: [{ gender: 'generic', low: 8, high: 48, unit: 'U/L' }],
  Bilirubin: [{ gender: 'generic', low: 0.1, high: 1.2, unit: 'mg/dL' }]
};

/** Normalize frontend gender to male/female/generic */
function normalizeGender(gender) {
  if (!gender || typeof gender !== 'string') return 'generic';
  const g = gender.trim().toLowerCase();
  if (g === 'male') return 'male';
  if (g === 'female') return 'female';
  return 'generic';
}

/**
 * Extract text from PDF (basic extraction). Caller must normalize (PART 1).
 * @param {string} filePath - Absolute path to PDF
 * @returns {Promise<string>}
 */
async function extractTextFromPdf(filePath) {
  let pdfParse;
  try {
    pdfParse = require('pdf-parse');
  } catch (e) {
    throw new Error('PDF parsing not available. Install pdf-parse.');
  }
  const dataBuffer = fs.readFileSync(filePath);
  // Suppress PDF.js font warnings (e.g. "TT: undefined function: 32") - harmless TrueType messages
  const stderrWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = function (chunk, encoding, cb) {
    const s = typeof chunk === 'string' ? chunk : (chunk && chunk.toString ? chunk.toString() : '');
    if (typeof s === 'string' && /TT:\s*undefined\s*function/i.test(s)) {
      if (typeof cb === 'function') cb();
      return true;
    }
    return stderrWrite(chunk, encoding, cb);
  };
  let data;
  try {
    data = await pdfParse(dataBuffer);
  } finally {
    process.stderr.write = stderrWrite;
  }
  return (data && data.text) ? data.text : '';
}

// ---- PART 3: Flag-based abnormal detection ----
/** Returns 'high' | 'low' | 'present' | null. Uses word boundaries and keywords. */
function detectFlagInLine(line) {
  if (!line || typeof line !== 'string') return null;
  try {
    if (/Present\s*\(\s*\+\s*\)/i.test(line)) return 'present';
    if (/\bH\b/.test(line) || /\(High\)/i.test(line) || />\s*\d/.test(line)) return 'high';
    if (/\bL\b/.test(line) || /\(Low\)/i.test(line) || /<\s*\d/.test(line)) return 'low';
  } catch (_) { /* no throw */ }
  return null;
}

/** Extract ref range from a string: refMin - refMax. Returns { refMin, refMax } or null. */
function extractRefRange(str) {
  if (!str || typeof str !== 'string') return null;
  try {
    const m = str.match(/(\d+\.?\d*)\s*[-–—]\s*(\d+\.?\d*)/);
    if (m && m[1] != null && m[2] != null) {
      const a = parseFloat(m[1]);
      const b = parseFloat(m[2]);
      if (!Number.isNaN(a) && !Number.isNaN(b)) return { refMin: Math.min(a, b), refMax: Math.max(a, b) };
    }
  } catch (_) { /* no throw */ }
  return null;
}

/** Collect all numbers from string (for "largest numeric in block"). */
function collectNumbers(str) {
  if (!str || typeof str !== 'string') return [];
  try {
    const matches = str.match(/\d+\.?\d*/g);
    return (matches || []).map(s => parseFloat(s)).filter(n => !Number.isNaN(n));
  } catch (_) { return []; }
}

/** Map alias match to canonical SUPPORTED_PARAMS name (first in list wins to avoid duplicates). */
function canonicalParam(aliasKey) {
  const lower = aliasKey.toLowerCase();
  for (const name of SUPPORTED_PARAMS) {
    const aliases = PARAM_ALIASES[name];
    if (!aliases) continue;
    for (const a of aliases) {
      const r = new RegExp('^' + a + '$', 'i');
      if (r.test(lower)) return name;
    }
  }
  return null;
}

/**
 * Deterministic extraction: use compactText (lines) and flatText (cross-line).
 * Returns { params: { canonicalName: value }, flags: { canonicalName: 'H'|'L'|'present' }, refsFromReport: { canonicalName: { refMin, refMax } } }
 * Value may be number or 'present' for Urine Glucose. (PART 1, 2, 4)
 */
function extractParameters(compactText, flatText) {
  const params = {};
  const flags = {};
  const refsFromReport = {};
  const compact = (compactText || '').trim();
  const flat = (flatText || '').trim();
  const lines = compact.split('\n').map(l => l.trim()).filter(Boolean);

  // Build regex for each canonical param: one regex per alias set (match case-insensitive)
  const paramPatterns = [];
  for (const name of SUPPORTED_PARAMS) {
    const aliases = PARAM_ALIASES[name];
    if (!aliases) continue;
    const alt = aliases.map(a => '(?:' + a + ')').join('|');
    paramPatterns.push({ canonical: name, regex: new RegExp('\\b(' + alt + ')\\b', 'gi') });
  }

  // Helper: find value from a block (line or line + nextLine). Flag only from same line (avoid attributing next line's H/L to this param).
    function parseBlock(line, nextLine, canonicalName) {
    const combined = [line, nextLine].filter(Boolean).join(' ');
    const ref = extractRefRange(combined) || extractRefRange(line) || extractRefRange(nextLine || '');
    const flag = detectFlagInLine(line); // only same line to avoid next line's H/L being attributed here

    if (flag === 'present') {
      return { value: 'present', ref, flag: 'present' };
    }

    const allNums = [...collectNumbers(line), ...collectNumbers(nextLine || '')];
    if (ref) {
      const valueCandidates = allNums.filter(n => n !== ref.refMin && n !== ref.refMax);
      // Exclude single digit that is likely part of param name (e.g. "1" in HbA1c)
      const filtered = valueCandidates.filter(n => {
        if (String(n).length === 1 && canonicalName && String(canonicalName).toLowerCase().includes(String(n))) return false;
        return true;
      });
      const preferred = filtered.length ? Math.max(...filtered) : null;
      if (preferred != null && !Number.isNaN(preferred)) return { value: preferred, ref, flag: flag || null };
      if (flag) return { value: null, ref, flag }; // e.g. "HbA1c H % 4 - 5.6" with no value on line
    }
    if (allNums.length) {
      const val = Math.max(...allNums);
      return { value: val, ref: null, flag: flag || null };
    }
    if (flag) return { value: null, ref: null, flag };
    return null;
  }

  // Scan lines (and line + next) for each supported param
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : null;
    for (const { canonical, regex } of paramPatterns) {
      try {
        regex.lastIndex = 0;
        if (!regex.test(line)) continue;
      } catch (_) { continue; }

      const parsed = parseBlock(line, nextLine, canonical);
      if (!parsed) continue;

      // Don't treat "Urine Glucose" line as "Glucose" (avoid duplicate)
      if (canonical === 'Glucose' && /urine\s*glucose|glucose\s*\(\s*urine\s*\)/i.test(line)) continue;

      const storeKey = STORE_AS[canonical] || canonical;
      if (params[storeKey] === undefined || parsed.value !== null) {
        if (parsed.value !== null && parsed.value !== undefined) {
          if (parsed.value === 'present') {
            params[storeKey] = 'present';
          } else {
            const n = Number(parsed.value);
            if (!Number.isNaN(n)) params[storeKey] = n;
          }
        }
        if (parsed.flag) flags[storeKey] = parsed.flag;
        if (parsed.ref) refsFromReport[storeKey] = parsed.ref;
      }
    }
  }

  // Also run on flatText for cross-line matches (e.g. "HbA1c 6.2" across line break)
  for (const { canonical, regex } of paramPatterns) {
    try {
      regex.lastIndex = 0;
      const m = regex.exec(flat);
      if (!m) continue;
    } catch (_) { continue; }

    // Avoid treating "Urine Glucose" as "Glucose" in flat text
    if (canonical === 'Glucose' && /urine\s*glucose|glucose\s*\(\s*urine\s*\)/i.test(flat)) continue;

    const ref = extractRefRange(flat);
    const nums = collectNumbers(flat);
    const flag = detectFlagInLine(flat);
    const storeKey = STORE_AS[canonical] || canonical;
    if (flag === 'present' && canonical === 'Urine Glucose') {
      if (params[storeKey] === undefined) {
        params[storeKey] = 'present';
        flags[storeKey] = 'present';
      }
      continue;
    }
    if (params[storeKey] !== undefined) continue; // already from line scan
    if (nums.length && ref) {
      const val = nums.find(n => n !== ref.refMin && n !== ref.refMax) ?? (nums.length ? Math.max(...nums) : null);
      // Avoid assigning a value from flat when many numbers (could be from another param)
      if (val != null && !(nums.length > 2 && ref)) {
        params[storeKey] = val;
        refsFromReport[storeKey] = ref;
      }
    } else if (nums.length) {
      if (nums.length <= 2) params[storeKey] = Math.max(...nums);
    }
    // Don't set 'present' flag for Glucose from flat text (usually Urine Glucose Present (+))
    if (flag && !flags[storeKey] && !(flag === 'present' && canonical === 'Glucose')) flags[storeKey] = flag;
  }

  return { params, flags, refsFromReport };
}

/**
 * Get reference range for a parameter and gender (from hardcoded REFERENCE_RANGES).
 */
function getRange(paramName, gender) {
  const ranges = REFERENCE_RANGES[paramName];
  if (!ranges) return null;
  const g = normalizeGender(gender);
  const specific = ranges.find(r => r.gender === g);
  const fallback = ranges.find(r => r.gender === 'generic');
  return specific || fallback || null;
}

/**
 * Build list of abnormalities (PART 5): flag-based first, then value vs ref range.
 * @param {Object} extracted - { params, flags, refsFromReport } from extractParameters, or legacy { paramName: value }
 * @param {string} genderFromFrontend
 * @returns {Array<{ parameter, value, status: 'low'|'high'|'present' }>}
 */
function buildAbnormalities(extracted, genderFromFrontend) {
  const abnormalities = [];
  // Backward compat: plain { paramName: value } when no .params / .flags / .refsFromReport
  const isLegacy = extracted && extracted.params === undefined && extracted.flags === undefined && extracted.refsFromReport === undefined;
  const params = isLegacy ? extracted : (extracted.params || {});
  const flags = isLegacy ? {} : (extracted.flags || {});
  const refsFromReport = isLegacy ? {} : (extracted.refsFromReport || {});
  const gender = normalizeGender(genderFromFrontend);
  const allParamNames = [...new Set([...Object.keys(params), ...Object.keys(flags)])];

  for (const paramName of allParamNames) {
    const value = params[paramName];
    const flag = flags[paramName];
    const refReport = refsFromReport[paramName];
    const range = getRange(paramName, gender);

    // Present (+) → abnormal
    if (value === 'present' || flag === 'present') {
      abnormalities.push({ parameter: paramName, value: value === 'present' ? 'Present (+)' : value, status: 'present' });
      continue;
    }

    const numVal = value != null && value !== 'present' ? Number(value) : NaN;
    if (Number.isNaN(numVal)) {
      if (flag === 'high') abnormalities.push({ parameter: paramName, value: null, status: 'high' });
      if (flag === 'low') abnormalities.push({ parameter: paramName, value: null, status: 'low' });
      continue;
    }

    const refMin = refReport ? refReport.refMin : (range ? range.low : null);
    const refMax = refReport ? refReport.refMax : (range ? range.high : null);

    // Flag-based: if H/L on line, mark abnormal even if we have range (report already flagged it)
    if (flag === 'high') {
      abnormalities.push({ parameter: paramName, value: numVal, status: 'high' });
      continue;
    }
    if (flag === 'low') {
      abnormalities.push({ parameter: paramName, value: numVal, status: 'low' });
      continue;
    }

    if (refMin != null && refMax != null) {
      const usedGeneric = range && range.gender === 'generic' && ['Hemoglobin', 'RBC', 'Hematocrit'].includes(paramName);
      if (numVal < refMin) {
        abnormalities.push({
          parameter: paramName,
          value: numVal,
          status: 'low',
          ...(usedGeneric && { limitation: true })
        });
      } else if (numVal > refMax) {
        abnormalities.push({
          parameter: paramName,
          value: numVal,
          status: 'high',
          ...(usedGeneric && { limitation: true })
        });
      }
    }
  }

  return abnormalities;
}

/**
 * Build structured abnormal payload for Ollama (Generic Engine). Only abnormal values.
 * Shape: [{ testName, value, unit, referenceRange, status }].
 * @param {Array<{ parameter: string, value: number|string, status: string }>} abnormalities
 * @param {string} genderFromFrontend
 * @returns {Array<{ testName: string, value: number|string, unit: string, referenceRange: string, status: string }>}
 */
function buildAbnormalPayloadForOllama(abnormalities, genderFromFrontend) {
  const gender = normalizeGender(genderFromFrontend);
  return (abnormalities || []).map((a) => {
    const range = getRange(a.parameter, gender);
    const unit = range && range.unit ? range.unit : '';
    const referenceRange =
      range && range.low != null && range.high != null
        ? `${range.low}-${range.high}`
        : '';
    return {
      testName: a.parameter || 'Lab',
      value: a.value != null ? a.value : '',
      unit,
      referenceRange,
      status: a.status || 'abnormal'
    };
  });
}

/**
 * Rule-based fallback when Ollama crashes or returns invalid JSON. Used only in those cases.
 */
function getRuleFallbackConcerns(abnormalities) {
  return {
    rankedConcerns: (abnormalities || []).map((a) => ({
      title: `${a.parameter} is ${a.status}`,
      severity: 'moderate',
      reasoning: `Lab value ${a.parameter}: ${a.value != null ? a.value : 'flagged'} (${a.status}).`,
      doctorQuestions: ['Should I repeat this test?', 'What could cause this?'],
      recommendedDepartment: 'General Medicine'
    }))
  };
}

/**
 * Map Ollama generic result concerns to rankedConcerns shape (title, reasoning, doctorQuestions, severity).
 */
function mapOllamaConcernsToRanked(concerns) {
  return (concerns || []).map((c) => ({
    title: c.title || 'Finding',
    reasoning: c.reason || '',
    doctorQuestions: Array.isArray(c.doctorQuestions) ? c.doctorQuestions : [],
    severity: 'moderate'
  }));
}

/**
 * Get generic concerns: Ollama when USE_OLLAMA_GENERIC=true; otherwise rule-based only.
 * Fallback to rule engine ONLY if Ollama crashes, times out, or returns invalid JSON/schema.
 * Returns { rankedConcerns, recommendedDepartment?, precautions? }.
 */
async function getGenericConcernsResult(abnormalities, gender) {
  const useOllama = process.env.USE_OLLAMA_GENERIC === 'true';

  if (useOllama) {
    console.log('[GenericLab] Using Ollama');
    try {
      const abnormalPayload = buildAbnormalPayloadForOllama(abnormalities, gender);
      console.log('[GenericLab] Spawning Ollama process');
      const aiResponse = await generateGenericConcernsViaOllama(abnormalPayload);
      if (
        !aiResponse ||
        !Array.isArray(aiResponse.concerns) ||
        typeof aiResponse.recommendedDepartment !== 'string' ||
        !Array.isArray(aiResponse.precautions)
      ) {
        throw new Error('Invalid Ollama schema');
      }
      console.log('[GenericLab] Ollama success');
      return {
        rankedConcerns: mapOllamaConcernsToRanked(aiResponse.concerns),
        recommendedDepartment: aiResponse.recommendedDepartment,
        precautions: aiResponse.precautions
      };
    } catch (error) {
      console.error('[GenericLab] Ollama failed → using rule fallback:', error.message);
      return getRuleFallbackConcerns(abnormalities);
    }
  }

  console.log('[GenericLab] Using rule engine (flag disabled)');
  return getRuleFallbackConcerns(abnormalities);
}

/**
 * Run full generic analysis (PART 1, 6, 7): PDF → normalize text → extract → abnormalities → LLM (if any) → save.
 * Never throws on parsing failure; continues with partial data; LLM failure → fallback concerns.
 */
async function runGenericAnalysis(filePath, gender, userId) {
  let rawText = '';
  try {
    rawText = await extractTextFromPdf(filePath);
  } catch (err) {
    return { status: 'invalid_report', message: 'Could not read PDF. Please upload a valid PDF file.' };
  }

  // PART 1: Normalize text – preserve line breaks in one version, flatten in the other
  const normalizedText = (rawText || '').replace(/\r/g, '');
  const compactText = normalizedText.replace(/\n+/g, '\n');
  const flatText = normalizedText.replace(/\s+/g, ' ');

  let extracted;
  try {
    extracted = extractParameters(compactText, flatText);
  } catch (err) {
    extracted = { params: {}, flags: {}, refsFromReport: {} };
  }

  const rawParams = extracted.params || {};
  const paramCount = Object.keys(rawParams).length;

  // PART 6: Status logic – prevent false "normal"
  if (paramCount === 0) {
    return { status: 'invalid_report' };
  }

  // Medical sanity: normalize keys to canonical, validate numeric ranges (invalid -> null)
  const { canonical } = normalizeReportData(rawParams);
  const { validated, warnings } = validateReportData(canonical, { log: (msg) => console.warn('[GenericLab]', msg) });
  // Build display-keyed params for buildAbnormalities (REFERENCE_RANGES use display names)
  const paramsForAbnormalities = {};
  for (const [can, val] of Object.entries(validated)) {
    const refName = CANONICAL_TO_REF_NAME[can];
    if (refName != null && val != null) paramsForAbnormalities[refName] = val;
  }
  const extractedForAbnormalities = {
    params: paramsForAbnormalities,
    flags: extracted.flags || {},
    refsFromReport: extracted.refsFromReport || {}
  };

  let abnormalities = [];
  try {
    abnormalities = buildAbnormalities(extractedForAbnormalities, gender);
  } catch (_) {
    abnormalities = [];
  }

  // Use validated (canonical) for storage; convert to display for API consistency
  const params = canonicalToDisplay(validated);

  const extractedParams = paramCount;
  const hasEnoughParams = extractedParams >= 3;

  if (extractedParams < 3) {
    // partial_data: do not return "normal"; save and return partial_data (with concerns if any abnormalities)
    let rankedConcerns = [];
    let recommendedDepartment = '';
    let precautions = [];
    if (abnormalities.length > 0) {
      const llmResult = await getGenericConcernsResult(abnormalities, gender);
      rankedConcerns = llmResult.rankedConcerns || [];
      recommendedDepartment = llmResult.recommendedDepartment || '';
      precautions = llmResult.precautions || [];
    }
    const report = new Report({
      user: userId,
      reportType: 'Generic Lab',
      source: 'upload_generic',
      reportData: params,
      analysisType: 'generic',
      genericAnalysisResult: {
        status: 'partial_data',
        abnormalities,
        rankedConcerns,
        ...(recommendedDepartment && { recommendedDepartment }),
        ...(precautions.length > 0 && { precautions }),
        message: 'Limited parameters extracted; review recommended.'
      }
    });
    await report.save();
    return {
      status: 'partial_data',
      concerns: rankedConcerns,
      reportId: report._id,
      abnormalities,
      ...(recommendedDepartment && { recommendedDepartment }),
      ...(precautions.length > 0 && { precautions }),
      message: 'Limited parameters extracted; review recommended.'
    };
  }

  if (hasEnoughParams && abnormalities.length === 0) {
    const report = new Report({
      user: userId,
      reportType: 'Generic Lab',
      source: 'upload_generic',
      reportData: params,
      analysisType: 'generic',
      genericAnalysisResult: {
        status: 'normal',
        message: 'No clinically significant abnormalities detected.',
        rankedConcerns: []
      }
    });
    await report.save();
    return {
      status: 'normal',
      message: 'No clinically significant abnormalities detected.',
      reportId: report._id
    };
  }

  // Abnormal: Ollama when USE_OLLAMA_GENERIC=true, else rule-based; fallback only on Ollama crash (PART 7)
  const llmResult = await getGenericConcernsResult(abnormalities, gender);
  const rankedConcerns = llmResult.rankedConcerns || [];
  const recommendedDepartment = llmResult.recommendedDepartment || '';
  const precautions = llmResult.precautions || [];

  const report = new Report({
    user: userId,
    reportType: 'Generic Lab',
    source: 'upload_generic',
    reportData: params,
    analysisType: 'generic',
    genericAnalysisResult: {
      status: 'abnormal',
      abnormalities,
      rankedConcerns,
      ...(recommendedDepartment && { recommendedDepartment }),
      ...(precautions.length > 0 && { precautions })
    }
  });
  await report.save();

  return {
    status: 'abnormal',
    concerns: rankedConcerns,
    reportId: report._id,
    abnormalities,
    ...(recommendedDepartment && { recommendedDepartment }),
    ...(precautions.length > 0 && { precautions })
  };
}

// Backward compatibility: extractParameters(text) returns plain { paramName: value } when called with one string
function extractParametersLegacy(text) {
  const compact = (text || '').replace(/\r/g, '').replace(/\n+/g, '\n');
  const flat = (text || '').replace(/\r/g, '').replace(/\s+/g, ' ');
  const out = extractParameters(compact, flat);
  return out.params || {};
}

module.exports = {
  extractTextFromPdf,
  extractParameters: extractParametersLegacy,
  extractParametersFull: extractParameters,
  buildAbnormalities,
  runGenericAnalysis,
  SUPPORTED_PARAMS,
  REFERENCE_RANGES
};
