import React from 'react';
import { Box, Typography } from '@mui/material';

const RISK_STYLES = {
  low: {
    bg: '#e8f5e9',
    border: '#2e7d32',
    label: 'Low Risk'
  },
  medium: {
    bg: '#fff3e0',
    border: '#e65100',
    label: 'Moderate Risk'
  },
  high: {
    bg: '#ffebee',
    border: '#c62828',
    label: 'High / Critical Risk'
  }
};

const DECISION_LABELS = {
  monitor: 'Monitor',
  request_additional_tests: 'Request Additional Tests',
  escalate: 'Escalate'
};

export default function RiskBanner({ riskTier, decision, humanEscalation }) {
  const tier = (riskTier || 'low').toLowerCase();
  const style = RISK_STYLES[tier] || RISK_STYLES.low;
  const decisionLabel = DECISION_LABELS[decision] || decision || '—';
  const escalationLabel = humanEscalation ? 'Escalation recommended' : 'No escalation';

  return (
    <Box
      sx={{
        background: style.bg,
        borderLeft: '4px solid',
        borderColor: style.border,
        borderRadius: '10px',
        p: 2.5,
        mb: 0
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: { xs: 1.5, sm: 3 }
        }}
      >
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            Risk Level
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: style.border }}>
            {style.label}
          </Typography>
        </Box>
        <Box sx={{ borderLeft: '1px solid', borderColor: 'divider', pl: 2, minHeight: 36 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            Decision
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {decisionLabel}
          </Typography>
        </Box>
        <Box sx={{ borderLeft: '1px solid', borderColor: 'divider', pl: 2, minHeight: 36 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            Escalation
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {escalationLabel}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
