const mongoose = require('mongoose')

const contactMessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    subject: { type: String, default: 'General Inquiry', trim: true },
    message: { type: String, required: true },
    recipientType: {
      type: String,
      enum: ['general', 'recruiter', 'company', 'all_recruiters'],
      default: 'all_recruiters',
    },
    recipientCompany: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    recipientUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

module.exports = mongoose.model('ContactMessage', contactMessageSchema)
