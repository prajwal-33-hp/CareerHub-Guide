const mongoose = require('mongoose')

const companyMemberSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    companyRole: {
      type: String,
      enum: ['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'],
      default: 'RECRUITER',
      required: true,
    },
    designation: {
      type: String,
      default: 'Recruiter',
      trim: true,
    },
    department: {
      type: String,
      default: 'Talent Acquisition',
      trim: true,
    },
    workEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    workPhone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'revoked'],
      default: 'active',
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

// Ensure each user is associated with a company uniquely as a member
companyMemberSchema.index({ company: 1, user: 1 }, { unique: true })

module.exports = mongoose.model('CompanyMember', companyMemberSchema)
