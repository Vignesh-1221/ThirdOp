import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  LinearProgress
} from '@mui/material';

const UploadReport = () => {
  const navigate = useNavigate();

  const [reportData, setReportData] = useState({
    creatineLevel: '',
    ureaLevel: '',
    albuminLevel: '',
    uricAcidLevel: '',
    egfrvalue: '',
    acrvalue: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [predictLoading, setPredictLoading] = useState(false);
  const [touchedFields, setTouchedFields] = useState({});

  const isFormValid =
    reportData.creatineLevel !== '' &&
    reportData.ureaLevel !== '' &&
    reportData.albuminLevel !== '' &&
    !Number.isNaN(parseFloat(reportData.creatineLevel)) &&
    !Number.isNaN(parseFloat(reportData.ureaLevel)) &&
    !Number.isNaN(parseFloat(reportData.albuminLevel));

  const handleReportDataChange = (e) => {
    const { name, value } = e.target;
    if (!touchedFields[name]) {
      setTouchedFields((prev) => ({ ...prev, [name]: true }));
    }
    setReportData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

  const handlePrediction = async () => {
    if (!isFormValid) {
      setError('Please fill in all required fields with valid numeric values before running the analysis.');
      return;
    }

    try {
      setPredictLoading(true);
      setError('');

      const mlData = {
        "CREATININE (mg/dL)": parseFloat(reportData.creatineLevel),
        "UREA (mg/dL)": parseFloat(reportData.ureaLevel),
        "ALBUMIN (g/dL)": parseFloat(reportData.albuminLevel),
        "URIC ACID (mg/dL)": parseFloat(reportData.uricAcidLevel || 0),
        "eGFR": parseFloat(reportData.egfrvalue || 0),
        "ACR": parseFloat(reportData.acrvalue || 0)
      };

      const token = localStorage.getItem('token');

      const response = await axios.post('/api/ml/predict', {
        reportId: 'temp',
        reportData: mlData
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setPrediction(response.data);
    } catch (error) {
      console.error('Error getting prediction:', error);
      setError(error.response?.data?.message || 'Failed to get prediction. Please try again.');
    } finally {
      setPredictLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!prediction) {
      setError('Run the ML analysis before saving this case.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Format reportData with field names as specified
      const formattedReportData = {
        CREATININE: parseFloat(reportData.creatineLevel),
        UREA: parseFloat(reportData.ureaLevel),
        ALBUMIN: parseFloat(reportData.albuminLevel),
        URIC_ACID: parseFloat(reportData.uricAcidLevel || 0),
        eGFR: parseFloat(reportData.egfrvalue || 0),
        ACR: parseFloat(reportData.acrvalue || 0)
      };

      const requestBody = {
        reportType: "Manual Entry",
        source: "manual",
        reportData: formattedReportData,
        predictionResult: prediction
      };

      const token = localStorage.getItem('token');

      const response = await axios.post('/api/reports', requestBody, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      setSuccess('Case saved successfully!');

      setTimeout(() => {
        navigate(`/reports/${response.data.report._id}`);
      }, 1500);
    } catch (error) {
      console.error('Error saving case:', error);
      setError(error.response?.data?.message || 'Failed to save case. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container 
      maxWidth="lg" 
      sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', mt: 4, mb: 4 }}
    >
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          New Case Analysis
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Clinical inputs
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="Creatinine *"
                    name="creatineLevel"
                    type="number"
                    value={reportData.creatineLevel}
                    onChange={handleReportDataChange}
                    error={
                      touchedFields.creatineLevel &&
                      (reportData.creatineLevel === '' ||
                        Number.isNaN(parseFloat(reportData.creatineLevel)))
                    }
                    helperText={
                      touchedFields.creatineLevel &&
                      (reportData.creatineLevel === '' ||
                        Number.isNaN(parseFloat(reportData.creatineLevel)))
                        ? 'Enter a valid numeric value'
                        : 'Normal: 0.7 – 1.3 mg/dL'
                    }
                  />
                  <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                    mg/dL
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="Urea *"
                    name="ureaLevel"
                    type="number"
                    value={reportData.ureaLevel}
                    onChange={handleReportDataChange}
                    error={
                      touchedFields.ureaLevel &&
                      (reportData.ureaLevel === '' ||
                        Number.isNaN(parseFloat(reportData.ureaLevel)))
                    }
                    helperText={
                      touchedFields.ureaLevel &&
                      (reportData.ureaLevel === '' ||
                        Number.isNaN(parseFloat(reportData.ureaLevel)))
                        ? 'Enter a valid numeric value'
                        : 'Normal: 7 – 20 mg/dL'
                    }
                  />
                  <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                    mg/dL
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="Albumin *"
                    name="albuminLevel"
                    type="number"
                    value={reportData.albuminLevel}
                    onChange={handleReportDataChange}
                    error={
                      touchedFields.albuminLevel &&
                      (reportData.albuminLevel === '' ||
                        Number.isNaN(parseFloat(reportData.albuminLevel)))
                    }
                    helperText={
                      touchedFields.albuminLevel &&
                      (reportData.albuminLevel === '' ||
                        Number.isNaN(parseFloat(reportData.albuminLevel)))
                        ? 'Enter a valid numeric value'
                        : 'Normal: 3.5 – 5.0 g/dL'
                    }
                  />
                  <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                    g/dL
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="Uric Acid"
                    name="uricAcidLevel"
                    type="number"
                    value={reportData.uricAcidLevel}
                    onChange={handleReportDataChange}
                    helperText="Normal: 3.5 – 7.2 mg/dL"
                  />
                  <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                    mg/dL
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="eGFR"
                    name="egfrvalue"
                    type="number"
                    value={reportData.egfrvalue}
                    onChange={handleReportDataChange}
                    helperText="Normal: ≥ 60 mL/min/1.73m²"
                  />
                  <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                    mL/min
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="ACR"
                    name="acrvalue"
                    type="number"
                    value={reportData.acrvalue}
                    onChange={handleReportDataChange}
                    helperText="Normal: < 30 mg/g"
                  />
                  <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                    mg/g
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                * Required fields
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handlePrediction}
            disabled={!isFormValid || predictLoading}
          >
            {predictLoading ? 'Analyzing...' : 'Run ML Analysis'}
          </Button>

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !prediction}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Saving...' : 'Save Case'}
          </Button>
        </Box>

        <Box sx={{ mt: 4 }}>
          {predictLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="h6">Analyzing your report data...</Typography>
            </Box>
          ) : prediction ? (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                IgA Nephropathy Prediction Results
              </Typography>

              <Paper 
                elevation={2} 
                sx={{ 
                  p: 3, 
                  mb: 3, 
                  backgroundColor: prediction.prediction === 1 ? '#fff8e1' : '#e8f5e9',
                  maxWidth: '600px',
                  mx: 'auto'
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Prediction: {prediction.prediction === 1 ? 'Positive' : 'Negative'} for IgA Nephropathy
                </Typography>
                
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body1">
                    <strong>Confidence:</strong>
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={prediction.probabilities[prediction.prediction] * 100} 
                        sx={{ 
                          height: 10, 
                          borderRadius: 5,
                          backgroundColor: 'rgba(0,0,0,0.1)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: prediction.prediction === 1 ? '#ff9800' : '#4caf50'
                          }
                        }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 35 }}>
                      <Typography variant="body2" color="text.secondary">
                        {Math.round(prediction.probabilities[prediction.prediction] * 100)}%
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                <Typography variant="body1" sx={{ mt: 2 }}>
                  {prediction.prediction === 1 
                    ? 'The model indicates a high probability of IgA Nephropathy based on the provided lab values. Please consult with a healthcare professional for proper diagnosis and treatment.'
                    : 'The model indicates a low probability of IgA Nephropathy based on the provided lab values. However, please consult with a healthcare professional for proper diagnosis.'}
                </Typography>
              </Paper>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                This prediction is based on machine learning analysis and should not replace professional medical advice.
              </Typography>
            </Box>
          ) : null}
        </Box>
      </Paper>
    </Container>
  );
};

export default UploadReport;