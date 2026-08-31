const asyncHandler = require('../utils/asyncHandler')
const Interview = require('../models/Interview')
const Application = require('../models/Application')
const Job = require('../models/Job')
const User = require('../models/User')
const Notification = require('../models/Notification')
const {
  emitNotification,
  emitApplicationStatus,
  emitInterviewScheduled,
  emitInterviewConfirmed,
  emitInterviewCancelled,
} = require('../utils/socket')
const {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateICSContent,
} = require('../utils/calendarUtils')

function enrichInterviewWithCalendarUrls(interview, clientUrl) {
  const obj = interview.toObject ? interview.toObject() : { ...interview }
  const slot = obj.selectedSlot?.startTime ? obj.selectedSlot : obj.proposedSlots?.[0]

  if (slot && slot.startTime && slot.endTime) {
    const jobTitle = obj.job?.title || 'Job'
    const companyName = obj.job?.company?.name || 'Company'
    const eventTitle = `${obj.title || 'Technical Interview'} - ${jobTitle} (${companyName})`
    const roomUrl = obj.meetingLink || `${clientUrl}/interview/${obj.meetingRoomId || `room_${obj._id}`}`

    const description = `CareerHub Interview Session\nRole: ${jobTitle}\nCompany: ${companyName}\nFormat: ${
      obj.type === 'video_careerhub' ? 'CareerHub Live Video Studio' : obj.type
    }\nMeeting Link: ${roomUrl}\n\nNotes from recruiter:\n${obj.notes || 'Please be on time.'}`

    obj.googleCalendarUrl = generateGoogleCalendarUrl({
      title: eventTitle,
      description,
      location: roomUrl,
      startTime: slot.startTime,
      endTime: slot.endTime,
    })

    obj.outlookCalendarUrl = generateOutlookCalendarUrl({
      title: eventTitle,
      description,
      location: roomUrl,
      startTime: slot.startTime,
      endTime: slot.endTime,
    })
  }

  return obj
}

// @route   POST /api/interviews/schedule
// @access  Private (recruiter or admin)
const scheduleInterview = asyncHandler(async (req, res) => {
  const {
    applicationId,
    title = 'Technical Interview',
    type = 'video_careerhub',
    proposedSlots = [],
    selectedSlot,
    meetingLink: customMeetingLink,
    notes = '',
    timezone = 'UTC',
  } = req.body

  if (!applicationId) {
    res.status(400)
    throw new Error('Application ID is required')
  }

  const application = await Application.findById(applicationId)
    .populate({ path: 'job', populate: { path: 'company', select: 'name slug logo' } })
    .populate('applicant', 'name email')

  if (!application) {
    res.status(404)
    throw new Error('Application not found')
  }

  // Authorization check - only approved recruiters or admin
  const isApprovedRecruiter =
    req.user.role === 'recruiter' && req.user.recruiterStatus === 'APPROVED'
  const isAdmin = req.user.role === 'admin'

  if (!isApprovedRecruiter && !isAdmin) {
    res.status(403)
    throw new Error('Only approved recruiters or administrators can schedule interviews')
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5174'
  const meetingRoomId = `ch_room_${application._id}`
  const candidateDisplayName = application.applicant?.name || 'Candidate'
  const jobDisplayTitle = application.job?.title || 'Position'

  const defaultMeetingLink = `${clientUrl}/interview/${meetingRoomId}?candidate=${encodeURIComponent(
    candidateDisplayName
  )}&job=${encodeURIComponent(jobDisplayTitle)}`

  const finalMeetingLink =
    type === 'video_careerhub'
      ? defaultMeetingLink
      : customMeetingLink || defaultMeetingLink

  // Determine status & slot structure
  let status = 'scheduled'
  let confirmedSlot = null
  let slotsArray = []

  if (selectedSlot && selectedSlot.startTime && selectedSlot.endTime) {
    confirmedSlot = {
      startTime: new Date(selectedSlot.startTime),
      endTime: new Date(selectedSlot.endTime),
      durationMinutes: selectedSlot.durationMinutes || 45,
    }
    slotsArray = [confirmedSlot]
    status = 'scheduled'
  } else if (proposedSlots.length > 0) {
    slotsArray = proposedSlots.map((s) => ({
      startTime: new Date(s.startTime),
      endTime: new Date(s.endTime),
      durationMinutes: s.durationMinutes || 45,
    }))

    if (slotsArray.length === 1) {
      confirmedSlot = slotsArray[0]
      status = 'scheduled'
    } else {
      status = 'slots_offered'
    }
  } else {
    res.status(400)
    throw new Error('Please provide at least one time slot for the interview')
  }

  // Find existing interview or create new
  let interview = await Interview.findOne({ application: application._id })

  if (interview) {
    interview.title = title
    interview.type = type
    interview.status = status
    interview.proposedSlots = slotsArray
    interview.selectedSlot = confirmedSlot
    interview.meetingRoomId = meetingRoomId
    interview.meetingLink = finalMeetingLink
    interview.notes = notes
    interview.timezone = timezone
    await interview.save()
  } else {
    interview = await Interview.create({
      application: application._id,
      job: application.job._id,
      recruiter: req.user._id,
      candidate: application.applicant._id,
      title,
      type,
      status,
      proposedSlots: slotsArray,
      selectedSlot: confirmedSlot,
      meetingRoomId,
      meetingLink: finalMeetingLink,
      notes,
      timezone,
    })
  }

  // Update Application stage to 'Interview'
  application.status = 'Interview'
  application.interview = interview._id
  await application.save()

  // Real-time notifications to candidate
  const formattedTime = confirmedSlot
    ? new Date(confirmedSlot.startTime).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null

  const notifMsg =
    status === 'scheduled'
      ? `📅 Interview Scheduled for "${application.job.title}" on ${formattedTime}. Check your calendar links!`
      : `📅 Recruiter offered interview time slots for "${application.job.title}". Select your preferred time!`

  try {
    const notif = await Notification.create({
      user: application.applicant._id,
      type: 'status',
      message: notifMsg,
    })
    emitNotification(application.applicant._id, notif)
    emitApplicationStatus(application.applicant._id, application)
  } catch (err) {
    console.error('Error creating candidate interview notification:', err)
  }

  const populatedInterview = await Interview.findById(interview._id)
    .populate('recruiter', 'name email photoUrl')
    .populate('candidate', 'name email photoUrl')
    .populate({ path: 'job', populate: { path: 'company', select: 'name logo' } })

  emitInterviewScheduled(application.applicant._id, populatedInterview)

  const enriched = enrichInterviewWithCalendarUrls(populatedInterview, clientUrl)

  res.status(201).json({
    success: true,
    message: 'Interview successfully scheduled',
    interview: enriched,
    application,
  })
})

// @route   POST /api/interviews/:id/select-slot
// @access  Private (candidate)
const selectInterviewSlot = asyncHandler(async (req, res) => {
  const { slotId, startTime, endTime, durationMinutes } = req.body
  const interview = await Interview.findById(req.params.id)
    .populate({ path: 'job', populate: { path: 'company', select: 'name logo' } })
    .populate('recruiter', 'name email')
    .populate('candidate', 'name email')

  if (!interview) {
    res.status(404)
    throw new Error('Interview record not found')
  }

  if (String(interview.candidate._id) !== String(req.user._id)) {
    res.status(403)
    throw new Error('You do not have permission to select slots for this interview')
  }

  let chosenSlot = null
  if (slotId) {
    chosenSlot = interview.proposedSlots.id(slotId)
  } else if (startTime && endTime) {
    chosenSlot = {
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      durationMinutes: durationMinutes || 45,
    }
  } else if (interview.proposedSlots && interview.proposedSlots.length > 0) {
    chosenSlot = interview.proposedSlots[0]
  }

  if (!chosenSlot) {
    res.status(400)
    throw new Error('Selected slot is invalid or unavailable')
  }

  interview.selectedSlot = {
    startTime: chosenSlot.startTime,
    endTime: chosenSlot.endTime,
    durationMinutes: chosenSlot.durationMinutes || 45,
  }
  interview.status = 'scheduled'
  await interview.save()

  // Notify recruiter of confirmed slot
  const formattedTime = new Date(chosenSlot.startTime).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  try {
    const notif = await Notification.create({
      user: interview.recruiter._id,
      type: 'status',
      message: `✅ ${interview.candidate.name} selected the interview slot for "${interview.job.title}" (${formattedTime}).`,
    })
    emitNotification(interview.recruiter._id, notif)
  } catch (err) {
    console.error('Error creating recruiter confirmation notification:', err)
  }

  emitInterviewConfirmed(interview.recruiter._id, interview)

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5174'
  const enriched = enrichInterviewWithCalendarUrls(interview, clientUrl)

  res.json({
    success: true,
    message: 'Interview slot successfully confirmed!',
    interview: enriched,
  })
})

// @route   GET /api/interviews/application/:applicationId
// @access  Private
const getInterviewByApplication = asyncHandler(async (req, res) => {
  const { applicationId } = req.params
  const interview = await Interview.findOne({ application: applicationId })
    .populate('recruiter', 'name email photoUrl')
    .populate('candidate', 'name email photoUrl')
    .populate({ path: 'job', populate: { path: 'company', select: 'name logo location' } })

  if (!interview) {
    return res.json({ success: true, interview: null })
  }

  const isCandidate = String(interview.candidate?._id || interview.candidate) === String(req.user._id)
  const isRecruiter = String(interview.recruiter?._id || interview.recruiter) === String(req.user._id)
  const isRecruiterOrAdmin = req.user.role === 'recruiter' || req.user.role === 'admin'
  if (!isCandidate && !isRecruiter && !isRecruiterOrAdmin) {
    res.status(403)
    throw new Error('You do not have access to this interview')
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5174'
  const enriched = enrichInterviewWithCalendarUrls(interview, clientUrl)

  res.json({ success: true, interview: enriched })
})

// @route   GET /api/interviews/mine
// @access  Private
const getMyInterviews = asyncHandler(async (req, res) => {
  const query =
    req.user.role === 'student'
      ? { candidate: req.user._id }
      : { recruiter: req.user._id }

  const interviews = await Interview.find(query)
    .populate('recruiter', 'name email photoUrl')
    .populate('candidate', 'name email photoUrl')
    .populate({ path: 'job', populate: { path: 'company', select: 'name logo location' } })
    .sort({ 'selectedSlot.startTime': 1, createdAt: -1 })

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5174'
  const enriched = interviews.map((item) => enrichInterviewWithCalendarUrls(item, clientUrl))

  res.json({ success: true, interviews: enriched })
})

// @route   GET /api/interviews/:id/ics
// @access  Public / Private download
const downloadICS = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id)
    .populate('recruiter', 'name email')
    .populate('candidate', 'name email')
    .populate({ path: 'job', populate: { path: 'company', select: 'name' } })

  if (!interview) {
    res.status(404)
    throw new Error('Interview not found')
  }

  const slot = interview.selectedSlot?.startTime ? interview.selectedSlot : interview.proposedSlots?.[0]
  if (!slot || !slot.startTime || !slot.endTime) {
    res.status(400)
    throw new Error('Interview slot time is not yet configured')
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5174'
  const jobTitle = interview.job?.title || 'Job'
  const companyName = interview.job?.company?.name || 'Company'
  const eventTitle = `${interview.title || 'Technical Interview'} - ${jobTitle} (${companyName})`
  const roomUrl = interview.meetingLink || `${clientUrl}/interview/${interview.meetingRoomId || `room_${interview._id}`}`

  const icsContent = generateICSContent({
    title: eventTitle,
    description: `CareerHub Interview Session\nRole: ${jobTitle}\nCompany: ${companyName}\nMeeting Link: ${roomUrl}\n\n${interview.notes || ''}`,
    location: roomUrl,
    startTime: slot.startTime,
    endTime: slot.endTime,
    uid: `interview_${interview._id}@careerhub.com`,
    organizerName: interview.recruiter?.name || companyName,
    organizerEmail: interview.recruiter?.email || 'no-reply@careerhub.com',
  })

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="interview-${interview._id}.ics"`)
  res.send(icsContent)
})

// @route   PUT /api/interviews/:id/cancel
// @access  Private
const cancelInterview = asyncHandler(async (req, res) => {
  const { reason = '' } = req.body
  const interview = await Interview.findById(req.params.id)
    .populate('recruiter', 'name email')
    .populate('candidate', 'name email')
    .populate('job', 'title')

  if (!interview) {
    res.status(404)
    throw new Error('Interview not found')
  }

  const isCandidate = String(interview.candidate._id) === String(req.user._id)
  const isRecruiter = String(interview.recruiter._id) === String(req.user._id)
  if (!isCandidate && !isRecruiter && req.user.role !== 'admin') {
    res.status(403)
    throw new Error('You do not have permission to cancel this interview')
  }

  interview.status = 'cancelled'
  interview.cancellationReason = reason
  await interview.save()

  // Notify other party
  const notifyTargetId = isCandidate ? interview.recruiter._id : interview.candidate._id
  const cancelledBy = isCandidate ? interview.candidate.name : interview.recruiter.name

  try {
    const notif = await Notification.create({
      user: notifyTargetId,
      type: 'status',
      message: `⚠️ Interview for "${interview.job?.title}" was cancelled by ${cancelledBy}. ${
        reason ? `Reason: ${reason}` : ''
      }`,
    })
    emitNotification(notifyTargetId, notif)
  } catch (err) {
    console.error('Error emitting cancellation notification:', err)
  }

  emitInterviewCancelled(notifyTargetId, interview)

  res.json({ success: true, message: 'Interview cancelled successfully', interview })
})

module.exports = {
  scheduleInterview,
  selectInterviewSlot,
  getInterviewByApplication,
  getMyInterviews,
  downloadICS,
  cancelInterview,
}
