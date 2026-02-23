/**
 * Hematology module: runs when any of hemoglobin, platelets, WBC, RBC, hematocrit is present.
 */

const MARKERS = ['hemoglobin', 'platelets', 'wbc', 'rbc', 'hematocrit'];
const RANGES = {
  hemoglobin: { min: 12, max: 17.5 },
  platelets: { min: 150, max: 400 },
  wbc: { min: 4.5, max: 11 },
  rbc: { min: 4, max: 5.5 },
  hematocrit: { min: 34.9, max: 50 }
};

function requiredMarkers() {
  return [...MARKERS];
}

function hasRequiredMarkers(validated) {
  if (!validated || typeof validated !== 'object') return false;
  return MARKERS.some((k) => validated[k] != null && validated[k] !== '');
}

function run({ validated }) {
  if (!hasRequiredMarkers(validated)) return null;

  const findings = [];
  for (const key of MARKERS) {
    const v = validated[key];
    if (v == null || v === '') continue;
    const num = Number(v);
    if (!Number.isFinite(num)) continue;
    const range = RANGES[key];
    if (!range) continue;
    if (range.min != null && num < range.min) {
      findings.push({ parameter: key, value: num, status: 'low', message: `${key} ${num} (low, ref: ${range.min}-${range.max})` });
    } else if (range.max != null && num > range.max) {
      findings.push({ parameter: key, value: num, status: 'high', message: `${key} ${num} (high, ref: ${range.min}-${range.max})` });
    }
  }

  const summary = findings.length === 0
    ? 'Hematology parameters within reference range.'
    : findings.map((f) => f.message).join('; ');

  return {
    applicable: true,
    findings,
    summary,
    module: 'hematology'
  };
}

module.exports = { requiredMarkers, hasRequiredMarkers, run };
