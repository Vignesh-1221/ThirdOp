import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Subtle alert panel: light red background, left border, bullet list of
 * triggered thresholds only. No large red container.
 */
export default function AlertPanel({ criticalFlags = [] }) {
  const flags = Array.isArray(criticalFlags) ? criticalFlags.filter(Boolean) : [];
  if (flags.length === 0) return null;

  return (
    <Box
      sx={{
        bgcolor: '#fef5f5',
        borderLeft: '4px solid',
        borderColor: '#c62828',
        borderRadius: '0 8px 8px 0',
        py: 1.5,
        pl: 2,
        pr: 2,
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Triggered thresholds
      </Typography>
      <Box component="ul" sx={{ m: 0, mt: 0.75, pl: 2.5, color: 'text.primary' }}>
        {flags.map((flag, i) => (
          <Typography key={i} component="li" variant="body2" sx={{ mb: 0.25, lineHeight: 1.4 }}>
            {flag}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
