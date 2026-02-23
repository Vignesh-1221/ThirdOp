import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Collapse,
  IconButton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const SECTION_TITLE_SX = {
  fontSize: '1rem',
  fontWeight: 600,
  letterSpacing: '0.02em',
  color: 'text.primary',
  mb: 1.5,
  mt: 5
};

export default function AnyReportAnalysisResult() {
  const { reportId } = useParams();
  const { token } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedConcern, setExpandedConcern] = useState(null);

  useEffect(() => {
    if (!reportId || !token) return;
    const fetchReport = async () => {
      try {
        const res = await axios.get(`/api/reports/${reportId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReport(res.data.report);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [reportId, token]);

  if (loading) {
    return (
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>Loading result…</Typography>
      </Container>
    );
  }

  if (error || !report) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Report not found'}</Alert>
      </Container>
    );
  }

  const result = report.genericAnalysisResult || {};
  const status = result.status;
  const concerns = Array.isArray(result.rankedConcerns) ? result.rankedConcerns : [];
  const recommendedDepartment = result.recommendedDepartment || '';
  const precautions = Array.isArray(result.precautions) ? result.precautions : [];

  if (status === 'invalid_report') {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>Any Report Analysis Result</Typography>
        <Alert severity="warning">
          No recognizable medical laboratory parameters were detected. Please upload a valid medical lab report.
        </Alert>
      </Container>
    );
  }

  if (status === 'normal') {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>Any Report Analysis Result</Typography>
        <Alert severity="success">
          {result.message || 'No clinically significant abnormalities detected.'}
        </Alert>
      </Container>
    );
  }

  const hasConcerns = status === 'partial_data' || status === 'abnormal';

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ bgcolor: '#fafafa', borderRadius: '12px', p: { xs: 2, sm: 3 }, minHeight: 400 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
          Any Report Analysis Result
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Report ID: {reportId}
        </Typography>

        {result.message && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {result.message}
          </Alert>
        )}

        {hasConcerns && concerns.length > 0 && (
          <>
            <Typography variant="subtitle1" sx={{ ...SECTION_TITLE_SX, mt: 2 }}>
              Concerns
            </Typography>
            <Box>
              {concerns.map((concern, index) => (
                <Box
                  key={index}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '10px',
                    mb: 1.5,
                    overflow: 'hidden',
                    bgcolor: '#fff'
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      cursor: 'pointer'
                    }}
                    onClick={() => setExpandedConcern((prev) => (prev === index ? null : index))}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {concern.title || 'Finding'}
                    </Typography>
                    <IconButton size="small" aria-label={expandedConcern === index ? 'Collapse' : 'Expand'}>
                      {expandedConcern === index ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  </Box>
                  <Collapse in={expandedConcern === index}>
                    <Box sx={{ px: 2, pb: 2, pt: 0 }}>
                      {(concern.reasoning || concern.reason) && (
                        <Box sx={{ mb: 1.5 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                            {concern.reasoning || concern.reason}
                          </Typography>
                        </Box>
                      )}
                      {Array.isArray(concern.doctorQuestions) && concern.doctorQuestions.length > 0 && (
                        <>
                          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}>
                            Questions to Ask Doctor
                          </Typography>
                          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                            {concern.doctorQuestions.map((q, i) => (
                              <Typography key={i} component="li" variant="body2" sx={{ mb: 0.25, lineHeight: 1.4 }}>
                                {q}
                              </Typography>
                            ))}
                          </Box>
                        </>
                      )}
                    </Box>
                  </Collapse>
                </Box>
              ))}
            </Box>
          </>
        )}

        {recommendedDepartment && (
          <>
            <Typography variant="subtitle1" sx={SECTION_TITLE_SX}>
              Recommended Department
            </Typography>
            <Box
              sx={{
                p: 2,
                borderRadius: '10px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: '#fff'
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                You may consider consulting:
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {recommendedDepartment}
              </Typography>
            </Box>
          </>
        )}

        {precautions.length > 0 && (
          <>
            <Typography variant="subtitle1" sx={SECTION_TITLE_SX}>
              Precautions
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {precautions.map((p, i) => (
                <Typography key={i} component="li" variant="body2" sx={{ mb: 0.5, lineHeight: 1.5 }}>
                  {p}
                </Typography>
              ))}
            </Box>
          </>
        )}

        {hasConcerns && concerns.length === 0 && !recommendedDepartment && precautions.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No concerns to display.
          </Typography>
        )}
      </Box>
    </Container>
  );
}
