import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { getMetricStatus, getMetricInterpretation } from '../../constants/clinicalMetrics';

const STATUS_COLORS = {
  normal: '#4caf50',
  abnormal: '#ed6c02',
  critical: '#c62828',
  unknown: '#9e9e9e'
};

export default function MetricCard({ config, value, reportData }) {
  const rawValue = value !== undefined && value !== null ? value : config.getValue(reportData);
  const status = getMetricStatus(config, rawValue);
  const interpretation = getMetricInterpretation(config, rawValue, status);
  const barColor = STATUS_COLORS[status] || STATUS_COLORS.unknown;

  const displayValue =
    rawValue !== null && rawValue !== undefined
      ? Number(rawValue) === rawValue && !Number.isNaN(Number(rawValue))
        ? Number(rawValue)
        : String(rawValue)
      : '—';

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }
      }}
    >
      <Box sx={{ borderTop: '3px solid', borderColor: barColor, height: 3 }} />
      <Box sx={{ p: 2 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
          {config.label}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 600, mt: 0.25, letterSpacing: '-0.02em' }}>
          {displayValue}
          {config.unit && (
            <Typography component="span" variant="body2" sx={{ color: 'text.secondary', fontWeight: 400, ml: 0.5 }}>
              {config.unit}
            </Typography>
          )}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
          Ref: {config.normalRange}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, lineHeight: 1.4 }}>
          {interpretation}
        </Typography>
      </Box>
    </Paper>
  );
}
