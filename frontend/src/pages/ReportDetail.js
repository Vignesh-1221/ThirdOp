import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Paper, Box, Button, CircularProgress, Divider } from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const safeParseReportData = (data) => {
    if (!data) return {};
    if (typeof data === 'object') return data;
    try {
      const parsed = JSON.parse(data);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (e) {
      console.error('Failed to parse reportData', e);
      return {};
    }
  };

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await axios.get(`/api/reports/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // API returns { report: {...} }
        setReport(response.data.report || response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load report details');
        setLoading(false);
      }
    };

    fetchReport();
  }, [id, token]);

  const rawData = report?.normalizedReportData ?? report?.reportData;
  const parsedReportData = safeParseReportData(rawData);

  const handleViewReport = () => {
    if (report?.fileUrl) {
      window.open(report.fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleViewAnalysis = async () => {
    try {
      const { data } = await axios.get(`/api/reports/${id}/view`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data?.redirectTo) navigate(data.redirectTo);
    } catch (err) {
      setError(err.response?.status === 404 ? 'Report not found.' : 'Failed to open analysis.');
    }
  };

  if (loading) {
    return (
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography color="error" variant="h6">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Report Details
        </Typography>
        
        <Box sx={{ my: 2 }}>
          <Typography variant="h6">Report ID: {report._id}</Typography>
          <Typography variant="body1">Date: {new Date(report.uploadDate || report.createdAt).toLocaleDateString()}</Typography>
          <Typography variant="body1">Type: {report.reportType || report.type}</Typography>
          
          {/* Display report details */}
          {parsedReportData && Object.keys(parsedReportData).length > 0 && (
            <Box sx={{ my: 2 }}>
              <Typography variant="h6">Report Data</Typography>
              <Box component="pre" sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, overflow: 'auto' }}>
                {JSON.stringify(parsedReportData, null, 2)}
              </Box>
            </Box>
          )}
          
          {report.fileUrl && (
            <Box sx={{ my: 2 }}>
              <Typography variant="h6">Report File</Typography>
              <Button 
                variant="contained" 
                onClick={handleViewReport}
              >
                View Report
              </Button>
            </Box>
          )}
        </Box>
        
        <Divider sx={{ my: 3 }} />

        {/* View Analysis: routes to ThirdOp (kidney) or Any Report (generic) by analysisType */}
        <Box sx={{ my: 3, p: 3, bgcolor: 'primary.light', borderRadius: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
            View Analysis
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: 'white' }}>
            Open the cached analysis for this report (Kidney or Any Report based on type).
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            startIcon={<PsychologyIcon />}
            onClick={handleViewAnalysis}
            sx={{ 
              mt: 1,
              fontWeight: 'bold',
              fontSize: '1.1rem',
              py: 1.5,
              px: 3
            }}
          >
            View Analysis
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ReportDetail;