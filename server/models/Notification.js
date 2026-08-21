const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['status', 'message', 'job'], default: 'job' },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Notification', notificationSchema)
