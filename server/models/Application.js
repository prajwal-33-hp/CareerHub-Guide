const mongoose = require('mongoose')

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'],
      default: 'Applied',
    },
    // AI Match Analysis
    aiMatchScore: { type: Number, min: 0, max: 100 },
    aiMatchSummary: { type: String, default: '' },
    aiMatchedSkills: [{ type: String }],
    aiMissingSkills: [{ type: String }],
    aiRecommendation: {
      type: String,
      enum: ['Strong Fit', 'Moderate Fit', 'Low Fit', 'Pending Analysis'],
      default: 'Pending Analysis',
    },
    aiAnalyzedAt: { type: Date },
    interview: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview' },
  },
  { timestamps: true }
)

// A student can only apply to a given job once
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true })

module.exports = mongoose.model('Application', applicationSchema)
