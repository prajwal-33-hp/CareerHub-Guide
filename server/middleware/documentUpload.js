const fs = require('fs')
const path = require('path')
const multer = require('multer')

const docsDir = path.join(__dirname, '..', 'uploads', 'documents')
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, docsDir)
  },
  filename(req, file, cb) {
    const fileExt = path.extname(file.originalname)
    const sanitizedOriginal = path.basename(file.originalname, fileExt).replace(/[^a-zA-Z0-9_-]/g, '_')
    const userId = req.user ? req.user._id : 'guest'
    cb(null, `doc-${userId}-${Date.now()}-${sanitizedOriginal}${fileExt}`)
  },
})

function fileFilter(req, file, cb) {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ]

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only PDF, JPG, PNG, and WEBP documents are allowed.'), false)
  }
}

const documentUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max limit
})

module.exports = documentUpload
