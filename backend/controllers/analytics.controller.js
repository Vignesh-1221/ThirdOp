const Report = require('../models/report.model');
const { prepareReportData } = require('../services/thirdopController');
const { SANITY_BOUNDS } = require('../lib/sanityValidation');

function buildLatestValue(validated, key) {
  if (validated[key] == null) return null;
  const bounds = SANITY_BOUNDS[key];
  return {
    value: validated[key],
    unit: bounds?.unit || '',
  };
}

function pearsonCorrelation(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) {
    return { r: null, n };
  }

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += xs[i];
    sumY += ys[i];
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX) * Math.sqrt(denomY);
  if (!Number.isFinite(denom) || denom === 0) {
    return { r: null, n };
  }

  return { r: num / denom, n };
}

async function getAnalyticsForUser(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const reports = await Report.find({ user: userId }).sort({ uploadDate: 1 });

    const creatinineTrend = [];
    const hemoglobinTrend = [];
    const egfrTrend = [];
    const albuminTrend = [];
    const proteinuriaTrend = [];

    const creatinineEgfrPairs = [];
    const albuminProteinuriaPairs = [];

    let latestValidated = null;

    for (const report of reports) {
      const date = report.uploadDate || report.createdAt || report._id.getTimestamp?.() || null;
      const { validated } = prepareReportData(report.reportData || {});

      latestValidated = validated;

      if (validated.creatinine != null && date) {
        creatinineTrend.push({
          date,
          value: validated.creatinine,
        });
      }

      if (validated.hemoglobin != null && date) {
        hemoglobinTrend.push({
          date,
          value: validated.hemoglobin,
        });
      }

      if (validated.egfr != null && date) {
        egfrTrend.push({
          date,
          value: validated.egfr,
        });
      }

      if (validated.albumin != null && date) {
        albuminTrend.push({
          date,
          value: validated.albumin,
        });
      }

      const acr = validated.acr;
      if (acr != null && date) {
        proteinuriaTrend.push({
          date,
          value: acr,
        });
      }

      if (validated.creatinine != null && validated.egfr != null && date) {
        creatinineEgfrPairs.push({
          x: validated.creatinine,
          y: validated.egfr,
          date,
        });
      }

      if (validated.albumin != null && acr != null && date) {
        albuminProteinuriaPairs.push({
          x: validated.albumin,
          y: acr,
          date,
        });
      }
    }

    const creatXs = creatinineEgfrPairs.map((p) => p.x);
    const creatYs = creatinineEgfrPairs.map((p) => p.y);
    const albuminXs = albuminProteinuriaPairs.map((p) => p.x);
    const albuminYs = albuminProteinuriaPairs.map((p) => p.y);

    const creatinineEgfrCorr = pearsonCorrelation(creatXs, creatYs);
    const albuminProteinuriaCorr = pearsonCorrelation(albuminXs, albuminYs);

    const latestValues = latestValidated
      ? {
          creatinine: buildLatestValue(latestValidated, 'creatinine'),
          hemoglobin: buildLatestValue(latestValidated, 'hemoglobin'),
          egfr: buildLatestValue(latestValidated, 'egfr'),
          albumin: buildLatestValue(latestValidated, 'albumin'),
          proteinuria: buildLatestValue(latestValidated, 'acr'),
        }
      : {};

    const summary = {
      totalReports: reports.length,
      firstReportDate: reports[0]?.uploadDate || null,
      lastReportDate: reports[reports.length - 1]?.uploadDate || null,
      latestValues,
    };

    return res.status(200).json({
      summary,
      trends: {
        creatinine: creatinineTrend,
        hemoglobin: hemoglobinTrend,
        egfr: egfrTrend,
        albumin: albuminTrend,
        proteinuria: proteinuriaTrend,
      },
      scatter: {
        creatinineEgfr: creatinineEgfrPairs,
        albuminProteinuria: albuminProteinuriaPairs,
      },
      correlations: {
        creatinineEgfr: creatinineEgfrCorr,
        albuminProteinuria: albuminProteinuriaCorr,
      },
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return res.status(500).json({ message: 'Failed to compute analytics' });
  }
}

module.exports = {
  getAnalyticsForUser,
};

