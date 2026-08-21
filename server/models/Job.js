const mongoose = require('mongoose')

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    location: { type: String, required: true },
    skills: [{ type: String }],
    salary: { type: String, default: '' },
    experience: { type: String, default: '' },
    jobType: { type: String, enum: ['Full Time', 'Part Time', 'Internship', 'Contract'], required: true },
    workMode: { type: String, enum: ['Remote', 'Hybrid', 'On-site'], required: true },

    responsibilities: [{ type: String }],
    requirements: [{ type: String }],
    benefits: [{ type: String }],

    deadline: { type: Date },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'closed'], default: 'pending' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Supports keyword search across title + skills, and common list-page filters
jobSchema.index({ title: 'text', skills: 'text' })
jobSchema.index({ location: 1, jobType: 1, workMode: 1 })

module.exports = mongoose.model('Job', jobSchema)
