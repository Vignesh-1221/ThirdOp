import React from 'react';
import { Box, Container, Typography, Link, Grid, Divider } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 4,
        px: 2,
        mt: 'auto',
        backgroundColor: '#2c2c2c', // Darker background for a modern look
        color: 'white', // White text for contrast
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* About Section */}
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="inherit" gutterBottom>
              IgA Nephropathy Platform
            </Typography>
            <Typography variant="body2" color="inherit">
              Early detection and management of IgA Nephropathy.
            </Typography>
          </Grid>

          {/* Quick Links */}
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="inherit" gutterBottom>
              Quick Links
            </Typography>
            <Link
              component={RouterLink}
              to="/"
              color="inherit"
              display="block"
              sx={{
                mb: 1,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                  color: '#f5f5f5',
                },
              }}
            >
              Home
            </Link>
            <Link
              component={RouterLink}
              to="/doctors"
              color="inherit"
              display="block"
              sx={{
                mb: 1,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                  color: '#f5f5f5',
                },
              }}
            >
              Find Doctors
            </Link>
            <Link
              component={RouterLink}
              to="/upload-report"
              color="inherit"
              display="block"
              sx={{
                mb: 1,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                  color: '#f5f5f5',
                },
              }}
            >
              Upload Report
            </Link>
          </Grid>

          {/* Resources */}
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="inherit" gutterBottom>
              Resources
            </Typography>
            <Link
              href="https://www.kidney.org/atoz/content/iganeph"
              target="_blank"
              rel="noopener"
              color="inherit"
              display="block"
              sx={{
                mb: 1,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                  color: '#f5f5f5',
                },
              }}
            >
              National Kidney Foundation
            </Link>
            <Link
              href="https://www.mayoclinic.org/diseases-conditions/iga-nephropathy/symptoms-causes/syc-20352268"
              target="_blank"
              rel="noopener"
              color="inherit"
              display="block"
              sx={{
                mb: 1,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                  color: '#f5f5f5',
                },
              }}
            >
              Mayo Clinic
            </Link>
            <Link
              href="https://www.niddk.nih.gov/health-information/kidney-disease/iga-nephropathy"
              target="_blank"
              rel="noopener"
              color="inherit"
              display="block"
              sx={{
                mb: 1,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                  color: '#f5f5f5',
                },
              }}
            >
              NIDDK
            </Link>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

        <Typography variant="body2" color="inherit" align="center">
          {'Copyright © '}
          <Link
            color="inherit"
            component={RouterLink}
            to="/"
            sx={{
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
                color: '#f5f5f5',
              },
            }}
          >
            IgA Nephropathy Platform
          </Link>{' '}
          {new Date().getFullYear()}
          {'.'}
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;