const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const verificationOtpSchema = new mongoose.Schema(
  {
    target: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['email', 'phone'],
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
      select: false,
    },
    code: {
      type: String, // Dev/testing fallback convenience
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index to automatically clean up expired OTP docs
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    resendAttempts: {
      type: Number,
      default: 1,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

verificationOtpSchema.methods.compareOtp = function (candidate) {
  if (!this.otpHash || !candidate) return false
  return bcrypt.compare(candidate.toString().trim(), this.otpHash)
}

module.exports = mongoose.model('VerificationOtp', verificationOtpSchema)
