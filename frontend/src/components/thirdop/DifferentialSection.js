import React from 'react';
import { Box, Typography } from '@mui/material';
import DifferentialCard from './DifferentialCard';

export default function DifferentialSection({
  rankedDifferentials = [],
  status,
  message
}) {
  const list = Array.isArray(rankedDifferentials) ? rankedDifferentials : [];
  const hasItems = list.length > 0;
  const isHealthy = status === 'healthy';

  if (isHealthy && !hasItems) return null;

  return (
    <Box>
      {message && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {message}
        </Typography>
      )}
      {!hasItems && status === 'healthy' && (
        <Typography variant="body2" color="text.secondary">
          Lab pattern does not suggest significant pathology; no differential list.
        </Typography>
      )}
      {hasItems &&
        list.map((item, index) => (
          <DifferentialCard
            key={`${item.condition}-${index}`}
            condition={item.condition}
            reasoning={item.reasoning}
            defaultExpanded={index === 0}
          />
        ))}
    </Box>
  );
}
