import React from 'react';
import { Box, Typography } from '@mui/material';
import { METRIC_CONFIG } from '../../constants/clinicalMetrics';
import MetricCard from './MetricCard';

export default function MetricsGrid({ reportData }) {
  const data = reportData || {};
  const metricsToShow = METRIC_CONFIG.filter((config) => {
    const v = config.getValue(data);
    return v !== null && v !== undefined && v !== '';
  });

  if (metricsToShow.length === 0) {
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No lab values available to display.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)'
        },
        gap: 2
      }}
    >
      {metricsToShow.map((config) => (
        <MetricCard key={config.key} config={config} reportData={data} />
      ))}
    </Box>
  );
}
