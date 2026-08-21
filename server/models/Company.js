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
    description: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Company', companySchema)
