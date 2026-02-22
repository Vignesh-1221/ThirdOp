import React from 'react';
import {
  Box,
  Collapse,
  Typography,
  IconButton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

export default function DifferentialCard({ condition, reasoning, defaultExpanded = false }) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const shortReason = reasoning
    ? reasoning.slice(0, 120) + (reasoning.length > 120 ? '…' : '')
    : '';
  const hasMore = reasoning && reasoning.length > 120;

  return (
    <Box
      sx={{
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        mb: 1.5,
        '&:last-child': { mb: 0 }
      }}
    >
      <Box
        onClick={() => setExpanded((e) => !e)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          cursor: hasMore ? 'pointer' : 'default',
          '&:hover': hasMore ? { bgcolor: 'action.hover' } : {}
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {condition || 'Differential consideration'}
        </Typography>
        {hasMore && (
          <IconButton size="small" aria-label={expanded ? 'Collapse' : 'Expand'}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        )}
      </Box>
      <Collapse in={expanded || !hasMore}>
        <Box sx={{ px: 2, pb: 2, pt: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            {expanded && reasoning ? reasoning : shortReason}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}
