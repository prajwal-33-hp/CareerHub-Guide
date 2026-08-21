const mongoose = require('mongoose')

const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: { type: String, default: '' },
    excerpt: { type: String, default: '' },
    body: [{ type: String }],
    readTime: { type: String, default: '5 min read' },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Article', articleSchema)
