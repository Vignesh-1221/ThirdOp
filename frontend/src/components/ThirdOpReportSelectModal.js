import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Radio,
  Typography,
  Box
} from '@mui/material';

const ThirdOpReportSelectModal = ({ open, onClose, reports, onContinue, onContinueToThirdOp }) => {
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (open) {
      setSelectedId(null);
    }
  }, [open]);

  const handleContinue = () => {
    if (selectedId) {
      onContinue(selectedId);
      onClose();
    }
  };

  const handleContinueToThirdOp = () => {
    if (selectedId) {
      if (onContinueToThirdOp) {
        onContinueToThirdOp(selectedId);
      } else {
        onContinue(selectedId);
      }
      onClose();
    }
  };

  const reportTypeLabel = (report) => {
    const type = report.reportType || report.type || 'Report';
    return `${String(type).charAt(0).toUpperCase()}${String(type).slice(1)}`;
  };

  const reportDate = (report) => {
    const d = report.uploadDate || report.createdAt;
    return d ? new Date(d).toLocaleDateString() : '—';
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Select a report for Third Opinion</DialogTitle>
      <DialogContent dividers sx={{ minHeight: 200 }}>
        {!reports || reports.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No reports available. Upload a report first to use Third Opinion.
          </Typography>
        ) : (
          <List disablePadding>
            {reports.map((report) => (
              <ListItem key={report._id} disablePadding>
                <ListItemButton
                  selected={selectedId === report._id}
                  onClick={() => setSelectedId(report._id)}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Radio
                      checked={selectedId === report._id}
                      size="small"
                      sx={{ p: 0 }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2">
                        {reportTypeLabel(report)} Report
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {reportDate(report)}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="outlined"
          onClick={handleContinue}
          disabled={!selectedId}
        >
          View report
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleContinueToThirdOp}
          disabled={!selectedId}
        >
          Run Third Opinion
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ThirdOpReportSelectModal;
