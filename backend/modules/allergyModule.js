/**
 * Allergy / immunology module: runs when IgE is present.
 */

const MARKERS = ['ige'];
const IgE_ELEVATED = 100;

function requiredMarkers() {
  return [...MARKERS];
}

function hasRequiredMarkers(validated) {
  if (!validated || typeof validated !== 'object') return false;
  return validated.ige != null && validated.ige !== '';
}

function run({ validated }) {
  if (!hasRequiredMarkers(validated)) return null;

  const v = validated.ige;
  const num = Number(v);
  if (!Number.isFinite(num)) return { applicable: true, findings: [], summary: 'IgE value not interpretable.', module: 'allergy' };

  const findings = [];
  if (num > IgE_ELEVATED) {
    findings.push({ parameter: 'IgE', value: num, status: 'elevated', message: `IgE ${num} (elevated)` });
  }

  const summary = findings.length === 0
    ? 'IgE within reference range.'
    : findings.map((f) => f.message).join('; ');

  return {
    applicable: true,
    findings,
    summary,
    module: 'allergy'
  };
}

module.exports = { requiredMarkers, hasRequiredMarkers, run };
