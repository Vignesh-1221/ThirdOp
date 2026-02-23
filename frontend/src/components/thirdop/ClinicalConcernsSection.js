import React, { useState } from 'react';
import { Box, Typography, Collapse, IconButton, Checkbox } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

/**
 * Clinical Concerns Identified: each concern has checkbox, title, chevron.
 * Collapsed by default. Expanded: short explanation card + dynamic questions (checklist).
 * No severity badges. Checkbox state is controlled for export/print.
 */
export default function ClinicalConcernsSection({
  rankedConcerns = [],
  riskTier,
  hasCriticalFlags,
  checkedConcerns = {},
  onCheckedChange
}) {
  const concerns = Array.isArray(rankedConcerns) ? rankedConcerns.filter((c) => c && (c.title || c.reasoning)) : [];

  if (concerns.length === 0) return null;

  const handleToggle = (index) => (e) => {
    const next = { ...checkedConcerns, [index]: e.target.checked };
    onCheckedChange?.(next);
  };

  return (
    <Box>
      {concerns.map((concern, index) => (
        <ConcernItem
          key={index}
          index={index}
          concern={concern}
          checked={!!checkedConcerns[index]}
          onToggle={handleToggle(index)}
        />
      ))}
    </Box>
  );
}

function ConcernItem({ index, concern, checked, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const title = concern.title || 'Clinical concern';
  const reasoning = concern.reasoning || '';
  const questions = (Array.isArray(concern.doctorQuestions) ? concern.doctorQuestions : [])
    .filter((q) => typeof q === 'string' && q.trim());

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px',
        mb: 1.5,
        overflow: 'hidden',
        bgcolor: '#fff',
        '&:last-child': { mb: 0 }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          p: 1.5,
          pr: 0.5
        }}
      >
        <Checkbox
          size="small"
          checked={checked}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          sx={{ p: 0.5 }}
        />
        <Typography
          variant="body2"
          sx={{ flex: 1, fontWeight: 600, cursor: 'pointer' }}
          onClick={() => setExpanded((e) => !e)}
        >
          {title}
        </Typography>
        <IconButton size="small" onClick={() => setExpanded((e) => !e)} aria-label={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ px: 2, pb: 2, pt: 0 }}>
          {reasoning && (
            <Box
              sx={{
                bgcolor: '#fafafa',
                borderRadius: '8px',
                p: 1.5,
                mb: 1.5,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                {reasoning.length > 280 ? `${reasoning.slice(0, 280).trim()}…` : reasoning}
              </Typography>
            </Box>
          )}
          {questions.length > 0 && (
            <>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.75 }}>
                Questions to discuss with your doctor
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {questions.map((q, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      py: 0.5,
                      px: 1,
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: '#fff'
                    }}
                  >
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
                      {q}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
