const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportType: {
    type: String,
    required: true,
    enum: ['blood', 'urine', 'kidney_biopsy', 'other', 'Manual Entry']
  },
  reportFile: {
    type: String,
    required: false // Made optional, validation handled in route
  },
  source: {
    type: String,
    enum: ['upload', 'manual'],
    default: 'upload'
  },
  reportData: {
    type: Object,
    default: {}
  },
  predictionResult: {
    type: Object,
    default: null
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
});

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;