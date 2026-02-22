import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  Grid
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const ReportCard = ({ report }) => {
  const navigate = useNavigate();
  
  const getReportTypeLabel = (type) => {
    switch (type) {
      case 'blood':
        return 'Blood Test';
      case 'urine':
        return 'Urine Analysis';
      case 'kidney_biopsy':
        return 'Kidney Biopsy';
      default:
        return 'Other Report';
    }
  };
  
  const getStageColor = (stage) => {
    if (!stage) return 'default';
    
    switch (parseInt(stage)) {
      case 1:
        return 'success';
      case 2:
        return 'info';
      case 3:
        return 'warning';
      case 4:
      case 5:
        return 'error';
      default:
        return 'default';
    }
  };
  
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  return (
    <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="div">
            {getReportTypeLabel(report.reportType)}
          </Typography>
          <Chip 
            size="small" 
            label={formatDate(report.uploadDate)} 
            variant="outlined" 
          />
        </Box>
        
        <Grid container spacing={1}>
          {report.reportData.proteinLevel && (
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Protein Level
              </Typography>
              <Typography variant="body1">
                {report.reportData.proteinLevel} mg/dL
              </Typography>
            </Grid>
          )}
          
          {report.reportData.creatinineLevel && (
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Creatinine
              </Typography>
              <Typography variant="body1">
                {report.reportData.creatinineLevel} mg/dL
              </Typography>
            </Grid>
          )}
          
          {report.reportData.gfrValue && (
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                GFR Value
              </Typography>
              <Typography variant="body1">
                {report.reportData.gfrValue} mL/min
              </Typography>
            </Grid>
          )}
        </Grid>
        
        {report.predictionResult && (
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ mr: 1 }}>
                Analysis Result:
              </Typography>
              <Chip 
                size="small" 
                icon={parseInt(report.predictionResult.stage) > 3 ? <WarningIcon /> : <CheckCircleIcon />}
                label={`Stage ${report.predictionResult.stage}`} 
                color={getStageColor(report.predictionResult.stage)} 
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Risk Probability: {(report.predictionResult.probability * 100).toFixed(1)}%
            </Typography>
          </Box>
        )}
      </CardContent>
      
      <CardActions>
        <Button 
          size="small" 
          startIcon={<VisibilityIcon />}
          onClick={() => navigate(`/reports/${report._id}`)}
        >
          View Details
        </Button>
        
        {!report.predictionResult && (
          <Button 
            size="small" 
            color="primary"
            startIcon={<AssessmentIcon />}
            onClick={() => navigate(`/reports/${report._id}`)}
          >
            Analyze
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

export default ReportCard;