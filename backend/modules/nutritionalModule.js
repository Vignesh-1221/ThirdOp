/**
 * Nutritional deficiency module: runs when Vitamin D, Vitamin B12, or homocysteine is present.
 */

const MARKERS = ['vitamind', 'vitaminb12', 'homocysteine'];
const RANGES = {
  vitamind: { min: 20, max: 50 },
  vitaminb12: { min: 200, max: 900 },
  homocysteine: { min: 5, max: 15 }
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
    ? 'Nutritional markers within reference range.'
    : findings.map((f) => f.message).join('; ');

  return {
    applicable: true,
    findings,
    summary,
    module: 'nutritional'
  };
}

module.exports = { requiredMarkers, hasRequiredMarkers, run };
