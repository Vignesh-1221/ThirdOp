/**
 * Lipid module: runs when any of cholesterol, LDL, HDL, triglyceride is present.
 */

const MARKERS = ['cholesterol', 'ldl', 'hdl', 'triglyceride'];
const RANGES = {
  cholesterol: { max: 200 },
  ldl: { max: 100 },
  hdl: { min: 40 },
  triglyceride: { max: 150 }
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
      findings.push({ parameter: key, value: num, status: 'low', message: `${key} ${num} (low)` });
    } else if (range.max != null && num > range.max) {
      findings.push({ parameter: key, value: num, status: 'high', message: `${key} ${num} (elevated)` });
    }
  }

  const summary = findings.length === 0
    ? 'Lipid panel within target.'
    : findings.map((f) => f.message).join('; ');

  return {
    applicable: true,
    findings,
    summary,
    module: 'lipid'
  };
}

module.exports = { requiredMarkers, hasRequiredMarkers, run };
