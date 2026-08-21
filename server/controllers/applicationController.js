const asyncHandler = require('../utils/asyncHandler')
const Application = require('../models/Application')
const Job = require('../models/Job')
const User = require('../models/User')
const Notification = require('../models/Notification')
const { emitNotification, emitApplicationStatus } = require('../utils/socket')

// @route   POST /api/jobs/:id/apply
// @access  Private (student)
const applyToJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id)
  if (!job) {
    res.status(404)
    throw new Error('Job not found')
  }

  // Prevent recruiters and admins from applying
  if (req.user.role === 'recruiter' || req.user.role === 'admin') {
    res.status(403)
    throw new Error('Recruiter and Admin accounts cannot apply for jobs or internships.')
  }

  // Prevent applying to own job posting
  if (String(job.postedBy) === String(req.user._id)) {
    res.status(403)
    throw new Error('You cannot apply to jobs or internships created by yourself.')
  }

  // Check if job is closed
  if (job.status === 'closed') {
    res.status(400)
    throw new Error('This job posting is closed and no longer accepting applications.')
  }

  // Check if deadline has passed
  if (job.deadline && new Date() > new Date(job.deadline)) {
    job.status = 'closed'
    await job.save()
    res.status(400)
    throw new Error('The application deadline for this job has expired. Applications are closed.')
  }

  const existing = await Application.findOne({ job: job._id, applicant: req.user._id })
  if (existing) {
    res.status(400)
    throw new Error('You have already applied to this job')
  }

  const application = await Application.create({ job: job._id, applicant: req.user._id })

  // Notify the recruiter who posted the job
  if (job.postedBy) {
    try {
      const notif = await Notification.create({
        user: job.postedBy,
        type: 'job',
        message: `${req.user.name} applied for "${job.title}".`,
      })
      emitNotification(job.postedBy, notif)
    } catch (err) {
      console.error('Error creating recruiter application notification:', err)
    }
  }

  res.status(201).json({ application })
})

// @route   GET /api/applications
// @access  Private (student) -- returns the logged-in student's own applications
const getMyApplications = asyncHandler(async (req, res) => {
  const applications = await Application.find({ applicant: req.user._id })
    .populate({ path: 'job', populate: { path: 'company', select: 'name slug logo' } })
    .sort('-createdAt')

  res.json({ applications })
})

// @route   GET /api/applications/recruiter
// @access  Private (recruiter) -- returns all applications for jobs owned by the logged-in recruiter
const getApplicationsForRecruiter = asyncHandler(async (req, res) => {
  const jobs = await Job.find({ postedBy: req.user._id }).select('_id')
  const jobIds = jobs.map((job) => job._id)

  const applications = await Application.find({ job: { $in: jobIds } })
    .populate('applicant', 'name email skills about education projects resumeUrl photoUrl')
    .populate({ path: 'job', populate: { path: 'company', select: 'name slug logo' } })
    .sort('-createdAt')

  res.json({ applications })
})

// @route   GET /api/applications/job/:jobId
// @access  Private (recruiter who owns the job, or admin) -- the applicant list
// the frontend's Applicants.jsx page needs
const getApplicantsForJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.jobId)
  if (!job) {
    res.status(404)
    throw new Error('Job not found')
  }
  if (req.user.role !== 'admin' && String(job.postedBy) !== String(req.user._id)) {
    res.status(403)
    throw new Error('You do not have permission to view applicants for this job')
  }

  const applications = await Application.find({ job: job._id })
    .populate('applicant', 'name email skills about education projects resumeUrl photoUrl')
    .sort('-createdAt')

  res.json({ applications })
})

// @route   GET /api/applications/:id
// @access  Private (the applicant themself, the recruiter who owns the job, or admin)
const getApplicationById = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id)
    .populate('applicant', 'name email skills about education projects resumeUrl phone')
    .populate({ path: 'job', populate: { path: 'company', select: 'name slug logo location' } })

  if (!application) {
    res.status(404)
    throw new Error('Application not found')
  }

  const isOwner = String(application.applicant._id) === String(req.user._id)
  const isJobPoster = String(application.job.postedBy) === String(req.user._id)
  if (!isOwner && !isJobPoster && req.user.role !== 'admin') {
    res.status(403)
    throw new Error('You do not have permission to view this application')
  }

  // Increment student profile views if viewed by a recruiter (strictly unique per viewer)
  if (!isOwner && (req.user.role === 'recruiter' || req.user.role === 'admin')) {
    try {
      const alreadyViewed = await User.findOne({
        _id: application.applicant._id,
        'viewedBy.user': req.user._id,
      })

      if (!alreadyViewed) {
        await User.findByIdAndUpdate(application.applicant._id, {
          $inc: { profileViews: 1 },
          $push: {
            viewedBy: {
              user: req.user._id,
              viewedAt: new Date(),
            },
          },
        })

        // Send real-time notification to the student
        try {
          const viewerName = req.user.name || 'A recruiter'
          const jobTitle = application.job?.title || 'your application'
          const notif = await Notification.create({
            user: application.applicant._id,
            type: 'view',
            message: `👀 Recruiter ${viewerName} reviewed your application & profile for "${jobTitle}".`,
          })
          emitNotification(application.applicant._id, notif)
        } catch (notifErr) {
          console.error('Notification error on application review:', notifErr.message)
        }
      }
    } catch (viewErr) {
      console.error('Error tracking profile view:', viewErr.message)
    }
  }

  res.json({ application })
})

// @route   PUT /api/applications/:id/status
// @access  Private (recruiter who owns the job, or admin)
const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body
  const validStatuses = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected']
  if (!validStatuses.includes(status)) {
    res.status(400)
    throw new Error(`Status must be one of: ${validStatuses.join(', ')}`)
  }

  const application = await Application.findById(req.params.id).populate('job')
  if (!application) {
    res.status(404)
    throw new Error('Application not found')
  }

  if (req.user.role !== 'admin' && String(application.job.postedBy) !== String(req.user._id)) {
    res.status(403)
    throw new Error('You do not have permission to update this application')
  }

  application.status = status
  await application.save()

  // Notify the student -- mirrors the mock notifications already in the frontend
  try {
    const notif = await Notification.create({
      user: application.applicant,
      type: 'status',
      message: `Your application for ${application.job.title} moved to ${status}.`,
    })
    emitNotification(application.applicant, notif)
    emitApplicationStatus(application.applicant, application)
  } catch (err) {
    console.error('Error emitting status notification:', err)
  }

  res.json({ application })
})

module.exports = {
  applyToJob,
  getMyApplications,
  getApplicationsForRecruiter,
  getApplicantsForJob,
  getApplicationById,
  updateApplicationStatus,
}
