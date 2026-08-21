const fs = require('fs')
const path = require('path')
const multer = require('multer')

const uploadDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir)
  },
  filename(req, file, cb) {
    const fileExt = path.extname(file.originalname)
    cb(null, `profile-${req.user._id}-${Date.now()}${fileExt}`)
  },
})

function fileFilter(req, file, cb) {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('Only image files are allowed'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
})

module.exports = upload
