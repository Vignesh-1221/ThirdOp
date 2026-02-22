import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert
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
        setReport(response.data.report);
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

      const response = await axios.post(
        'http://localhost:5009/api/thirdop/analyze',
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
      setAnalysis({
        ...data,
        rankedDifferentials: Array.isArray(data.rankedDifferentials) ? data.rankedDifferentials : []
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to run ThirdOp analysis. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (report && !analysis && !analyzing && !error) {
      runThirdOpAnalysis();
    }
  }, [report, analysis, analyzing, error]);

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

  const normalizedReportData = getNormalizedReportData();
  const hasCriticalFlags =
    analysis?.clinicalIndicators?.criticalFlags?.length > 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ bgcolor: '#fafafa', borderRadius: '12px', p: { xs: 2, sm: 3 }, minHeight: 400 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
          Decision Support Result
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Report ID: {id}
        </Typography>

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

        {analysis && !analyzing && (
          <Box>
            {/* SECTION 1 — Risk Snapshot */}
            <RiskBanner
              riskTier={analysis.riskTier}
              decision={analysis.decision}
              humanEscalation={analysis.humanEscalation}
            />

            {/* SECTION 2 — Key Clinical Metrics */}
            <Typography variant="subtitle1" sx={{ ...SECTION_TITLE_SX, mt: 4 }}>
              Key Clinical Metrics
            </Typography>
            <MetricsGrid reportData={normalizedReportData} />

            {/* SECTION 3 — Triggered Thresholds (subtle alert, only if present) */}
            {hasCriticalFlags && (
              <>
                <Typography variant="subtitle1" sx={{ ...SECTION_TITLE_SX }}>
                  Triggered Thresholds
                </Typography>
                <AlertPanel criticalFlags={analysis.clinicalIndicators?.criticalFlags} />
              </>
            )}

            {/* SECTION 4 — Ranked Possible Diseases (Decision Support) */}
            <Typography variant="subtitle1" sx={{ ...SECTION_TITLE_SX }}>
              Ranked Possible Diseases (Decision Support)
            </Typography>
            <RankedDiseasesSection
              rankedDifferentials={analysis.rankedDifferentials}
              clinicalIndicators={analysis.clinicalIndicators}
              status={analysis.status}
              message={analysis.message}
            />

            {/* SECTION 5 — Clinical Concerns Identified */}
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

            {/* SECTION 6 — Recommended Next Steps */}
            <Typography variant="subtitle1" sx={{ ...SECTION_TITLE_SX }}>
              Recommended Next Steps
            </Typography>
            <ActionSection
              decision={analysis.decision}
              humanEscalation={analysis.humanEscalation}
            />

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
