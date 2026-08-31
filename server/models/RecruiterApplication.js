const mongoose = require('mongoose')

const applicantDetailsSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    workEmail: { type: String, required: true, lowercase: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    linkedinUrl: { type: String, default: '', trim: true },
    idBadgeUrl: { type: String, default: '' },
  },
  { _id: false }
)

const companyDetailsSchema = new mongoose.Schema(
  {
    legalName: { type: String, required: true, trim: true },
    website: { type: String, required: true, trim: true },
    domain: { type: String, required: true, lowercase: true, trim: true },
    companyType: {
      type: String,
      required: true,
      enum: [
        'Private Limited',
        'Public Limited',
        'LLP',
        'Sole Proprietorship',
        'Partnership',
        'Startup',
        'Non-Profit',
        'Enterprise',
        'Other',
      ],
      default: 'Private Limited',
    },
    industry: { type: String, required: true, trim: true },
    companySize: {
      type: String,
      required: true,
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
      default: '1-10',
    },
    country: { type: String, required: true, default: 'India', trim: true },
    state: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    businessAddress: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    logoUrl: { type: String, default: '' },
    cin: { type: String, default: '', trim: true },
    llpin: { type: String, default: '', trim: true },
    gstin: { type: String, default: '', trim: true },
    registrationDocUrl: { type: String, default: '' },
  },
  { _id: false }
)

const verificationSchema = new mongoose.Schema(
  {
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date },
    phoneVerified: { type: Boolean, default: false },
    phoneVerifiedAt: { type: Date },
    domainMatched: { type: Boolean, default: false },
    companyVerified: { type: Boolean, default: false },
    relationshipVerified: { type: Boolean, default: false },
  },
  { _id: false }
)

const rejectionHistorySchema = new mongoose.Schema(
  {
    rejectedAt: { type: Date, default: Date.now },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, required: true },
  },
  { _id: false }
)

const recruiterApplicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    applicantDetails: { type: applicantDetailsSchema, required: true },
    companyDetails: { type: companyDetailsSchema, required: true },
    existingCompany: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    createdCompany: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    verification: { type: verificationSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'REVOKED'],
      default: 'REQUESTED',
      index: true,
    },
    companyRole: {
      type: String,
      enum: ['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'],
      default: 'OWNER',
    },
    adminReview: {
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: { type: Date },
      notes: { type: String, default: '' },
      rejectionReason: { type: String, default: '' },
    },
    rejectionHistory: [rejectionHistorySchema],
  },
  { timestamps: true }
)

module.exports = mongoose.model('RecruiterApplication', recruiterApplicationSchema)
