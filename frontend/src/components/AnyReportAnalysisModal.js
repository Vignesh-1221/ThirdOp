import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  Checkbox,
  IconButton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const GENDER_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' }
];

export default function AnyReportAnalysisModal({ open, onClose, token }) {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [expandedConcern, setExpandedConcern] = useState(null);
  const [checkedQuestions, setCheckedQuestions] = useState({});

  const resetState = () => {
    setFile(null);
    setGender('');
    setError(null);
    setResult(null);
    setExpandedConcern(null);
    setCheckedQuestions({});
  };

  const handleClose = () => {
    if (!loading) {
      resetState();
      onClose();
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setError(null);
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (gender) formData.append('gender', gender);

      const response = await axios.post('/api/thirdop/analyze-generic', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const data = response.data || {};

      if (data.status === 'invalid_report') {
        setResult({ status: 'invalid_report' });
        setLoading(false);
        return;
      }

      if (data.status === 'normal') {
        setResult({
          status: 'normal',
          message: data.message || 'No clinically significant abnormalities detected.'
        });
        if (data.reportId) {
          onClose();
          navigate(`/any-report-analysis/${data.reportId}`);
        }
        setLoading(false);
        return;
      }

      if (data.reportId) {
        onClose();
        navigate(`/any-report-analysis/${data.reportId}`);
      } else {
        setResult({
          status: data.status,
          partialData: data.partialData,
          concerns: Array.isArray(data.concerns) ? data.concerns : [],
          reportId: data.reportId
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleConcern = (index) => {
    setExpandedConcern((prev) => (prev === index ? null : index));
  };

  const handleQuestionCheck = (concernIndex, questionIndex) => (e) => {
    setCheckedQuestions((prev) => {
      const key = `${concernIndex}-${questionIndex}`;
      return { ...prev, [key]: e.target.checked };
    });
  };

  const concerns = (result?.concerns || []).filter((c) => c && (c.title || c.reasoning));

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Any Report Analysis</DialogTitle>
      <DialogContent dividers>
        {!result && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Upload a medical lab report (PDF) for general parameter analysis. No disease prediction or risk tier.
            </Typography>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
              fullWidth
              sx={{ py: 1.5 }}
            >
              {file ? file.name : 'Choose PDF file'}
              <input type="file" accept=".pdf,application/pdf" hidden onChange={handleFileChange} />
            </Button>
            <FormControl size="small" fullWidth>
              <InputLabel>Gender (optional)</InputLabel>
              <Select
                value={gender}
                label="Gender (optional)"
                onChange={(e) => setGender(e.target.value)}
              >
                {GENDER_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value || 'none'} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Analyzing report…
            </Typography>
          </Box>
        )}

        {result && !loading && (
          <Box sx={{ pt: 1 }}>
            {result.status === 'invalid_report' && (
              <Alert severity="warning">
                No recognizable medical laboratory parameters were detected. Please upload a valid medical lab report.
              </Alert>
            )}

            {result.status === 'normal' && (
              <Alert severity="success">{result.message}</Alert>
            )}

            {(result.status === 'partial_data' || result.status === 'abnormal') && (
              <>
                {result.partialData && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Analysis is based only on the parameters detected in the uploaded report.
                  </Alert>
                )}
                {concerns.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No concerns to display.
                  </Typography>
                )}
                {concerns.map((concern, index) => (
                  <Box
                    key={index}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1.5,
                      overflow: 'hidden',
                      bgcolor: 'background.paper'
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 1.5,
                        py: 1,
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleConcern(index)}
                    >
                      <Typography variant="subtitle2" fontWeight={600}>
                        {concern.title || 'Finding'}
                      </Typography>
                      <IconButton size="small" aria-label={expandedConcern === index ? 'Collapse' : 'Expand'}>
                        {expandedConcern === index ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                    <Collapse in={expandedConcern === index}>
                      <Box sx={{ px: 2, pb: 2, pt: 0 }}>
                        {concern.reasoning && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                            {concern.reasoning}
                          </Typography>
                        )}
                        {concern.recommendedDepartment && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Suggested department: {concern.recommendedDepartment}
                          </Typography>
                        )}
                        {Array.isArray(concern.doctorQuestions) && concern.doctorQuestions.length > 0 && (
                          <>
                            <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.75 }}>
                              Questions to discuss with your doctor
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              {concern.doctorQuestions.slice(0, 3).map((q, qIdx) => (
                                <Box
                                  key={qIdx}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 1,
                                    py: 0.5,
                                    px: 1,
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider'
                                  }}
                                >
                                  <Checkbox
                                    size="small"
                                    checked={!!checkedQuestions[`${index}-${qIdx}`]}
                                    onChange={handleQuestionCheck(index, qIdx)}
                                    onClick={(e) => e.stopPropagation()}
                                    sx={{ p: 0.25, mt: 0.25 }}
                                  />
                                  <Typography variant="body2" sx={{ flex: 1 }}>
                                    {q}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </>
                        )}
                      </Box>
                    </Collapse>
                  </Box>
                ))}
              </>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {result ? (
          <Button onClick={() => { resetState(); }} color="primary">
            New analysis
          </Button>
        ) : null}
        <Button onClick={handleClose}>{result ? 'Close' : 'Cancel'}</Button>
        {!result && !loading && (
          <Button variant="contained" onClick={handleSubmit} disabled={!file}>
            Submit
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
