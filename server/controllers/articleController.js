const Article = require('../models/Article')
const asyncHandler = require('../utils/asyncHandler')
const slugify = require('../utils/slugify')

// @desc    Get all articles
// @route   GET /api/articles
// @access  Public
const getArticles = asyncHandler(async (req, res) => {
  const articles = await Article.find().sort({ createdAt: -1 })
  res.json({ success: true, count: articles.length, articles })
})

// @desc    Get single article by slug
// @route   GET /api/articles/:slug
// @access  Public
const getArticleBySlug = asyncHandler(async (req, res) => {
  const article = await Article.findOne({ slug: req.params.slug.toLowerCase() })
  if (!article) {
    res.status(404)
    throw new Error('Article not found')
  }
  res.json({ success: true, article })
})

// @desc    Create new article
// @route   POST /api/articles
// @access  Private (Admin)
const createArticle = asyncHandler(async (req, res) => {
  const { title, category, excerpt, body, readTime } = req.body
  if (!title) {
    res.status(400)
    throw new Error('Article title is required')
  }

  const slug = slugify(title)
  const article = await Article.create({
    title,
    slug,
    category: category || 'Career Advice',
    excerpt: excerpt || '',
    body: Array.isArray(body) ? body : [body || ''],
    readTime: readTime || '5 min read',
  })

  res.status(201).json({ success: true, article })
})

module.exports = {
  getArticles,
  getArticleBySlug,
  createArticle,
}
