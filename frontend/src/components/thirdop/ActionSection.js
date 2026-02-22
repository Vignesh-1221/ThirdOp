import React from 'react';
import { Box } from '@mui/material';
import ActionCard from './ActionCard';

const DECISION_SUMMARIES = {
  monitor: 'Continue regular follow-up and routine lab monitoring.',
  request_additional_tests: 'Consider additional diagnostic tests and closer follow-up.',
  escalate: 'Consider urgent nephrology consultation and escalation of care.'
};

export default function ActionSection({ decision, humanEscalation }) {
  const actions = [];

  if (decision) {
    actions.push({
      type: decision,
      summary: DECISION_SUMMARIES[decision] || null
    });
  }
  if (humanEscalation) {
    actions.push({
      type: 'human_review',
      summary: 'A specialist should review this case due to high-risk findings.'
    });
  }
  if (decision === 'escalate' || humanEscalation) {
    actions.push({
      type: 'book_consultation',
      summary: 'Schedule a nephrology or primary care visit.'
    });
  }

  if (actions.length === 0) {
    actions.push({
      type: 'monitor',
      summary: DECISION_SUMMARIES.monitor
    });
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 2
      }}
    >
      {actions.map((a, i) => (
        <ActionCard key={`${a.type}-${i}`} type={a.type} summary={a.summary} />
      ))}
    </Box>
  );
}
