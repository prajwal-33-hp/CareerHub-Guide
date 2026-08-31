const mongoose = require('mongoose')

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    logo: { type: String, default: '' },
    industry: { type: String, default: '' },
    location: { type: String, default: '' },
    employees: { type: String, default: '1-10' },
    website: { type: String, default: '' },
    domain: { type: String, default: '', lowercase: true, trim: true },
    companyType: {
      type: String,
      default: 'Private Limited',
    },
    country: { type: String, default: 'India' },
    state: { type: String, default: '' },
    city: { type: String, default: '' },
    address: { type: String, default: '' },
    description: { type: String, default: '' },
    cin: { type: String, default: '' },
    llpin: { type: String, default: '' },
    gstin: { type: String, default: '' },
    registrationDocumentUrl: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'suspended'],
      default: 'pending',
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Company', companySchema)
