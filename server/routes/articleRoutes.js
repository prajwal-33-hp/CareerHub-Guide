const express = require('express')
const router = express.Router()
const {
  getArticles,
  getArticleBySlug,
  createArticle,
} = require('../controllers/articleController')
const { protect, authorize } = require('../middleware/auth')

router.route('/').get(getArticles).post(protect, authorize('admin'), createArticle)
router.route('/:slug').get(getArticleBySlug)

module.exports = router
