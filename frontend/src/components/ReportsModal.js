import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Box,
  Typography
} from '@mui/material';

const ReportsModal = ({ open, onClose, reports, onDelete, onViewAnalysis }) => {
  const handleDeleteClick = (reportId) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      onDelete(reportId);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>All Reports</DialogTitle>
      <DialogContent dividers sx={{ maxHeight: 500 }}>
        {reports.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No reports available.
          </Typography>
        ) : (
          <List>
            {reports.map((report, index) => (
              <React.Fragment key={report._id}>
                <ListItem
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {onViewAnalysis && (
                        <Button
                          variant="outlined"
                          color="primary"
                          size="small"
                          onClick={() => onViewAnalysis(report._id)}
                          sx={{ textTransform: 'none' }}
                        >
                          View Analysis
                        </Button>
                      )}
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleDeleteClick(report._id)}
                        sx={{
                          textTransform: 'none',
                          '&:hover': {
                            bgcolor: 'error.light',
                            color: 'error.dark'
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {`${report.reportType?.charAt(0).toUpperCase() + (report.reportType || '').slice(1) || 'Report'}`}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {new Date(report.uploadDate).toLocaleDateString()} • {report.reportType}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < reports.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportsModal;


