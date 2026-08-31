const mongoose = require('mongoose')

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    targetCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    targetApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecruiterApplication',
      index: true,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
)

auditLogSchema.statics.log = async function (data) {
  try {
    return await this.create(data)
  } catch (err) {
    console.error('Audit log creation failed:', err.message)
    return null
  }
}

module.exports = mongoose.model('AuditLog', auditLogSchema)
