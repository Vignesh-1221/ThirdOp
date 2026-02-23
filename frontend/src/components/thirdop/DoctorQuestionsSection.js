import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Returns max number of questions to show per concern based on severity.
 * Low: 0–1, Moderate: 1–2, High/Critical or critical flags: 2–3.
 */
export function getMaxQuestionsPerConcern(riskTier, hasCriticalFlags) {
  const tier = (riskTier || 'low').toLowerCase();
  if (tier === 'high' || hasCriticalFlags) return 3;
  if (tier === 'medium') return 2;
  return 1;
}

/**
 * Renders context-aware questions per concern with severity-based limit.
 * Urgency communicated through structure (order, count), not color overload.
 */
export default function DoctorQuestionsSection({
  rankedConcerns = [],
  riskTier,
  hasCriticalFlags
}) {
  const concerns = Array.isArray(rankedConcerns) ? rankedConcerns.filter((c) => c && (c.title || c.reasoning)) : [];
  const withQuestions = concerns
    .map((c) => ({
      ...c,
      questions: (Array.isArray(c.doctorQuestions) ? c.doctorQuestions : [])
        .filter((q) => typeof q === 'string' && q.trim())
    }))
    .filter((c) => c.questions.length > 0);

  if (withQuestions.length === 0) return null;

  return (
    <Box>
      {withQuestions.map((concern, idx) => (
        <Box key={idx} sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
            {concern.title || 'Follow-up'}
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {concern.questions.map((q, i) => (
              <Typography key={i} component="li" variant="body2" sx={{ color: 'text.secondary', mb: 0.25, lineHeight: 1.4 }}>
                {q}
              </Typography>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
