import React, { useState } from 'react';
import { Box, Typography, Collapse, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const LAB_LABELS = {
  CREATININE: 'Creatinine',
  UREA: 'Urea',
  ALBUMIN: 'Albumin',
  eGFR: 'eGFR',
  EGFR: 'eGFR',
  ACR: 'ACR',
  'URIC ACID': 'Uric acid'
};

/**
 * Derive short lab names from clinicalIndicators (abnormalValues + criticalFlags).
 * Returns unique list of contributing indicators for "View Supporting Indicators".
 */
export function getSupportingIndicatorLabels(clinicalIndicators = {}) {
  const raw = [
    ...(Array.isArray(clinicalIndicators.abnormalValues) ? clinicalIndicators.abnormalValues : []),
    ...(Array.isArray(clinicalIndicators.criticalFlags) ? clinicalIndicators.criticalFlags : [])
  ];
  const names = new Set();
  raw.forEach((s) => {
    if (typeof s !== 'string') return;
    let key = s.split(':')[0].trim();
    if (key === s.trim()) {
      const match = s.match(/^(eGFR|EGFR|ACR|CREATININE|UREA|ALBUMIN|URIC\s*ACID)/i);
      key = match ? match[1].toUpperCase().replace(/\s+/g, ' ') : key;
    }
    const label = LAB_LABELS[key] || (key.length <= 10 ? key : key.split(/\s+/)[0]);
    names.add(label);
  });
  return Array.from(names);
}

/**
 * Ranked Possible Diseases (Decision Support): 3–5 cards with rank, name, likelihood (subtle),
 * 2–3 line reasoning, and collapsible "View Supporting Indicators".
 */
export default function RankedDiseasesSection({
  rankedDifferentials = [],
  clinicalIndicators,
  status,
  message
}) {
  const list = Array.isArray(rankedDifferentials) ? rankedDifferentials.slice(0, 5) : [];
  const supportingLabels = getSupportingIndicatorLabels(clinicalIndicators);
  const isHealthy = status === 'healthy';

  if (isHealthy && list.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Lab pattern does not suggest significant pathology; no differential list.
      </Typography>
    );
  }

  return (
    <Box>
      {message && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {message}
        </Typography>
      )}
      {list.length === 0 && !isHealthy && (
        <Typography variant="body2" color="text.secondary">
          No differential list available.
        </Typography>
      )}
      {list.map((item, index) => (
        <DiseaseCard
          key={`${item.condition}-${index}`}
          rank={index + 1}
          name={item.condition}
          likelihood={item.likelihood}
          reasoning={item.reasoning}
          supportingIndicators={supportingLabels}
        />
      ))}
    </Box>
  );
}

function DiseaseCard({ rank, name, likelihood, reasoning, supportingIndicators }) {
  const [showIndicators, setShowIndicators] = useState(false);
  const hasIndicators = supportingIndicators.length > 0;
  const summary = reasoning
    ? reasoning.length > 200 ? `${reasoning.slice(0, 200).trim()}…` : reasoning
    : '';

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px',
        overflow: 'hidden',
        mb: 1.5,
        bgcolor: '#fff',
        '&:last-child': { mb: 0 }
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap', mb: 0.75 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {rank}.
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {name || 'Differential consideration'}
          </Typography>
          {likelihood && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Likelihood: {likelihood}
            </Typography>
          )}
        </Box>
        {summary && (
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, mb: 1.5 }}>
            {summary}
          </Typography>
        )}
        {hasIndicators && (
          <>
            <Box
              onClick={() => setShowIndicators((v) => !v)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                cursor: 'pointer',
                color: 'text.secondary',
                '&:hover': { color: 'text.primary' }
              }}
            >
              <IconButton size="small" sx={{ p: 0 }}>
                {showIndicators ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                View Supporting Indicators
              </Typography>
            </Box>
            <Collapse in={showIndicators}>
              <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.5 }}>
                {supportingIndicators.map((label, i) => (
                  <Typography key={i} component="li" variant="body2" sx={{ color: 'text.secondary', mb: 0.25 }}>
                    {label}
                  </Typography>
                ))}
              </Box>
            </Collapse>
          </>
        )}
      </Box>
    </Box>
  );
}
