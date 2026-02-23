import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  RiskBanner,
  MetricsGrid,
  AlertPanel,
  ActionSection,
  RankedDiseasesSection,
  ClinicalConcernsSection
} from '../components/thirdop';

const SECTION_TITLE_SX = {
  fontSize: '1rem',
  fontWeight: 600,
  letterSpacing: '0.02em',
  color: 'text.primary',
  mb: 1.5,
  mt: 5
};

const ThirdOp = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const [report, setReport] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [checkedConcerns, setCheckedConcerns] = useState({});
  const [usedCachedAnalysis, setUsedCachedAnalysis] = useState(false);
  const hasTriggeredAnalysis = useRef(false);

  const safeParseReportData = (data) => {
    if (!data) return {};
    if (typeof data === 'object') return data;
    try {
      const parsed = JSON.parse(data);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (e) {
      console.error('Failed to parse reportData for ThirdOp', e);
      return {};
    }
  };

  const toNumber = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return Number.isNaN(num) ? null : num;
  };

  const getNormalizedReportData = () => {
    if (!report) return {};
    if (report.normalizedReportData && typeof report.normalizedReportData === 'object') {
      return report.normalizedReportData;
    }
    const parsed = safeParseReportData(report.reportData);
    return {
      'CREATININE (mg/dL)': toNumber(
        parsed['CREATININE (mg/dL)'] ?? parsed.CREATININE ?? parsed.creatinineLevel ?? parsed.creatinine
      ),
      'UREA (mg/dL)': toNumber(parsed['UREA (mg/dL)'] ?? parsed.UREA ?? parsed.urea),
      'ALBUMIN (g/dL)': toNumber(parsed['ALBUMIN (g/dL)'] ?? parsed.ALBUMIN ?? parsed.albumin),
      'URIC ACID (mg/dL)': toNumber(
        parsed['URIC ACID (mg/dL)'] ?? parsed.URIC_ACID ?? parsed.uric_acid ?? parsed.uricAcid
      ),
      eGFR: toNumber(parsed.eGFR ?? parsed.EGFR ?? parsed.egfrvalue ?? parsed.egfr),
      ACR: toNumber(parsed.ACR ?? parsed.acr ?? parsed.acrvalue)
    };
  };

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await axios.get(`/api/reports/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const reportData = response.data.report;
        setReport(reportData);
        // Use cached ThirdOp analysis when available so re-opening the page does not re-run analysis
        const cached = reportData?.thirdopAnalysis;
        if (cached && typeof cached === 'object' && (cached.riskTier != null || cached.status === 'no_kidney_analysis')) {
          setAnalysis({
            ...cached,
            rankedDifferentials: Array.isArray(cached.rankedDifferentials) ? cached.rankedDifferentials : []
          });
          setUsedCachedAnalysis(true);
        }
        setLoading(false);
      } catch (err) {
        setError('Failed to load report details');
        setLoading(false);
      }
    };

    if (id) {
      fetchReport();
    } else {
      setError('Report ID is required');
      setLoading(false);
    }
  }, [id, token]);

  const runThirdOpAnalysis = async () => {
    if (!report || analyzing) return;

    setAnalyzing(true);
    setError(null);

    try {
      const reportData = getNormalizedReportData();
      if (Object.keys(reportData).length === 0) {
        setError('No lab values available. Add report data or use a report with extracted values.');
        setAnalyzing(false);
        return;
      }

      let mlPrediction = report.predictionResult;
      if (!mlPrediction || mlPrediction.status !== 'success') {
        try {
          const mlResponse = await axios.post(
            '/api/ml/predict',
            { reportId: id, reportData },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          mlPrediction = mlResponse.data;
        } catch (mlErr) {
          setError('ML prediction is required for ThirdOp analysis. Please run ML prediction first.');
          setAnalyzing(false);
          return;
        }
      }

      const baseUrl = process.env.REACT_APP_API_URL || '';
      const response = await axios.post(
        `${baseUrl}/api/thirdop/analyze`,
        {
          reportId: id,
          reportData,
          mlPrediction,
          reportMetadata: {
            reportType: report.reportType,
            uploadDate: report.uploadDate
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = response.data || {};
      console.log(response.data);
      setAnalysis({
        ...data,
        rankedDifferentials: Array.isArray(data.rankedDifferentials) ? data.rankedDifferentials : []
      });
      setUsedCachedAnalysis(false);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to run ThirdOp analysis. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Run analysis once when report is loaded and no valid cached analysis
  useEffect(() => {
    if (!report || analyzing || error || hasTriggeredAnalysis.current) return;
    const hasCached = report.thirdopAnalysis && typeof report.thirdopAnalysis === 'object' &&
      (report.thirdopAnalysis.riskTier != null || report.thirdopAnalysis.status === 'no_kidney_analysis');
    if (hasCached) return; // cache was applied in fetchReport
    if (analysis) return; // already have result
    hasTriggeredAnalysis.current = true;
    runThirdOpAnalysis();
  }, [report, analyzing, error, analysis]);

  if (loading) {
    return (
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading report...
        </Typography>
      </Container>
    );
  }

  if (error && !report) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const normalizedReportData = analysis?.normalizedReportData || getNormalizedReportData();
  const hasCriticalFlags =
    analysis?.clinicalIndicators?.criticalFlags?.length > 0;
  const hasKidneyAnalysis = analysis?.riskTier != null && analysis?.status !== 'no_kidney_analysis';

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ bgcolor: '#fafafa', borderRadius: '12px', p: { xs: 2, sm: 3 }, minHeight: 400 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
          Decision Support Result
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Report ID: {id}
          {usedCachedAnalysis && (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              (showing cached analysis)
            </Typography>
          )}
        </Typography>

        {analysis && !analyzing && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setAnalysis(null);
              setError(null);
              hasTriggeredAnalysis.current = false;
              runThirdOpAnalysis();
            }}
            sx={{ mb: 2 }}
          >
            Re-run analysis
          </Button>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {analyzing && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="subtitle1">Running decision support…</Typography>
          </Box>
        )}

        {analysis && !analyzing && !hasKidneyAnalysis && (analysis?.message || analysis?.status === 'no_kidney_analysis') && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {analysis.message || 'Kidney decision support was not run for this report (missing kidney markers or ML prediction).'}
          </Alert>
        )}

        {analysis && !analyzing && (
          <Box>
            {/* SECTION 1 — Risk Snapshot (only when kidney analysis ran) */}
            {hasKidneyAnalysis && (
            <RiskBanner
              riskTier={analysis.riskTier}
              decision={analysis.decision}
              humanEscalation={analysis.humanEscalation}
            />
            )}

            {/* SECTION 2 — Key Clinical Metrics */}
            <Typography variant="subtitle1" sx={{ ...SECTION_TITLE_SX, mt: 4 }}>
              Key Clinical Metrics
            </Typography>
            <MetricsGrid reportData={normalizedReportData} />

            {/* SECTION 3 — Triggered Thresholds (only when kidney analysis) */}
            {hasKidneyAnalysis && hasCriticalFlags && (
              <>
                <Typography variant="subtitle1" sx={{ ...SECTION_TITLE_SX }}>
                  Triggered Thresholds
                </Typography>
                <AlertPanel criticalFlags={analysis.clinicalIndicators?.criticalFlags} />
              </>
            )}

            {/* SECTION 4 — Ranked Possible Diseases (only when kidney analysis) */}
            {hasKidneyAnalysis && (
              <>
                <Typography variant="subtitle1" sx={{ ...SECTION_TITLE_SX }}>
                  Ranked Possible Diseases (Decision Support)
                </Typography>
                <RankedDiseasesSection
                  rankedDifferentials={analysis.rankedDifferentials}
                  clinicalIndicators={analysis.clinicalIndicators}
                  status={analysis.status}
                  message={analysis.message}
                />
              </>
            )}

            {/* SECTION 5 — Clinical Concerns (only when kidney analysis) */}
            {hasKidneyAnalysis && (
              <>
                <Typography variant="subtitle1" sx={{ ...SECTION_TITLE_SX }}>
                  Clinical Concerns Identified
                </Typography>
                <ClinicalConcernsSection
                  rankedConcerns={analysis.llmInsights?.rankedConcerns}
                  riskTier={analysis.riskTier}
                  hasCriticalFlags={hasCriticalFlags}
                  checkedConcerns={checkedConcerns}
                  onCheckedChange={setCheckedConcerns}
                />
              </>
            )}

            {/* SECTION 6 — Recommended Next Steps (only when kidney analysis) */}
            {hasKidneyAnalysis && (
              <>
                <Typography variant="subtitle1" sx={{ ...SECTION_TITLE_SX }}>
                  Recommended Next Steps
                </Typography>
                <ActionSection
                  decision={analysis.decision}
                  humanEscalation={analysis.humanEscalation}
                />
              </>
            )}

            {/* SECTION 7 — Other module findings (hematology, diabetes, lipid, etc.) */}
            {Array.isArray(analysis.moduleResults) && analysis.moduleResults.length > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ ...SECTION_TITLE_SX }}>
                  Other findings
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {analysis.moduleResults.map((mod, idx) => (
                    <Box
                      key={mod.module || idx}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: 'grey.50',
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={600} sx={{ textTransform: 'capitalize', mb: 0.5 }}>
                        {mod.module || 'Other'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {mod.summary || 'No summary.'}
                      </Typography>
                      {Array.isArray(mod.findings) && mod.findings.length > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          {mod.findings.map((f) => f.message).join('; ')}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 5 }}>
              Analysis completed: {new Date(analysis.timestamp).toLocaleString()}
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default ThirdOp;
