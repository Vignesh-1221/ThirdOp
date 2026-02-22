import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  CardMedia,
  Stack,
  useMediaQuery,
  useTheme
} from '@mui/material';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

const Home = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box>
      {/* Hero Section - Split Screen Layout */}
      <Box
        sx={{
          position: 'relative', // Required for the overlay
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white', // Adjust text color for better contrast
          py: isMobile ? 4 : 0,
          overflow: 'hidden', // Ensure the overlay stays within bounds
          backgroundColor: 'rgba(173, 216, 230, 0.3)', // Subtle light blue color with reduced opacity
          animation: 'fadeIn 2s ease-in-out', // Add fade-in animation
          '@keyframes fadeIn': {
            '0%': {
              opacity: 0,
            },
            '100%': {
              opacity: 1,
            },
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(173, 216, 230, 0.3)', // Add a semi-transparent blue overlay
            zIndex: -1, // Place the overlay behind the content
          },
        }}
      >
        <Container maxWidth="lg" sx={{ py: isMobile ? 4 : 8 }}>
          <Grid container spacing={4} alignItems="center">
            {/* Left Side - Content */}
            <Grid item xs={12} md={6}>
              <Typography
                variant={isMobile ? 'h3' : 'h2'}
                component="h1"
                gutterBottom
                sx={{
                  fontWeight: 700,
                  color: '#2c2c2c', // Adjust text color for better readability
                  mb: 3,
                }}
              >
                IgA Nephropathy Prediction Platform
              </Typography>
              <Typography
                variant={isMobile ? 'h6' : 'h5'}
                paragraph
                sx={{
                  color: 'rgba(44, 44, 44, 0.8)', // Slightly transparent dark text for better readability
                  mb: 4,
                  lineHeight: 1.6,
                }}
              >
                Early detection and proper management of IgA Nephropathy can significantly improve outcomes.
              </Typography>
              <Stack direction={isMobile ? 'column' : 'row'} spacing={2} sx={{ mt: 4 }}>
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  component={RouterLink}
                  to="/appointments"
                  startIcon={<UploadFileIcon />}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    transition: 'transform 0.3s ease, background-color 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.05)', // Slight zoom effect on hover
                      backgroundColor: '#1a1a1a',
                    },
                  }}
                >
                  My appointments
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  size="large"
                  component={RouterLink}
                  to="/doctors"
                  startIcon={<LocalHospitalIcon />}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    borderColor: '#2c2c2c',
                    color: '#2c2c2c',
                    transition: 'transform 0.3s ease, background-color 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.05)', // Slight zoom effect on hover
                      backgroundColor: 'rgba(44, 44, 44, 0.1)',
                    },
                  }}
                >
                  Find Doctors
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* About IgA Nephropathy */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography 
          variant="h3" 
          component="h2" 
          gutterBottom 
          align="center"
          sx={{ 
            fontWeight: 700,
            color: '#2c2c2c',
            mb: 4
          }}
        >
          About IgA Nephropathy
        </Typography>
        
        <Typography 
          variant="body1" 
          paragraph 
          align="center" 
          sx={{ 
            mb: 8,
            maxWidth: '800px',
            mx: 'auto',
            fontSize: '1.1rem',
            lineHeight: 1.6
          }}
        >
          IgA nephropathy is a kidney disease that occurs when IgA deposits build up in the kidneys, causing inflammation and damage to kidney tissues.
        </Typography>
        
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
          gap: 4,
          alignItems: 'stretch'
        }}>
          {/* Symptoms Card */}
          <Card
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 3,
              boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              '&:hover': { 
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 24px rgba(0,0,0,0.15)'
              },
              borderTop: '4px solid',
              borderColor: 'secondary.main'
            }}
          >
            <CardMedia
              component="div"
              sx={{
                pt: '40%',
                bgcolor: 'rgba(25, 118, 210, 0.08)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative'
              }}
            >
              <Box
                component="img"
                src="/images/symptoms1.jpeg"
                alt="Symptoms Icon"
                sx={{ 
                  width: '30%',
                  height: 'auto',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                }}
              />
            </CardMedia>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography 
                variant="h5" 
                component="h3" 
                gutterBottom
                sx={{ 
                  fontWeight: 600,
                  color: 'text.primary',
                  textAlign: 'center',
                  mb: 3
                }}
              >
                Symptoms
              </Typography>
              <Box component="ul" sx={{ 
                pl: 2,
                '& li': {
                  mb: 1,
                  fontSize: '0.95rem',
                  lineHeight: 1.6
                }
              }}>
                <li>Blood in urine (hematuria)</li>
                <li>Protein in urine (proteinuria)</li>
                <li>High blood pressure</li>
                <li>Swelling in hands and feet</li>
                <li>Frequent urination</li>
              </Box>
            </CardContent>
          </Card>

          {/* Diagnosis Card */}
          <Card
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 3,
              boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              '&:hover': { 
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 24px rgba(0,0,0,0.15)'
              },
              borderTop: '4px solid',
              borderColor: 'primary.main'
            }}
          >
            <CardMedia
              component="div"
              sx={{
                pt: '40%',
                bgcolor: 'rgba(25, 118, 210, 0.08)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative'
              }}
            >
              <Box
                component="img"
                src="/images/diagnosis1.jpeg"
                alt="Diagnosis Icon"
                sx={{ 
                  width: '30%',
                  height: 'auto',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                }}
              />
            </CardMedia>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography 
                variant="h5" 
                component="h3" 
                gutterBottom
                sx={{ 
                  fontWeight: 600,
                  color: 'text.primary',
                  textAlign: 'center',
                  mb: 3
                }}
              >
                Diagnosis
              </Typography>
              <Box component="ul" sx={{ 
                pl: 2,
                '& li': {
                  mb: 1,
                  fontSize: '0.95rem',
                  lineHeight: 1.6
                }
              }}>
                <li>Urine tests</li>
                <li>Blood tests</li>
                <li>Kidney biopsy</li>
                <li>Imaging tests</li>
                <li>Genetic testing</li>
              </Box>
            </CardContent>
          </Card>

          {/* Treatment Card */}
          <Card
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 3,
              boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              '&:hover': { 
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 24px rgba(0,0,0,0.15)'
              },
              borderTop: '4px solid',
              borderColor: 'success.main'
            }}
          >
            <CardMedia
              component="div"
              sx={{
                pt: '40%',
                bgcolor: 'rgba(25, 118, 210, 0.08)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative'
              }}
            >
              <Box
                component="img"
                src="/images/treatment-icon1.jpeg"
                alt="Treatment Icon"
                sx={{ 
                  width: '30%',
                  height: 'auto',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                }}
              />
            </CardMedia>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography 
                variant="h5" 
                component="h3" 
                gutterBottom
                sx={{ 
                  fontWeight: 600,
                  color: 'text.primary',
                  textAlign: 'center',
                  mb: 3
                }}
              >
                Treatment
              </Typography>
              <Box component="ul" sx={{ 
                pl: 2,
                '& li': {
                  mb: 1,
                  fontSize: '0.95rem',
                  lineHeight: 1.6
                }
              }}>
                <li>Blood pressure control</li>
                <li>Dietary changes</li>
                <li>Immunosuppressive therapy</li>
                <li>ACE inhibitors or ARBs</li>
                <li>Regular monitoring</li>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>

      {/* How It Works */}
      <Box sx={{ bgcolor: 'grey.100', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" gutterBottom align="center" sx={{ fontWeight: 700, mb: 4 }}>
            How Our Platform Works
          </Typography>
          <Typography variant="body1" paragraph align="center" sx={{ mb: 6, maxWidth: '800px', mx: 'auto', lineHeight: 1.6 }}>
            Our AI-powered platform helps you detect and manage IgA Nephropathy effectively.
          </Typography>

          <Grid container spacing={4} justifyContent="center" alignItems="stretch">
            {/* Upload Medical Reports */}
            <Grid item xs={12} sm={6} md={4}>
              <Box
                sx={{
                  textAlign: 'center',
                  p: 3,
                  borderRadius: 3,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  bgcolor: 'white',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                  },
                }}
              >
                <UploadFileIcon sx={{ fontSize: 60, color: '#2c2c2c', mb: 2 }} />
                <Typography variant="h5" component="h3" gutterBottom>
                  Upload Medical Reports
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Upload your medical reports securely to our platform for analysis.
                </Typography>
              </Box>
            </Grid>

            {/* Get AI Analysis */}
            <Grid item xs={12} sm={6} md={4}>
              <Box
                sx={{
                  textAlign: 'center',
                  p: 3,
                  borderRadius: 3,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  bgcolor: 'white',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                  },
                }}
              >
                <MedicalInformationIcon sx={{ fontSize: 60, color: '#2c2c2c', mb: 2 }} />
                <Typography variant="h5" component="h3" gutterBottom>
                  Get AI Analysis
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Our AI model analyzes your reports to detect signs of IgA Nephropathy.
                </Typography>
              </Box>
            </Grid>

            {/* Connect with Specialists */}
            <Grid item xs={12} sm={6} md={4}>
              <Box
                sx={{
                  textAlign: 'center',
                  p: 3,
                  borderRadius: 3,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  bgcolor: 'white',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                  },
                }}
              >
                <LocalHospitalIcon sx={{ fontSize: 60, color: '#2c2c2c', mb: 2 }} />
                <Typography variant="h5" component="h3" gutterBottom>
                  Connect with Specialists
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Book appointments with nephrologists for expert consultation.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Call to Action */}
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h3" component="h2" gutterBottom>
          Take Control of Your Kidney Health
        </Typography>
        <Typography variant="body1" paragraph sx={{ mb: 4 }}>
          Join thousands of patients who are managing their IgA Nephropathy effectively with our platform.
        </Typography>
        <Button 
          variant="contained" 
          color="#2c2c2c" 
          size="large"
          component={RouterLink}
          to="/dashboard"
        >
          Get Started Now
        </Button>
      </Container>
    </Box>
  );
};

export default Home;