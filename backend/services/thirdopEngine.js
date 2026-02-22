/**
 * ThirdOp Decision Engine
 * Pure function module for risk assessment and decision support
 * No side effects, no external dependencies
 */

/**
 * Clinical value normal ranges (based on standard medical guidelines)
 */
const CLINICAL_RANGES = {
  CREATININE: { min: 0.6, max: 1.2, criticalHigh: 2.5, criticalLow: null },
  UREA: { min: 7, max: 20, criticalHigh: 50, criticalLow: null },
  ALBUMIN: { min: 3.5, max: 5.0, criticalHigh: null, criticalLow: 2.5 },
  eGFR: { min: 60, max: null, criticalHigh: null, criticalLow: 30 },
  ACR: { min: null, max: 30, criticalHigh: 300, criticalLow: null }
};

/**
 * CKD Stages based on eGFR
 */
const CKD_STAGES = {
  STAGE_3A: { min: 45, max: 59 },
  STAGE_3B: { min: 30, max: 44 },
  STAGE_4: { min: 15, max: 29 },
  STAGE_5: { min: 0, max: 14 }
};

/**
 * Evaluates a single clinical value against normal and critical thresholds
 * @param {string} parameter - Name of the clinical parameter
 * @param {number} value - Clinical value to evaluate
 * @returns {Object} - { isAbnormal: boolean, isCritical: boolean, message: string }
 */
function evaluateClinicalParameter(parameter, value) {
  if (value === null || value === undefined) {
    return { isAbnormal: false, isCritical: false, message: null };
  }

  const range = CLINICAL_RANGES[parameter];
  if (!range) {
    return { isAbnormal: false, isCritical: false, message: null };
  }

  let isAbnormal = false;
  let isCritical = false;
  let message = null;

  // Check if value is outside normal range
  if (range.min !== null && value < range.min) {
    isAbnormal = true;
    if (range.criticalLow !== null && value <= range.criticalLow) {
      isCritical = true;
      message = `${parameter}: ${value} (critical low, normal: ${range.min}-${range.max || 'N/A'})`;
    } else {
      message = `${parameter}: ${value} (low, normal: ${range.min}-${range.max || 'N/A'})`;
    }
  } else if (range.max !== null && value > range.max) {
    isAbnormal = true;
    if (range.criticalHigh !== null && value >= range.criticalHigh) {
      isCritical = true;
      message = `${parameter}: ${value} (critical high, normal: ${range.min}-${range.max || 'N/A'})`;
    } else {
      message = `${parameter}: ${value} (high, normal: ${range.min}-${range.max || 'N/A'})`;
    }
  }

  return { isAbnormal, isCritical, message };
}

/**
 * Evaluates eGFR and returns CKD stage information
 * @param {number} egfr - eGFR value
 * @returns {Object} - { stage: string, isAbnormal: boolean, isCritical: boolean, message: string }
 */
function evaluateEGFR(egfr) {
  if (egfr === null || egfr === undefined) {
    return { stage: null, isAbnormal: false, isCritical: false, message: null };
  }

  let stage = null;
  let isAbnormal = false;
  let isCritical = false;
  let message = null;

  if (egfr >= 60) {
    stage = 'normal';
  } else if (egfr >= 45) {
    stage = 'stage_3a';
    isAbnormal = true;
    message = `eGFR: ${egfr} (Stage 3a CKD, normal: ≥60)`;
  } else if (egfr >= 30) {
    stage = 'stage_3b';
    isAbnormal = true;
    isCritical = true;
    message = `eGFR: ${egfr} (Stage 3b CKD, normal: ≥60)`;
  } else if (egfr >= 15) {
    stage = 'stage_4';
    isAbnormal = true;
    isCritical = true;
    message = `eGFR: ${egfr} (Stage 4 CKD, normal: ≥60)`;
  } else {
    stage = 'stage_5';
    isAbnormal = true;
    isCritical = true;
    message = `eGFR: ${egfr} (Stage 5 CKD, normal: ≥60)`;
  }

  return { stage, isAbnormal, isCritical, message };
}

/**
 * Evaluates ACR and returns proteinuria classification
 * @param {number} acr - ACR value
 * @returns {Object} - { classification: string, isAbnormal: boolean, isCritical: boolean, message: string }
 */
function evaluateACR(acr) {
  if (acr === null || acr === undefined) {
    return { classification: null, isAbnormal: false, isCritical: false, message: null };
  }

  let classification = null;
  let isAbnormal = false;
  let isCritical = false;
  let message = null;

  if (acr < 30) {
    classification = 'normal';
  } else if (acr <= 300) {
    classification = 'microalbuminuria';
    isAbnormal = true;
    message = `ACR: ${acr} (microalbuminuria, normal: <30)`;
  } else {
    classification = 'macroalbuminuria';
    isAbnormal = true;
    isCritical = true;
    message = `ACR: ${acr} (severe proteinuria, normal: <30)`;
  }

  return { classification, isAbnormal, isCritical, message };
}

/**
 * Assesses clinical values and returns aggregated risk assessment
 * @param {Object} reportData - Clinical values object
 * @returns {Object} - { clinicalRisk: string, abnormalCount: number, criticalCount: number, indicators: Object }
 */
function assessClinicalRisk(reportData) {
  const indicators = {
    abnormalValues: [],
    criticalFlags: []
  };

  let abnormalCount = 0;
  let criticalCount = 0;

  // Evaluate CREATININE
  const creatinineEval = evaluateClinicalParameter('CREATININE', reportData.creatinine);
  if (creatinineEval.isAbnormal) {
    abnormalCount++;
    indicators.abnormalValues.push(creatinineEval.message);
    if (creatinineEval.isCritical) {
      criticalCount++;
      indicators.criticalFlags.push(`CREATININE > ${CLINICAL_RANGES.CREATININE.criticalHigh} mg/dL`);
    }
  }

  // Evaluate UREA
  const ureaEval = evaluateClinicalParameter('UREA', reportData.urea);
  if (ureaEval.isAbnormal) {
    abnormalCount++;
    indicators.abnormalValues.push(ureaEval.message);
    if (ureaEval.isCritical) {
      criticalCount++;
      indicators.criticalFlags.push(`UREA > ${CLINICAL_RANGES.UREA.criticalHigh} mg/dL`);
    }
  }

  // Evaluate ALBUMIN
  const albuminEval = evaluateClinicalParameter('ALBUMIN', reportData.albumin);
  if (albuminEval.isAbnormal) {
    abnormalCount++;
    indicators.abnormalValues.push(albuminEval.message);
    if (albuminEval.isCritical) {
      criticalCount++;
      indicators.criticalFlags.push(`ALBUMIN < ${CLINICAL_RANGES.ALBUMIN.criticalLow} g/dL`);
    }
  }

  // Evaluate eGFR (special handling for CKD stages)
  const egfrEval = evaluateEGFR(reportData.egfr);
  if (egfrEval.isAbnormal) {
    abnormalCount++;
    if (egfrEval.message) {
      indicators.abnormalValues.push(egfrEval.message);
    }
    if (egfrEval.isCritical) {
      criticalCount++;
      if (egfrEval.stage === 'stage_3b' || egfrEval.stage === 'stage_4' || egfrEval.stage === 'stage_5') {
        indicators.criticalFlags.push(`eGFR < 45 (${egfrEval.stage.replace('_', ' ').toUpperCase()})`);
      }
      if (egfrEval.stage === 'stage_4' || egfrEval.stage === 'stage_5') {
        indicators.criticalFlags.push(`eGFR < 30 (${egfrEval.stage.replace('_', ' ').toUpperCase()})`);
      }
    }
  }

  // Evaluate ACR (special handling for proteinuria)
  const acrEval = evaluateACR(reportData.acr);
  if (acrEval.isAbnormal) {
    abnormalCount++;
    if (acrEval.message) {
      indicators.abnormalValues.push(acrEval.message);
    }
    if (acrEval.isCritical) {
      criticalCount++;
      indicators.criticalFlags.push(`ACR > 300 (severe proteinuria)`);
    }
  }

  // Determine clinical risk tier based on aggregation rules
  let clinicalRisk = 'low';
  if (criticalCount >= 2) {
    clinicalRisk = 'high';
  } else if (criticalCount >= 1 || abnormalCount >= 2) {
    clinicalRisk = 'medium';
  } else if (abnormalCount >= 1) {
    clinicalRisk = 'low';
  }

  return {
    clinicalRisk,
    abnormalCount,
    criticalCount,
    indicators
  };
}

/**
 * Assesses ML prediction signal strength
 * @param {Object} mlPrediction - ML prediction object
 * @returns {Object} - { mlSignal: string, mlRisk: string, probability: number }
 * NOTE: mlRisk is coarse-grained ('low' | 'medium' | 'high') for agreement checks
 */
function assessMLSignal(mlPrediction) {
  const prediction = mlPrediction.prediction;
  const probabilities = mlPrediction.probabilities;
  const positiveProbability = probabilities[1];
  const negativeProbability = probabilities[0];

  let mlSignal = 'weak';
  let mlRisk = 'low';

  if (prediction === 1) {
    // Positive prediction
    if (positiveProbability >= 0.8) {
      mlSignal = 'strong_high';
      mlRisk = 'high';
    } else if (positiveProbability >= 0.6) {
      mlSignal = 'moderate';
      mlRisk = 'medium';
    } else {
      mlSignal = 'weak';
      mlRisk = 'low';
    }
  } else {
    // Negative prediction
    if (negativeProbability >= 0.8) {
      mlSignal = 'strong_negative';
      mlRisk = 'low';
    } else {
      mlSignal = 'uncertain_negative';
      mlRisk = 'low';
    }
  }

  return {
    mlSignal,
    mlRisk,
    probability: prediction === 1 ? positiveProbability : negativeProbability
  };
}

/**
 * Determines combined risk tier from ML signal and clinical risk
 * @param {string} mlSignal - ML signal strength
 * @param {string} clinicalRisk - Clinical risk tier
 * @returns {string} - Combined risk tier: 'low', 'medium', or 'high'
 */
function determineRiskTier(mlSignal, clinicalRisk) {
  // Risk tier determination matrix from design contract
  const riskMatrix = {
    'strong_high': {
      'high': 'high',
      'medium': 'high',
      'low': 'medium'
    },
    'moderate': {
      'high': 'high',
      'medium': 'medium',
      'low': 'medium'
    },
    'weak': {
      'high': 'medium',
      'medium': 'low',
      'low': 'low'
    },
    'strong_negative': {
      'high': 'low',
      'medium': 'low',
      'low': 'low'
    },
    'uncertain_negative': {
      'high': 'medium',
      'medium': 'low',
      'low': 'low'
    }
  };

  return riskMatrix[mlSignal]?.[clinicalRisk] || 'low';
}

/**
 * Applies exception rules that override risk tier
 * @param {Object} reportData - Clinical values
 * @param {string} currentRiskTier - Current calculated risk tier
 * @returns {string} - Potentially overridden risk tier
 */
function applyExceptionRules(reportData, currentRiskTier) {
  // Exception rule 1: eGFR < 30 always elevates to high risk
  if (reportData.egfr !== null && reportData.egfr !== undefined && reportData.egfr < 30) {
    return 'high';
  }

  // Exception rule 2: ACR > 300 always elevates to high risk
  if (reportData.acr !== null && reportData.acr !== undefined && reportData.acr > 300) {
    return 'high';
  }

  // Exception rule 3: CREATININE > 3.0 AND eGFR < 45 elevates to high risk
  if (
    reportData.creatinine !== null && reportData.creatinine !== undefined && reportData.creatinine > 3.0 &&
    reportData.egfr !== null && reportData.egfr !== undefined && reportData.egfr < 45
  ) {
    return 'high';
  }

  return currentRiskTier;
}

/**
 * Maps risk tier to decision
 * @param {string} riskTier - Risk tier: 'low', 'medium', or 'high'
 * @returns {string} - Decision: 'monitor', 'recommend_tests', or 'escalate'
 */
function mapRiskToDecision(riskTier) {
  const decisionMap = {
    'low': 'monitor',
    'medium': 'request_additional_tests',
    'high': 'escalate'
  };
  return decisionMap[riskTier] || 'monitor';
}

/**
 * Applies exception rules that override decision to 'escalate'
 * @param {Object} reportData - Clinical values
 * @param {string} currentDecision - Current calculated decision
 * @returns {string} - Potentially overridden decision
 */
function applyDecisionExceptions(reportData, currentDecision) {
  // Exception: eGFR < 30 always escalates
  if (reportData.egfr !== null && reportData.egfr !== undefined && reportData.egfr < 30) {
    return 'escalate';
  }

  // Exception: ACR > 300 always escalates
  if (reportData.acr !== null && reportData.acr !== undefined && reportData.acr > 300) {
    return 'escalate';
  }

  // Exception: CREATININE > 3.0 AND eGFR < 45 always escalates
  if (
    reportData.creatinine !== null && reportData.creatinine !== undefined && reportData.creatinine > 3.0 &&
    reportData.egfr !== null && reportData.egfr !== undefined && reportData.egfr < 45
  ) {
    return 'escalate';
  }

  return currentDecision;
}

/**
 * Determines if human escalation is required
 * @param {string} riskTier - Risk tier
 * @param {string} decision - Decision
 * @param {Object} reportData - Clinical values
 * @param {Object} mlPrediction - ML prediction
 * @param {number} criticalCount - Number of critical clinical flags
 * @returns {boolean} - True if human escalation required
 */
function determineHumanEscalation(riskTier, decision, reportData, mlPrediction, criticalCount) {
  // Rule 1: High risk + escalate decision
  if (riskTier === 'high' && decision === 'escalate') {
    return true;
  }

  // Rule 2: eGFR < 30 (Stage 4 or 5 CKD)
  if (reportData.egfr !== null && reportData.egfr !== undefined && reportData.egfr < 30) {
    return true;
  }

  // Rule 3: ACR > 300 (severe proteinuria)
  if (reportData.acr !== null && reportData.acr !== undefined && reportData.acr > 300) {
    return true;
  }

  // Rule 4: ML prediction probability > 0.9 for positive diagnosis
  if (mlPrediction.prediction === 1 && mlPrediction.probabilities[1] > 0.9) {
    return true;
  }

  // Rule 5: ≥ 2 critical clinical flags (aligns with design contract)
  if (criticalCount >= 2) {
    return true;
  }

  return false;
}

/**
 * Calculates confidence score based on agreement between ML and clinical rules
 * @param {Object} mlAssessment - ML signal assessment
 * @param {Object} clinicalAssessment - Clinical risk assessment
 * @param {string} riskTier - Final risk tier
 * @returns {number} - Confidence score between 0.4 and 1.0
 */
function calculateConfidence(mlAssessment, clinicalAssessment, riskTier) {
  // Base confidence is the ML probability (use the higher probability)
  const baseConfidence = mlAssessment.probability;

  // Determine if ML and clinical rules agree
  const mlRiskTier = mlAssessment.mlRisk;
  const clinicalRiskTier = clinicalAssessment.clinicalRisk;

  let agreementBonus = 0;
  let conflictPenalty = 0;

  // Check agreement: if ML risk and clinical risk align with final risk tier
  const mlAgrees = (mlRiskTier === 'high' && riskTier === 'high') ||
                   (mlRiskTier === 'medium' && riskTier === 'medium') ||
                   (mlRiskTier === 'low' && riskTier === 'low');

  const clinicalAgrees = (clinicalRiskTier === 'high' && riskTier === 'high') ||
                         (clinicalRiskTier === 'medium' && riskTier === 'medium') ||
                         (clinicalRiskTier === 'low' && riskTier === 'low');

  // If both ML and clinical agree with final risk tier, add bonus
  if (mlAgrees && clinicalAgrees) {
    agreementBonus = 0.1;
  } else if (mlAgrees || clinicalAgrees) {
    // Partial agreement
    agreementBonus = 0.05;
  } else {
    // Conflict between ML and clinical
    conflictPenalty = 0.2;
  }

  // Critical flags increase confidence
  const criticalBonus = Math.min(clinicalAssessment.criticalCount * 0.05, 0.1);

  // Calculate final confidence
  let confidence = baseConfidence + agreementBonus - conflictPenalty + criticalBonus;

  // Clamp confidence between 0.4 and 1.0 (matches design contract)
  confidence = Math.max(0.4, Math.min(1.0, confidence));

  return Math.round(confidence * 100) / 100; // Round to 2 decimal places
}

/**
 * Computes non-diagnostic ranked differential considerations.
 * NOTE: Non-diagnostic differential considerations – for decision support only.
 * Uses only existing inputs (ML IgA probability, ACR, eGFR, albumin, riskTier).
 *
 * @param {Object} params
 * @param {number} params.igaProbability - ML probability for IgA (0..1)
 * @param {number|null} params.acr - Albumin-to-creatinine ratio
 * @param {number|null} params.egfr - eGFR
 * @param {number|null} params.albumin - Serum albumin
 * @param {string} params.riskTier - 'low' | 'medium' | 'high'
 * @returns {Array<{condition: string, confidence: number, rationale: string}>}
 */
function computeRankedDifferentials({ igaProbability, acr, egfr, albumin, riskTier }) {
  const clamp01 = (n) => Math.max(0, Math.min(1, n));

  const riskBoost =
    riskTier === 'high' ? 0.12 :
    riskTier === 'medium' ? 0.07 :
    0.03;

  // Inputs are assumed to be numbers or null (null means "absent").
  const hasHeavyProteinuria = acr !== null && acr >= 300;
  const hasModerateProteinuria = acr !== null && acr >= 30 && acr < 300;
  const hasReducedEgfr = egfr !== null && egfr < 60;
  const hasSeverelyReducedEgfr = egfr !== null && egfr < 30;
  const hasLowAlbumin = albumin !== null && albumin < 3.0;

  // IgA nephropathy: anchored primarily by ML probability, then refined by kidney damage/proteinuria signals.
  const igaScore =
    clamp01(igaProbability) +
    (hasModerateProteinuria ? 0.05 : 0) +
    (hasHeavyProteinuria ? 0.10 : 0) +
    (hasReducedEgfr ? 0.05 : 0) +
    (hasSeverelyReducedEgfr ? 0.05 : 0) +
    riskBoost;

  // Diabetic nephropathy: proteinuria + reduced eGFR pattern (no diabetes input available, so conservative baseline).
  const diabeticScore =
    0.25 +
    (hasModerateProteinuria ? 0.10 : 0) +
    (hasHeavyProteinuria ? 0.15 : 0) +
    (hasReducedEgfr ? 0.10 : 0) +
    (hasSeverelyReducedEgfr ? 0.10 : 0) +
    (riskTier === 'high' ? 0.05 : 0);

  // Hypertensive nephrosclerosis: eGFR reduction with typically lower proteinuria (no BP input; use ACR as proxy).
  const hypertensiveScore =
    0.22 +
    (hasReducedEgfr ? 0.15 : 0) +
    (hasSeverelyReducedEgfr ? 0.10 : 0) +
    (hasModerateProteinuria ? -0.05 : 0) +
    (hasHeavyProteinuria ? -0.10 : 0) +
    (riskTier === 'high' ? 0.05 : 0);

  // Minimal change disease: heavy proteinuria + low albumin pattern.
  const mcdScore =
    0.20 +
    (hasHeavyProteinuria ? 0.25 : 0) +
    (hasLowAlbumin ? 0.25 : 0) +
    (hasSeverelyReducedEgfr ? -0.05 : 0); // MCD can have AKI, but severe CKD is less typical

  // Other glomerulopathy: catch-all, rises when kidney injury/proteinuria are present but IgA probability is not dominant.
  const otherGlomScore =
    0.28 +
    (hasModerateProteinuria ? 0.10 : 0) +
    (hasHeavyProteinuria ? 0.15 : 0) +
    (hasReducedEgfr ? 0.10 : 0) +
    (clamp01(igaProbability) < 0.55 ? 0.08 : 0) +
    (riskTier === 'high' ? 0.05 : 0);

  const items = [
    {
      condition: 'IgA nephropathy',
      confidence: clamp01(igaScore),
      rationale:
        `Non-diagnostic differential considerations: driven by ML IgA probability (${clamp01(igaProbability).toFixed(2)})` +
        `${acr !== null ? `, ACR ${acr}` : ''}` +
        `${egfr !== null ? `, eGFR ${egfr}` : ''}` +
        `${albumin !== null ? `, albumin ${albumin}` : ''}` +
        `, overall risk tier '${riskTier}'.`
    },
    {
      condition: 'Diabetic nephropathy',
      confidence: clamp01(diabeticScore),
      rationale:
        'Non-diagnostic differential considerations: proteinuria (ACR) and reduced eGFR can be compatible with diabetic kidney disease; no diabetes history is available in inputs, so this remains conservative.'
    },
    {
      condition: 'Hypertensive nephrosclerosis',
      confidence: clamp01(hypertensiveScore),
      rationale:
        'Non-diagnostic differential considerations: reduced eGFR with relatively lower proteinuria can be compatible with hypertensive nephrosclerosis; no blood pressure history is available in inputs.'
    },
    {
      condition: 'Minimal change disease',
      confidence: clamp01(mcdScore),
      rationale:
        'Non-diagnostic differential considerations: heavy proteinuria (high ACR) plus low serum albumin can be compatible with nephrotic-pattern diseases such as minimal change disease.'
    },
    {
      condition: 'Other glomerulopathy',
      confidence: clamp01(otherGlomScore),
      rationale:
        'Non-diagnostic differential considerations: proteinuria and/or reduced eGFR can reflect other glomerular diseases when the IgA-specific signal is not dominant.'
    }
  ];

  // Non-diagnostic differential considerations:
  // keep deterministic ordering by sorting confidence DESC, and always return a visible top list.
  return items
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

/**
 * Normalizes input data to internal format
 * Supports multiple field name formats for manual and upload entries
 * @param {Object} input - Raw input object
 * @returns {Object} - Normalized input
 */
function normalizeInput(input) {
  const reportData = input.reportData || {};
  const mlPrediction = input.mlPrediction || {};

  return {
    reportData: {
      // CREATININE: supports multiple formats with fallback logic
      creatinine:
        reportData['CREATININE (mg/dL)'] ??
        reportData.CREATININE ??
        reportData.creatinine ??
        reportData.creatinineLevel ??
        reportData.creatineLevel ??
        null,
      // UREA: supports multiple formats with fallback logic
      urea:
        reportData['UREA (mg/dL)'] ??
        reportData.UREA ??
        reportData.urea ??
        reportData.ureaLevel ??
        null,
      // ALBUMIN: supports multiple formats with fallback logic
      albumin:
        reportData['ALBUMIN (g/dL)'] ??
        reportData.ALBUMIN ??
        reportData.albumin ??
        reportData.albuminLevel ??
        null,
      // URIC ACID: supports multiple formats with fallback logic
      uricAcid:
        reportData['URIC ACID (mg/dL)'] ??
        reportData.URIC_ACID ??
        reportData.uric_acid ??
        reportData.uricAcid ??
        null,
      // eGFR: supports multiple formats with fallback logic
      egfr:
        reportData.eGFR ??
        reportData.EGFR ??
        reportData.egfr ??
        null,
      // ACR: supports multiple formats with fallback logic
      acr:
        reportData.ACR ??
        reportData.acr ??
        null
    },
    mlPrediction: {
      prediction: mlPrediction.prediction !== undefined ? mlPrediction.prediction : null,
      probabilities: mlPrediction.probabilities || [0.5, 0.5],
      status: mlPrediction.status || 'success'
    }
  };
}

/**
 * Main decision engine function
 * Pure function with no side effects
 * 
 * @param {Object} input - Input object containing reportData and mlPrediction
 * @returns {Object} - Decision object with riskTier, decision, humanEscalation, confidence, clinicalIndicators
 */
function analyzeThirdOpCase(input) {
  // Normalize input to handle different field name formats
  const normalized = normalizeInput(input);

  const { reportData, mlPrediction } = normalized;

  // Validate ML prediction status
  if (mlPrediction.status !== 'success') {
    throw new Error('ML prediction status is not success');
  }

  // Step 1: Assess clinical risk from rule-based evaluation
  const clinicalAssessment = assessClinicalRisk(reportData);

  // Step 2: Assess ML signal strength
  const mlAssessment = assessMLSignal(mlPrediction);

  // Step 3: Determine combined risk tier
  let riskTier = determineRiskTier(mlAssessment.mlSignal, clinicalAssessment.clinicalRisk);

  // Step 4: Apply exception rules that override risk tier
  riskTier = applyExceptionRules(reportData, riskTier);

  // Step 5: Map risk tier to decision
  let decision = mapRiskToDecision(riskTier);

  // Step 6: Apply exception rules that override decision
  decision = applyDecisionExceptions(reportData, decision);

  // Step 7: Determine human escalation requirement
  const humanEscalation = determineHumanEscalation(
    riskTier,
    decision,
    reportData,
    mlPrediction,
    clinicalAssessment.criticalCount
  );

  // Step 8: Calculate confidence score
  const confidence = calculateConfidence(mlAssessment, clinicalAssessment, riskTier);

  // Step 9: Non-diagnostic differential considerations (decision support only)
  // Use the same normalized numeric values that the clinical rule engine evaluates against.
  const toNumberOrNull = (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    const s = String(v).trim();
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const mlProbability = Array.isArray(mlPrediction.probabilities)
    ? toNumberOrNull(mlPrediction.probabilities[1])
    : null;
  const igaProbability = mlProbability ?? 0.5;

  const normalizedACR = toNumberOrNull(reportData.acr);
  const normalizedEGFR = toNumberOrNull(reportData.egfr);
  const normalizedAlbumin = toNumberOrNull(reportData.albumin);

  const rankedDifferentials = computeRankedDifferentials({
    igaProbability,
    acr: normalizedACR,
    egfr: normalizedEGFR,
    albumin: normalizedAlbumin,
    riskTier
  });

  // Return structured decision object
  return {
    riskTier,
    decision,
    humanEscalation,
    confidence,
    rankedDifferentials: Array.isArray(rankedDifferentials)
      ? rankedDifferentials
      : [],
    clinicalIndicators: {
      abnormalValues: clinicalAssessment.indicators.abnormalValues,
      criticalFlags: clinicalAssessment.indicators.criticalFlags
    }
  };
}

module.exports = {
  analyzeThirdOpCase
};

