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
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);

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

  const parsedReportData = safeParseReportData(report?.reportData);

  const handleViewReport = () => {
    if (report?.fileUrl) {
      window.open(report.fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const runMLPrediction = async () => {
    setPredicting(true);
    try {
      // Send report data to the ML model endpoint
      const response = await axios.post('/api/ml/predict', {
        reportId: id,
        reportData: report.data // Assuming your report has a data field with relevant information
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPrediction(response.data);
    } catch (err) {
      setError('Failed to get prediction from ML model');
    } finally {
      setPredicting(false);
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
        
        {/* ML Model Integration */}
        <Box sx={{ my: 2 }}>
          <Typography variant="h5" gutterBottom>AI Analysis</Typography>
          
          {!prediction && (
            <Button 
              variant="contained" 
              color="primary" 
              onClick={runMLPrediction}
              disabled={predicting}
              sx={{ mt: 1 }}
            >
              {predicting ? 'Analyzing...' : 'Analyze Report with AI'}
            </Button>
          )}
          
          {predicting && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <CircularProgress size={24} sx={{ mr: 2 }} />
              <Typography>Processing your report with our AI model...</Typography>
            </Box>
          )}
          
          {prediction && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>Analysis Results</Typography>
              
              <Typography variant="body1" gutterBottom>
                <strong>Prediction:</strong> {prediction.result}
              </Typography>
              
              {prediction.confidence && (
                <Typography variant="body1" gutterBottom>
                  <strong>Confidence:</strong> {(prediction.confidence * 100).toFixed(2)}%
                </Typography>
              )}
              
              {prediction.details && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>Additional Details:</Typography>
                  <Typography variant="body2">{prediction.details}</Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Third Opinion Section */}
        <Box sx={{ my: 3, p: 3, bgcolor: 'primary.light', borderRadius: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
            Third Opinion Decision Support
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: 'white' }}>
            Get advanced decision support analysis combining clinical values and ML predictions
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            startIcon={<PsychologyIcon />}
            onClick={() => navigate(`/thirdop/${id}`)}
            sx={{ 
              mt: 1,
              fontWeight: 'bold',
              fontSize: '1.1rem',
              py: 1.5,
              px: 3
            }}
          >
            Run ThirdOp Analysis
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ReportDetail;