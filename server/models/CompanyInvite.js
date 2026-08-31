const mongoose = require('mongoose')
const crypto = require('crypto')

const companyInviteSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    recipientName: {
      type: String,
      trim: true,
      default: '',
    },
    companyRole: {
      type: String,
      enum: ['ADMIN', 'RECRUITER', 'HIRING_MANAGER'],
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
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    acceptedAt: {
      type: Date,
    },
  },
  { timestamps: true }
)

companyInviteSchema.statics.generateInviteToken = function () {
  return crypto.randomBytes(32).toString('hex')
}

module.exports = mongoose.model('CompanyInvite', companyInviteSchema)
