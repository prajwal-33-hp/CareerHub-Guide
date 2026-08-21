const asyncHandler = require('../utils/asyncHandler')
const Bookmark = require('../models/Bookmark')
const Job = require('../models/Job')

// @route   GET /api/bookmarks
// @access  Private (student)
const getMyBookmarks = asyncHandler(async (req, res) => {
  const bookmarks = await Bookmark.find({ user: req.user._id }).populate({
    path: 'job',
    populate: { path: 'company', select: 'name slug logo' },
  })
  res.json({ bookmarks })
})

// @route   POST /api/jobs/:id/bookmark
// @access  Private (student)
const addBookmark = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id)
  if (!job) {
    res.status(404)
    throw new Error('Job not found')
  }

  const bookmark = await Bookmark.findOneAndUpdate(
    { user: req.user._id, job: job._id },
    { user: req.user._id, job: job._id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate({
    path: 'job',
    populate: { path: 'company', select: 'name slug logo' },
  })

  res.status(201).json({ bookmark })
})

// @route   DELETE /api/jobs/:id/bookmark
// @access  Private (student)
const removeBookmark = asyncHandler(async (req, res) => {
  await Bookmark.findOneAndDelete({ user: req.user._id, job: req.params.id })
  res.json({ message: 'Bookmark removed' })
})

module.exports = { getMyBookmarks, addBookmark, removeBookmark }
