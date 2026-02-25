import React, { useState, useEffect, useContext } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Alert,
  Fade,
  Grow,
  Slide,
  Zoom,
  useTheme,
  useMediaQuery,
  Grid
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AssessmentIcon from '@mui/icons-material/Assessment';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { styled, keyframes } from '@mui/system';
import ReportsModal from '../components/ReportsModal';
import AnyReportAnalysisModal from '../components/AnyReportAnalysisModal';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Custom animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); }
`;

// Styled components
const AnimatedCard = styled(Card)(({ theme }) => ({
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[8],
    animation: `${pulse} 1.5s infinite`
  }
}));

const GradientButton = styled(Button)(({ theme }) => ({
  background: `linear-gradient(45deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  color: 'white',
  fontWeight: 'bold',
  padding: '10px 24px',
  boxShadow: theme.shadows[2],
  '&:hover': {
    boxShadow: theme.shadows[6],
    background: `linear-gradient(45deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`
  }
}));

// Create a component that uses the fadeIn animation
const FadeInBox = styled(Box)(({ theme }) => ({
  animation: `${fadeIn} 0.5s ease-in-out`
}));

const Dashboard = () => {
  const { user, token, isAuthenticated } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [appointments] = useState([]); // Changed from setAppointments to just appointments
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ total: 0, positive: 0, negative: 0, pending: 0 });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isAnyReportModalOpen, setIsAnyReportModalOpen] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) {
        setError('You must be logged in to view this page');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Add the authorization header
        const config = {
          headers: {
            Authorization: `Bearer ${token}`
          }
        };
        
        // Use a try-catch to handle development mode
        let response;
        try {
          response = await axios.get('/api/reports', config);
        } catch (err) {
          // In development, use mock data if the API returns 401 or 404
          if (process.env.NODE_ENV === 'development' && 
              (err.response?.status === 401 || err.response?.status === 404)) {
            console.log('Using mock data in development mode');
            response = { 
              data: {
                recentReports: [],
                reportStats: {
                  total: 0,
                  positive: 0,
                  negative: 0,
                  pending: 0
                }
              }
            };
          } else {
            throw err;
          }
        }
        
        // Process the response data from backend: { reports: [...] }
        console.log('Dashboard reports response:', response.data);
        const { reports: allReports = [] } = response.data;

        // Store all reports; UI will derive latest subset
        setReports(allReports);

        // Basic stats: total count (others left at 0 for now)
        setStats({
          total: allReports.length,
          positive: 0,
          negative: 0,
          pending: 0
        });
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isAuthenticated, token]);
  
  const latestThreeReports = reports.slice(0, 3);

  // Transform raw reports into time-series metrics for the chart
  const sortedReports = [...reports].sort((a, b) => {
    const aDate = new Date(a.reportDate || a.uploadDate || 0);
    const bDate = new Date(b.reportDate || b.uploadDate || 0);
    return aDate - bDate;
  });

  const metrics = sortedReports.map((report) => {
    const dateSource = report.reportDate || report.uploadDate;
    const date = dateSource ? new Date(dateSource).toLocaleDateString() : '';

    let creatinine = null;
    let protein = null;

    // Prefer structured parameters array when available
    if (Array.isArray(report.parameters)) {
      const creatinineParam = report.parameters.find(
        (p) => typeof p.name === 'string' && p.name.toLowerCase() === 'creatinine'
      );
      const proteinParam = report.parameters.find(
        (p) => typeof p.name === 'string' && p.name.toLowerCase().includes('protein')
      );

      if (creatinineParam && creatinineParam.value != null) {
        const v = Number(creatinineParam.value);
        if (Number.isFinite(v)) creatinine = v;
      }

      if (proteinParam && proteinParam.value != null) {
        const v = Number(proteinParam.value);
        if (Number.isFinite(v)) protein = v;
      }
    }

    // Fallback to reportData object (manual entry / legacy shape)
    if (report.reportData) {
      const source = report.reportData;

      if (creatinine == null) {
        const creatinineKeys = [
          'creatinine',
          'CREATININE',
          'CREATININE (mg/dL)',
          'creatinineLevel',
          'creatineLevel'
        ];
        for (const key of creatinineKeys) {
          const raw = source[key];
          if (raw === undefined || raw === null || raw === '') continue;
          const v = typeof raw === 'number' ? raw : Number(raw);
          if (Number.isFinite(v)) {
            creatinine = v;
            break;
          }
        }
      }

      if (protein == null) {
        const proteinKeys = [
          'protein',
          'PROTEIN',
          'proteinLevel',
          'ALBUMIN',
          'ALBUMIN (g/dL)',
          'albumin'
        ];
        for (const key of proteinKeys) {
          const raw = source[key];
          if (raw === undefined || raw === null || raw === '') continue;
          const v = typeof raw === 'number' ? raw : Number(raw);
          if (Number.isFinite(v)) {
            protein = v;
            break;
          }
        }
      }
    }

    return {
      date,
      creatinine,
      protein
    };
  });

  const recentMetrics = metrics.slice(-6);

  // Prepare chart data for Chart.js from transformed metrics
  const chartData = {
    labels: recentMetrics.map((m) => m.date),
    datasets: [
      {
        label: 'Protein Levels',
        data: recentMetrics.map((m) => (m.protein != null ? m.protein : null)),
        borderColor: '#FF6B6B',
        backgroundColor: 'rgba(255, 107, 107, 0.2)',
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: '#FF6B6B',
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Creatinine Levels',
        data: recentMetrics.map((m) => (m.creatinine != null ? m.creatinine : null)),
        borderColor: '#4ECDC4',
        backgroundColor: 'rgba(78, 205, 196, 0.2)',
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: '#4ECDC4',
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const handleOpenReportsModal = () => {
    setIsReportsModalOpen(true);
  };

  const handleCloseReportsModal = () => {
    setIsReportsModalOpen(false);
  };

  const handleDeleteReport = async (reportId) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };
      await axios.delete(`/api/reports/${reportId}`, config);
      const updatedReports = reports.filter(r => r._id !== reportId);
      setReports(updatedReports);
      setStats((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1)
      }));
    } catch (err) {
      console.error('Failed to delete report', err);
    }
  };

  const handleViewAnalysis = async (reportId, e) => {
    if (e) e.preventDefault();
    if (e) e.stopPropagation();
    try {
      const { data } = await axios.get(`/api/reports/${reportId}/view`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data && data.redirectTo) {
        navigate(data.redirectTo);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Report not found.');
      } else {
        console.error('View analysis failed', err);
        setError('Failed to open analysis.');
      }
    }
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            family: theme.typography.fontFamily,
            size: isMobile ? 12 : 14
          },
          padding: 20,
          usePointStyle: true
        }
      },
      title: {
        display: true,
        text: 'Health Metrics Over Time',
        font: {
          family: theme.typography.fontFamily,
          size: isMobile ? 16 : 18,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 12,
        usePointStyle: true,
        boxShadow: theme.shadows[3]
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            family: theme.typography.fontFamily
          }
        }
      },
      y: {
        grid: {
          color: theme.palette.divider
        },
        ticks: {
          font: {
            family: theme.typography.fontFamily
          }
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '80vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}>
        <Fade in={true} timeout={1000}>
          <Box textAlign="center">
            <CircularProgress size={60} thickness={4} sx={{ color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ mt: 3, color: theme.palette.text.secondary }}>
              Loading your health dashboard...
            </Typography>
          </Box>
        </Fade>
      </Box>
    );
  }
  
  return (
    <Container 
      maxWidth={false}
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        py: 4,
        background: 'linear-gradient(to bottom, #f9f9f9 0%, #ffffff 100%)'
      }}
    >
      <Slide direction="down" in={true} timeout={800}>
        <Box>
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom 
            sx={{ 
              fontWeight: 700,
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}
          >
            Welcome, {user?.name}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
            Here's your health overview
          </Typography>
        </Box>
      </Slide>
      
      {error && (
        <Zoom in={true} timeout={500}>
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              borderRadius: 2,
              boxShadow: theme.shadows[1]
            }}
          >
            {error}
          </Alert>
        </Zoom>
      )}
      
      {/* Display stats summary */}
      <FadeInBox sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Total Reports: {stats.total}, Positive: {stats.positive}, Negative: {stats.negative}, Pending: {stats.pending}
        </Typography>
      </FadeInBox>
      
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)'
          },
          gap: 3,
          alignItems: 'stretch'
        }}
      >
        {/* Quick Actions */}
        <Box>
          <Grow in={true} timeout={1000}>
            <Paper 
              sx={{ 
                p: 3, 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100%',
                borderRadius: 3,
                background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                boxShadow: theme.shadows[4]
              }}
            >
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  fontWeight: 600,
                  color: theme.palette.primary.dark,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Box 
                  component="span" 
                  sx={{ 
                    width: 8, 
                    height: 24, 
                    bgcolor: theme.palette.primary.main,
                    borderRadius: 1
                  }} 
                />
                Quick Actions
              </Typography>
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 2, 
                  mt: 2,
                  flexGrow: 1,
                  justifyContent: 'center'
                }}
              >
                <GradientButton
                  startIcon={<UploadFileIcon />}
                  component={RouterLink}
                  to="/upload-report"
                  sx={{ width: '100%' }}
                >
                  New Case Analysis
                </GradientButton>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<LocalHospitalIcon />}
                  component={RouterLink}
                  to="/doctors"
                  sx={{
                    width: '100%',
                    py: 1.5,
                    fontWeight: 'bold',
                    boxShadow: theme.shadows[2]
                  }}
                >
                  Find a Doctor
                </Button>
                <Button
                  variant="contained"
                  color="info"
                  startIcon={<AssessmentIcon />}
                  component={RouterLink}
                  to="/appointments"
                  sx={{
                    width: '100%',
                    py: 1.5,
                    fontWeight: 'bold',
                    boxShadow: theme.shadows[2]
                  }}
                >
                  View Appointments
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<AssessmentIcon />}
                  onClick={() => setIsAnyReportModalOpen(true)}
                  sx={{
                    width: '100%',
                    py: 1.5,
                    fontWeight: 'bold',
                    boxShadow: theme.shadows[1]
                  }}
                >
                   Report Analysis
                </Button>
              </Box>
            </Paper>
          </Grow>
        </Box>
        
        {/* Health Summary */}
        <Box>
          <Grow in={true} timeout={1000} style={{ transitionDelay: '200ms' }}>
            <Paper 
              sx={{ 
                p: 3, 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100%',
                borderRadius: 3,
                background: 'white',
                boxShadow: theme.shadows[4]
              }}
            >
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  fontWeight: 600,
                  color: theme.palette.primary.dark,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Box 
                  component="span" 
                  sx={{ 
                    width: 8, 
                    height: 24, 
                    bgcolor: theme.palette.primary.main,
                    borderRadius: 1
                  }} 
                />
                Health Metrics
              </Typography>
              {reports.length > 0 ? (
                <Box sx={{ height: 'calc(100% - 60px)', mt: 1 }}>
                  <Line options={chartOptions} data={chartData} />
                </Box>
              ) : (
                <Box 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: 'calc(100% - 60px)',
                    textAlign: 'center'
                  }}
                >
                  <Box>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                      No health data available. Upload your first report to see metrics.
                    </Typography>
                    <Button
                      variant="contained"
                      color="primary"
                      component={RouterLink}
                      to="/upload-report"
                      startIcon={<UploadFileIcon />}
                      sx={{
                        fontWeight: 'bold'
                      }}
                    >
                      Upload Your First Report
                    </Button>
                  </Box>
                </Box>
              )}
            </Paper>
          </Grow>
        </Box>
        
        {/* Recent Reports */}
        <Box>
          <Grow in={true} timeout={1000} style={{ transitionDelay: '400ms' }}>
            <Paper 
              sx={{ 
                p: 3, 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 3,
                background: 'white',
                boxShadow: theme.shadows[4],
                height: '100%'
              }}
            >
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  fontWeight: 600,
                  color: theme.palette.primary.dark,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Box 
                  component="span" 
                  sx={{ 
                    width: 8, 
                    height: 24, 
                    bgcolor: theme.palette.primary.main,
                    borderRadius: 1
                  }} 
                />
                Recent Reports
              </Typography>
              {latestThreeReports.length > 0 ? (
                <>
                  <List sx={{ overflow: 'hidden', maxHeight: 280 }}>
                  {latestThreeReports.map((report, index) => (
                    <React.Fragment key={report._id}>
                      <Fade in={true} timeout={800 + (index * 200)}>
                        <ListItem 
                          component="div"
                          onClick={(e) => handleViewAnalysis(report._id, e)}
                          sx={{
                            borderRadius: 2,
                            mb: 1,
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: theme.palette.action.hover,
                              transform: 'translateX(5px)'
                            }
                          }}
                        >
                          <ListItemText 
                            primary={
                              <Typography variant="subtitle1" fontWeight="medium">
                                {`${report.reportType?.charAt(0).toUpperCase() + (report.reportType || '').slice(1)} Report`}
                              </Typography>
                            } 
                            secondary={
                              <Typography variant="body2" color="text.secondary">
                                {new Date(report.uploadDate).toLocaleDateString()}
                              </Typography>
                            }
                            sx={{ pr: 2 }}
                          />
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            {report.predictionResult && (
                              <Chip 
                                label={`Stage ${report.predictionResult.stage}`} 
                                color="primary" 
                                size="small"
                                sx={{
                                  fontWeight: 'bold',
                                  borderRadius: 1
                                }}
                              />
                            )}
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              startIcon={<VisibilityIcon />}
                              onClick={(e) => handleViewAnalysis(report._id, e)}
                              sx={{ ml: 1 }}
                            >
                              View Analysis
                            </Button>
                          </Box>
                        </ListItem>
                      </Fade>
                      {index < latestThreeReports.length - 1 && (
                        <Divider sx={{ my: 1 }} />
                      )}
                    </React.Fragment>
                  ))}
                </List>
                  {reports.length > 3 && (
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleOpenReportsModal}
                      >
                        View More
                      </Button>
                    </Box>
                  )}
                </>
              ) : (
                <Box 
                  sx={{ 
                    py: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexGrow: 1,
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    No reports uploaded yet.
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    component={RouterLink}
                    to="/upload-report"
                    startIcon={<UploadFileIcon />}
                    sx={{
                      fontWeight: 'bold'
                    }}
                  >
                    Upload Your First Report
                  </Button>
                </Box>
              )}
            </Paper>
          </Grow>
        </Box>
        
        {/* Upcoming Appointments */}
        <Box>
          <Grow in={true} timeout={1000} style={{ transitionDelay: '600ms' }}>
            <Paper 
              sx={{ 
                p: 3, 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 3,
                background: 'white',
                boxShadow: theme.shadows[4],
                height: '100%'
              }}
            >
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  fontWeight: 600,
                  color: theme.palette.primary.dark,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Box 
                  component="span" 
                  sx={{ 
                    width: 8, 
                    height: 24, 
                    bgcolor: theme.palette.primary.main,
                    borderRadius: 1
                  }} 
                />
                Upcoming Appointments
              </Typography>
              {appointments.length > 0 ? (
                <List sx={{ overflow: 'auto', maxHeight: 400 }}>
                  {appointments
                    .filter(app => app.status === 'scheduled')
                    .slice(0, 5)
                    .map((appointment, index) => (
                      <React.Fragment key={appointment._id}>
                        <Fade in={true} timeout={800 + (index * 200)}>
                          <ListItem 
                            sx={{
                              borderRadius: 2,
                              mb: 1,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                backgroundColor: theme.palette.action.hover,
                                transform: 'translateX(5px)'
                              }
                            }}
                          >
                            <ListItemText 
                              primary={
                                <Typography variant="subtitle1" fontWeight="medium">
                                  Dr. {appointment.doctor.user.name}
                                </Typography>
                              } 
                              secondary={
                                <Typography variant="body2" color="text.secondary">
                                  {`${new Date(appointment.appointmentDate).toLocaleDateString()} | ${appointment.timeSlot.startTime} - ${appointment.timeSlot.endTime}`}
                                </Typography>
                              }
                              sx={{ pr: 2 }}
                            />
                            <Chip 
                              label={appointment.status} 
                              color={appointment.status === 'scheduled' ? 'info' : 'success'} 
                              size="small"
                              sx={{
                                fontWeight: 'bold',
                                borderRadius: 1
                              }}
                            />
                          </ListItem>
                        </Fade>
                        {index < appointments.length - 1 && (
                          <Divider sx={{ my: 1 }} />
                        )}
                      </React.Fragment>
                    ))}
                </List>
              ) : (
                <Box 
                  sx={{ 
                    py: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexGrow: 1,
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    No upcoming appointments.
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    component={RouterLink}
                    to="/doctors"
                    startIcon={<LocalHospitalIcon />}
                    sx={{
                      fontWeight: 'bold'
                    }}
                  >
                    Book an Appointment
                  </Button>
                </Box>
              )}
            </Paper>
          </Grow>
        </Box>
      </Box>
        
        {/* Health Tips */}
        <Box sx={{ mt: 3 }}>
          <Grow in={true} timeout={1000} style={{ transitionDelay: '800ms' }}>
            <Paper 
              sx={{ 
                p: 3, 
                borderRadius: 3,
                background: 'white',
                boxShadow: theme.shadows[4]
              }}
            >
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  fontWeight: 600,
                  color: theme.palette.primary.dark,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Box 
                  component="span" 
                  sx={{ 
                    width: 8, 
                    height: 24, 
                    bgcolor: theme.palette.primary.main,
                    borderRadius: 1
                  }} 
                />
                IgA Nephropathy Management Tips
              </Typography>
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6} lg={3}>
                  <AnimatedCard>
                    <CardContent sx={{ p: 3 }}>
                      <Typography 
                        variant="h6" 
                        component="div" 
                        sx={{ 
                          mb: 2,
                          color: theme.palette.primary.main,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}
                      >
                        <LocalHospitalIcon color="primary" fontSize="small" />
                        Diet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Reduce salt intake and follow a balanced diet low in protein to reduce kidney strain.
                      </Typography>
                    </CardContent>
                  </AnimatedCard>
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                  <AnimatedCard>
                    <CardContent sx={{ p: 3 }}>
                      <Typography 
                        variant="h6" 
                        component="div" 
                        sx={{ 
                          mb: 2,
                          color: theme.palette.primary.main,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}
                      >
                        <LocalHospitalIcon color="primary" fontSize="small" />
                        Medication
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Take prescribed medications regularly and monitor blood pressure.
                      </Typography>
                    </CardContent>
                  </AnimatedCard>
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                  <AnimatedCard>
                    <CardContent sx={{ p: 3 }}>
                      <Typography 
                        variant="h6" 
                        component="div" 
                        sx={{ 
                          mb: 2,
                          color: theme.palette.primary.main,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}
                      >
                        <LocalHospitalIcon color="primary" fontSize="small" />
                        Lifestyle
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Stay hydrated, exercise regularly, and avoid smoking and excessive alcohol.
                      </Typography>
                    </CardContent>
                  </AnimatedCard>
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                  <AnimatedCard>
                    <CardContent sx={{ p: 3 }}>
                      <Typography 
                        variant="h6" 
                        component="div" 
                        sx={{ 
                          mb: 2,
                          color: theme.palette.primary.main,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}
                      >
                        <LocalHospitalIcon color="primary" fontSize="small" />
                        Monitoring
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Regular check-ups and tests are essential to track disease progression.
                      </Typography>
                    </CardContent>
                  </AnimatedCard>
                </Grid>
              </Grid>
            </Paper>
          </Grow>
        </Box>
      <ReportsModal
        open={isReportsModalOpen}
        onClose={handleCloseReportsModal}
        reports={reports}
        onDelete={handleDeleteReport}
        onViewAnalysis={handleViewAnalysis}
      />
      <AnyReportAnalysisModal
        open={isAnyReportModalOpen}
        onClose={() => setIsAnyReportModalOpen(false)}
        token={token}
      />
    </Container>
  );
};

export default Dashboard;