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
    enum: ['blood', 'urine', 'kidney_biopsy', 'other', 'Manual Entry', 'Generic Lab']
  },
  reportFile: {
    type: String,
    required: false // Made optional, validation handled in route
  },
  source: {
    type: String,
    enum: ['upload', 'manual', 'upload_generic'],
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
  /** "kidney" = ThirdOp analysis; "generic" = Any Report Analysis. Inferred from genericAnalysisResult if missing (backward compat). */
  analysisType: {
    type: String,
    enum: ['kidney', 'generic']
  },
  /** LLM result for generic lab analysis (rankedConcerns etc.). Only used when analysisType === 'generic'. */
  genericAnalysisResult: {
    type: Object,
    default: undefined
  },
  /** Cached ThirdOp decision support result (re-analysis). Updated when POST /api/thirdop/analyze runs for this report. */
  thirdopAnalysis: {
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