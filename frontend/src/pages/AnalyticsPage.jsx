import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './AnalyticsPage.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const AnalyticsPage = () => {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const config = token
          ? {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          : {};

        const response = await axios.get('/api/analytics', config);
        setAnalytics(response.data || null);
      } catch (err) {
        console.error('Failed to load analytics', err);
        setError('Failed to load analytics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [token]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        }}
      >
        <Box textAlign="center">
          <CircularProgress size={60} thickness={4} sx={{ color: theme.palette.primary.main }} />
          <Typography variant="h6" sx={{ mt: 3, color: theme.palette.text.secondary }}>
            Loading analytics...
          </Typography>
        </Box>
      </Box>
    );
  }

  const summary = analytics?.summary || {
    totalReports: 0,
    firstReportDate: null,
    lastReportDate: null,
    latestValues: {},
  };

  const trends = analytics?.trends || {};

  const makeLineChartConfig = (series, label, color) => {
    const labels = (series || []).map((p) => new Date(p.date).toLocaleDateString());
    const dataValues = (series || []).map((p) => p.value ?? null);

    return {
      data: {
        labels,
        datasets: [
          {
            label,
            data: dataValues,
            borderColor: color,
            backgroundColor: `${color}33`,
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: false,
          },
        },
        scales: {
          x: {
            grid: { display: false },
          },
          y: {
            grid: { color: theme.palette.divider },
          },
        },
      },
    };
  };

  const buildDualTrendSeries = (seriesA = [], seriesB = [], keyA, keyB) => {
    const map = new Map();

    (seriesA || []).forEach((point) => {
      if (!point || !point.date) return;
      const ts = new Date(point.date).getTime();
      const existing = map.get(ts) || { date: new Date(point.date) };
      existing[keyA] = point.value ?? null;
      map.set(ts, existing);
    });

    (seriesB || []).forEach((point) => {
      if (!point || !point.date) return;
      const ts = new Date(point.date).getTime();
      const existing = map.get(ts) || { date: new Date(point.date) };
      existing[keyB] = point.value ?? null;
      map.set(ts, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => a.date - b.date)
      .map((p) => ({
        ...p,
        date: p.date.toLocaleDateString(),
      }));
  };

  const makeDualLineChartConfig = (series, primary, secondary) => {
    const labels = (series || []).map((p) => p.date);

    return {
      data: {
        labels,
        datasets: [
          {
            label: primary.label,
            data: series.map((p) => p[primary.key] ?? null),
            borderColor: primary.color,
            backgroundColor: `${primary.color}33`,
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
            spanGaps: true,
          },
          {
            label: secondary.label,
            data: series.map((p) => p[secondary.key] ?? null),
            borderColor: secondary.color,
            backgroundColor: `${secondary.color}33`,
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
            spanGaps: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: false,
          },
        },
        scales: {
          x: {
            grid: { display: false },
          },
          y: {
            grid: { color: theme.palette.divider },
          },
        },
      },
    };
  };

  const creatinineTrendConfig = makeLineChartConfig(
    trends.creatinine,
    'Creatinine (mg/dL)',
    '#4ECDC4'
  );
  const hemoglobinTrendConfig = makeLineChartConfig(
    trends.hemoglobin,
    'Hemoglobin (g/dL)',
    '#FF6B6B'
  );

  const creatinineEgfrTrendData = buildDualTrendSeries(
    trends.creatinine || [],
    trends.egfr || [],
    'creatinine',
    'egfr'
  );

  const albuminProteinTrendData = buildDualTrendSeries(
    trends.albumin || [],
    trends.proteinuria || [],
    'albumin',
    'proteinuria'
  );

  const creatinineEgfrTrendConfig = makeDualLineChartConfig(
    creatinineEgfrTrendData,
    { key: 'creatinine', label: 'Creatinine', color: '#ef4444' },
    { key: 'egfr', label: 'eGFR', color: '#3b82f6' }
  );

  const albuminProteinTrendConfig = makeDualLineChartConfig(
    albuminProteinTrendData,
    { key: 'albumin', label: 'Albumin', color: '#10b981' },
    { key: 'proteinuria', label: 'Proteinuria', color: '#f59e0b' }
  );

  const latest = summary.latestValues || {};

  return (
    <Container
      maxWidth={false}
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        py: 4,
        background: 'linear-gradient(to bottom, #f9f9f9 0%, #ffffff 100%)',
      }}
    >
      <div className="analytics-container">
        <Box sx={{ mb: 3 }}>
          <Typography
            variant={isMobile ? 'h4' : 'h3'}
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Health Progress Overview
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Longitudinal trends and correlations from your stored reports.
          </Typography>
        </Box>

        {error && (
          <Box sx={{ mb: 3 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        <div className="summary-section">
          <Paper className="analytics-card">
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Patient Summary
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Total Reports: {summary.totalReports || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                First Report:{' '}
                {summary.firstReportDate
                  ? new Date(summary.firstReportDate).toLocaleDateString()
                  : '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Most Recent:{' '}
                {summary.lastReportDate
                  ? new Date(summary.lastReportDate).toLocaleDateString()
                  : '—'}
              </Typography>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Latest Key Values
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Creatinine: {latest.creatinine?.value ?? '—'} {latest.creatinine?.unit || ''}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Hemoglobin: {latest.hemoglobin?.value ?? '—'} {latest.hemoglobin?.unit || ''}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                eGFR: {latest.egfr?.value ?? '—'} {latest.egfr?.unit || ''}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Albumin: {latest.albumin?.value ?? '—'} {latest.albumin?.unit || ''}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Proteinuria (ACR): {latest.proteinuria?.value ?? '—'} {latest.proteinuria?.unit || ''}
              </Typography>
            </Box>
          </Paper>
        </div>

        <div className="analytics-grid">
          <Paper className="analytics-card">
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Creatinine Trend
            </Typography>
            <Box sx={{ height: 250 }}>
              <Line {...creatinineTrendConfig} style={{ width: '100%', height: '100%' }} />
            </Box>
          </Paper>

          <Paper className="analytics-card">
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Hemoglobin Trend
            </Typography>
            <Box sx={{ height: 250 }}>
              <Line {...hemoglobinTrendConfig} style={{ width: '100%', height: '100%' }} />
            </Box>
          </Paper>

          <Paper className="analytics-card">
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Creatinine & eGFR Trend
            </Typography>
            <Box sx={{ height: 280 }}>
              <Line
                {...creatinineEgfrTrendConfig}
                style={{ width: '100%', height: '100%' }}
              />
            </Box>
          </Paper>

          <Paper className="analytics-card">
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Albumin & Proteinuria Trend
            </Typography>
            <Box sx={{ height: 280 }}>
              <Line
                {...albuminProteinTrendConfig}
                style={{ width: '100%', height: '100%' }}
              />
            </Box>
          </Paper>
        </div>
      </div>
    </Container>
  );
};

export default AnalyticsPage;

