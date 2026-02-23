/**
 * Diabetes module: runs when HbA1c or fasting glucose is present.
 * No dependency on kidney or ML.
 */

const MARKERS = ['hba1c', 'glucose'];
const HBA1C_NORMAL_MAX = 5.6;
const HBA1C_DIABETIC = 6.5;
const GLUCOSE_FASTING_NORMAL_MAX = 100;
const GLUCOSE_FASTING_DIABETIC = 126;

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
  let summary = '';

  const hba1c = validated.hba1c != null ? Number(validated.hba1c) : null;
  const glucose = validated.glucose != null ? Number(validated.glucose) : null;

  if (hba1c != null && Number.isFinite(hba1c)) {
    if (hba1c >= HBA1C_DIABETIC) {
      findings.push({ parameter: 'HbA1c', value: hba1c, status: 'elevated', message: `HbA1c ${hba1c}% (diabetic range ≥${HBA1C_DIABETIC}%)` });
    } else if (hba1c > HBA1C_NORMAL_MAX) {
      findings.push({ parameter: 'HbA1c', value: hba1c, status: 'abnormal', message: `HbA1c ${hba1c}% (prediabetic range)` });
    }
  }
  if (glucose != null && Number.isFinite(glucose)) {
    if (glucose >= GLUCOSE_FASTING_DIABETIC) {
      findings.push({ parameter: 'Glucose', value: glucose, status: 'elevated', message: `Fasting glucose ${glucose} mg/dL (diabetic range ≥${GLUCOSE_FASTING_DIABETIC})` });
    } else if (glucose > GLUCOSE_FASTING_NORMAL_MAX) {
      findings.push({ parameter: 'Glucose', value: glucose, status: 'abnormal', message: `Fasting glucose ${glucose} mg/dL (impaired fasting glucose)` });
    }
  }

  if (findings.length === 0) summary = 'Diabetes markers within or near normal.';
  else summary = findings.map((f) => f.message).join('; ');

  return {
    applicable: true,
    findings,
    summary,
    module: 'diabetes'
  };
}

module.exports = { requiredMarkers, hasRequiredMarkers, run };
