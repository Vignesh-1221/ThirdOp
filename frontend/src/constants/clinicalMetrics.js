/**
 * Clinical metric definitions and normal ranges (aligned with backend thirdopEngine).
 * Used for MetricCard display and status derivation.
 */
export const METRIC_CONFIG = [
  {
    key: 'eGFR',
    label: 'eGFR',
    unit: 'mL/min/1.73 m²',
    normalRange: '≥60',
    min: 60,
    max: null,
    criticalLow: 30,
    criticalHigh: null,
    getValue: (d) => d?.eGFR ?? d?.EGFR ?? null
  },
  {
    key: 'CREATININE (mg/dL)',
    label: 'Creatinine',
    unit: 'mg/dL',
    normalRange: '0.6–1.2',
    min: 0.6,
    max: 1.2,
    criticalLow: null,
    criticalHigh: 2.5,
    getValue: (d) =>
      d?.['CREATININE (mg/dL)'] ?? d?.CREATININE ?? d?.creatinine ?? null
  },
  {
    key: 'ACR',
    label: 'ACR',
    unit: 'mg/g',
    normalRange: '<30',
    min: null,
    max: 30,
    criticalLow: null,
    criticalHigh: 300,
    getValue: (d) => d?.ACR ?? d?.acr ?? null
  },
  {
    key: 'ALBUMIN (g/dL)',
    label: 'Albumin',
    unit: 'g/dL',
    normalRange: '3.5–5.0',
    min: 3.5,
    max: 5.0,
    criticalLow: 2.5,
    criticalHigh: null,
    getValue: (d) =>
      d?.['ALBUMIN (g/dL)'] ?? d?.ALBUMIN ?? d?.albumin ?? null
  },
  {
    key: 'UREA (mg/dL)',
    label: 'Urea',
    unit: 'mg/dL',
    normalRange: '7–20',
    min: 7,
    max: 20,
    criticalLow: null,
    criticalHigh: 50,
    getValue: (d) => d?.['UREA (mg/dL)'] ?? d?.UREA ?? d?.urea ?? null
  },
  {
    key: 'URIC ACID (mg/dL)',
    label: 'Uric Acid',
    unit: 'mg/dL',
    normalRange: '3.5–7.2',
    min: 3.5,
    max: 7.2,
    criticalLow: null,
    criticalHigh: null,
    getValue: (d) =>
      d?.['URIC ACID (mg/dL)'] ??
      d?.['URIC_ACID'] ??
      d?.uric_acid ??
      d?.uricAcid ??
      null
  }
];

/**
 * Derive status for a metric: 'normal' | 'abnormal' | 'critical'
 */
export function getMetricStatus(config, value) {
  if (value === null || value === undefined) return 'unknown';
  const v = Number(value);
  if (Number.isNaN(v)) return 'unknown';

  if (config.criticalLow != null && v <= config.criticalLow) return 'critical';
  if (config.criticalHigh != null && v >= config.criticalHigh) return 'critical';
  if (config.min != null && v < config.min) return 'abnormal';
  if (config.max != null && v > config.max) return 'abnormal';
  if (config.min != null && config.max == null && v < config.min) return 'abnormal';
  return 'normal';
}

/**
 * One-line interpretation for metric card
 */
export function getMetricInterpretation(config, value, status) {
  if (status === 'unknown') return 'Value not available';
  if (status === 'normal') return 'Within reference range';
  const v = Number(value);
  if (status === 'critical') {
    if (config.key === 'eGFR') return 'Reduced kidney function; requires attention';
    if (config.key === 'ACR') return 'Elevated proteinuria';
    if (config.key === 'ALBUMIN (g/dL)') return 'Low albumin';
    if (config.key === 'CREATININE (mg/dL)' || config.key === 'UREA (mg/dL)') return 'Markedly elevated';
    return 'Critical range';
  }
  if (config.key === 'eGFR') return 'Mild reduction in kidney function';
  if (config.key === 'ACR') return 'Microalbuminuria or elevated';
  return 'Outside reference range';
}
