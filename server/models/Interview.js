const mongoose = require('mongoose')

const slotSchema = new mongoose.Schema(
  {
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    durationMinutes: { type: Number, default: 45 },
  },
  { _id: true }
)

const interviewSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: 'Technical Interview',
    },
    type: {
      type: String,
      enum: ['video_careerhub', 'video_external', 'phone', 'in_person'],
      default: 'video_careerhub',
    },
    status: {
      type: String,
      enum: ['slots_offered', 'scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    // If recruiter offers multiple options for candidate to select from
    proposedSlots: [slotSchema],
    // The final selected confirmed slot
    selectedSlot: {
      startTime: { type: Date },
      endTime: { type: Date },
      durationMinutes: { type: Number, default: 45 },
    },
    meetingRoomId: {
      type: String,
      trim: true,
    },
    meetingLink: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    cancellationReason: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Interview', interviewSchema)
