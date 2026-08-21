const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const educationSchema = new mongoose.Schema({
  degree: String,
  institute: String,
  year: String,
}, { _id: false })

const projectSchema = new mongoose.Schema({
  title: String,
  description: String,
}, { _id: false })

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: {
      type: String,
      required: function () {
        return this.authProvider === 'local' || !this.googleId
      },
      minlength: 6,
      select: false,
    },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ['student', 'recruiter', 'admin'], default: 'student' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },

    // Student profile fields
    about: { type: String, default: '' },
    skills: [{ type: String }],
    education: [educationSchema],
    projects: [projectSchema],
    resumeUrl: { type: String, default: '' },
    photoUrl: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    github: { type: String, default: '' },
    portfolio: { type: String, default: '' },
    profileViews: { type: Number, default: 0 },
    viewedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        viewedAt: { type: Date, default: Date.now },
      },
    ],

    // Recruiter link
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },

    // Password reset fields
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password') || !this.password) return next()
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password || !candidate) return false
  return bcrypt.compare(candidate, this.password)
}

userSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject()
  delete obj.password
  return obj
}

module.exports = mongoose.model('User', userSchema)
