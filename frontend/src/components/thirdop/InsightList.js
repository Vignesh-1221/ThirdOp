import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Renders 4–6 bullet insights from overallInterpretation or rankedConcerns.
 * Patient-friendly but clinical tone; no dramatic wording.
 */
function bulletize(text, maxBullets = 6) {
  if (!text || typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (!trimmed) return [];

  const lines = trimmed
    .split(/\n+/)
    .map((s) => s.replace(/^[\s•\-*]+/, '').trim())
    .filter(Boolean);
  if (lines.length > 0) return lines.slice(0, maxBullets);

  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.slice(0, maxBullets);
}

export default function InsightList({ overallInterpretation, rankedConcerns = [] }) {
  let bullets = [];

  if (overallInterpretation) {
    bullets = bulletize(overallInterpretation, 6);
  }
  if (bullets.length < 4 && rankedConcerns.length > 0) {
    const fromConcerns = rankedConcerns
      .filter((c) => c && (c.title || c.reasoning))
      .slice(0, 6 - bullets.length)
      .map((c) => (c.title ? `${c.title}. ${(c.reasoning || '').slice(0, 80)}` : c.reasoning).trim())
      .filter(Boolean);
    bullets = [...bullets, ...fromConcerns].slice(0, 6);
  }

  if (bullets.length === 0) return null;

  return (
    <Box component="ul" sx={{ m: 0, pl: 2.5, '& li': { mb: 1 } }}>
      {bullets.map((line, i) => (
        <Typography key={i} component="li" variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
          {line}
        </Typography>
      ))}
    </Box>
  );
}
