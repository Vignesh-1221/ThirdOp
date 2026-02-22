import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

const ACTION_CONFIG = {
  monitor: {
    label: 'Monitor',
    summary: 'Continue regular follow-up and routine lab monitoring.'
  },
  request_additional_tests: {
    label: 'Request Additional Tests',
    summary: 'Consider additional diagnostic tests and closer follow-up.'
  },
  escalate: {
    label: 'Escalate',
    summary: 'Consider nephrology consultation and escalation of care.'
  },
  human_review: {
    label: 'Human Review',
    summary: 'A specialist should review this case due to risk level.'
  },
  book_consultation: {
    label: 'Book Consultation',
    summary: 'Schedule a nephrology or primary care visit.'
  }
};

export default function ActionCard({ type, summary }) {
  const config = ACTION_CONFIG[type] || { label: type, summary: summary || '' };
  const displaySummary = summary || config.summary || '';

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        p: 2,
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          borderColor: 'action.hover'
        }
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {config.label}
      </Typography>
      {displaySummary && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.4 }}>
          {displaySummary}
        </Typography>
      )}
    </Paper>
  );
}
