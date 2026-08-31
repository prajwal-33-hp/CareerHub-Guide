// Seeds the database with data that mirrors client/src/utils/mockData.js and
// contentData.js, so the app looks identical whether it's reading from mock
// data (frontend-only) or the real API (once wired up).
//
// Usage:
//   npm run seed           -- wipes relevant collections and inserts fresh data
//   npm run seed:destroy   -- wipes relevant collections only

const path = require('path')
const dotenv = require('dotenv')
dotenv.config({ path: path.join(__dirname, '../.env') })

const connectDB = require('../config/db')
const slugify = require('../utils/slugify')

const User = require('../models/User')
const Company = require('../models/Company')
const Job = require('../models/Job')
const Article = require('../models/Article')

const rawArticles = [
  { title: 'How to Become a Full Stack Developer', category: 'Career Roadmap', readTime: '8 min read', excerpt: 'A practical roadmap covering the skills, projects, and order of learning that actually gets you hired.', body: ['Becoming a full stack developer is less about memorizing every framework and more about understanding how a request travels from a browser to a database and back.', 'A practical order that works for most people: HTML, CSS, and JavaScript fundamentals first, then a frontend framework like React, then a backend runtime like Node.js with Express, then a database.', 'The single highest-leverage thing you can do is build one complete project end to end and deploy it somewhere real.'] },
  { title: 'React Developer Roadmap', category: 'Frontend', readTime: '6 min read', excerpt: 'From JSX fundamentals to state management and performance -- what to learn and in what order.', body: ['Start with JSX and components -- understanding that a component is just a function that returns UI is the single most important mental model in React.', 'Once components and state feel natural, move to hooks: useState and useEffect cover the vast majority of real-world needs.', 'After the fundamentals, focus on routing, forms, and talking to APIs. Performance topics matter, but only after you have shipped something that works.'] },
  { title: 'How to Prepare for Technical Interviews', category: 'Interview Prep', readTime: '7 min read', excerpt: 'What interviewers are actually evaluating, and how to practice for it without burning out.', body: ['Technical interviews are rarely just testing whether you can solve a puzzle -- they are testing how you think out loud and communicate a plan.', 'A sustainable prep schedule beats a cramming binge.', 'Prepare specific stories for behavioral questions using a simple structure: situation, action, measurable result.'] },
]

async function seed() {
  await connectDB()
  const destroyOnly = process.argv.includes('--destroy')

  console.log('Clearing existing Articles...')
  await Article.deleteMany({})

  if (destroyOnly) {
    console.log('Destroy complete.')
    process.exit(0)
  }

  console.log('Seeding articles...')
  await Article.create(rawArticles.map((a) => ({ ...a, slug: slugify(a.title) })))

  console.log('\nSeed complete. Educational resources initialized.')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
