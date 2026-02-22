const mongoose = require('mongoose');

const differentialItemSchema = new mongoose.Schema({
  condition: { type: String, required: true },
  likelihood: { type: String, enum: ['High', 'Moderate', 'Low'] },
  reasoning: { type: String, default: '' }
}, { _id: false });

/** Sub-schema for a single ranked concern (clinical reasoning) */
const rankedConcernItemSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  priority: { type: String, default: '' },
  reasoning: { type: String, default: '' },
  doctorQuestions: { type: [String], default: [] }
}, { _id: false, strict: false });

/** Cached clinical reasoning from Gemini; avoids repeated LLM calls per reportId */
const llmInsightsSchema = new mongoose.Schema({
  overallSummary: { type: String, default: '' },
  rankedConcerns: { type: [rankedConcernItemSchema], default: [] },
  doctorQuestions: { type: [String], default: [] },
  generatedAt: { type: Date, default: Date.now }
}, { _id: false });

const differentialSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['healthy', 'low-risk', 'pathological'],
    default: 'low-risk'
  },
  message: {
    type: String,
    default: ''
  },
  rankedDifferentials: {
    type: [differentialItemSchema],
    default: []
  },
  source: {
    type: String,
    enum: ['llm', 'rules_fallback'],
    default: 'llm'
  },
  llmInsights: {
    type: llmInsightsSchema,
    default: null
  }
}, {
  timestamps: true
});

const Differential = mongoose.model('Differential', differentialSchema);
module.exports = Differential;
