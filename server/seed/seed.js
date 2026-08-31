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

const rawCompanies = [
  { name: 'Northbeam Labs', logo: 'NB', industry: 'Fintech', location: 'Bengaluru', employees: '201-500', description: 'Northbeam Labs builds risk infrastructure for digital lenders across South Asia.' },
  { name: 'Verdant Systems', logo: 'VS', industry: 'Climate Tech', location: 'Pune', employees: '51-200', description: 'Verdant Systems designs IoT sensor networks for precision agriculture.' },
  { name: 'Cascade Health', logo: 'CH', industry: 'Healthtech', location: 'Hyderabad', employees: '501-1000', description: 'Cascade Health connects clinics to diagnostic labs through a unified patient record system.' },
  { name: 'Ledgerline', logo: 'LL', industry: 'SaaS', location: 'Remote', employees: '11-50', description: 'Ledgerline is an accounting automation platform for small businesses.' },
  { name: 'Ferrovia Retail', logo: 'FR', industry: 'E-commerce', location: 'Mumbai', employees: '1000+', description: 'Ferrovia Retail operates a marketplace connecting regional manufacturers to online buyers.' },
]

const rawArticles = [
  { title: 'How to Become a Full Stack Developer', category: 'Career Roadmap', readTime: '8 min read', excerpt: 'A practical roadmap covering the skills, projects, and order of learning that actually gets you hired.', body: ['Becoming a full stack developer is less about memorizing every framework and more about understanding how a request travels from a browser to a database and back.', 'A practical order that works for most people: HTML, CSS, and JavaScript fundamentals first, then a frontend framework like React, then a backend runtime like Node.js with Express, then a database.', 'The single highest-leverage thing you can do is build one complete project end to end and deploy it somewhere real.'] },
  { title: 'React Developer Roadmap', category: 'Frontend', readTime: '6 min read', excerpt: 'From JSX fundamentals to state management and performance -- what to learn and in what order.', body: ['Start with JSX and components -- understanding that a component is just a function that returns UI is the single most important mental model in React.', 'Once components and state feel natural, move to hooks: useState and useEffect cover the vast majority of real-world needs.', 'After the fundamentals, focus on routing, forms, and talking to APIs. Performance topics matter, but only after you have shipped something that works.'] },
  { title: 'How to Prepare for Technical Interviews', category: 'Interview Prep', readTime: '7 min read', excerpt: 'What interviewers are actually evaluating, and how to practice for it without burning out.', body: ['Technical interviews are rarely just testing whether you can solve a puzzle -- they are testing how you think out loud and communicate a plan.', 'A sustainable prep schedule beats a cramming binge.', 'Prepare specific stories for behavioral questions using a simple structure: situation, action, measurable result.'] },
]

async function seed() {
  await connectDB()
  const destroyOnly = process.argv.includes('--destroy')

  console.log('Clearing existing Users, Companies, Jobs, Articles...')
  await Promise.all([User.deleteMany({}), Company.deleteMany({}), Job.deleteMany({}), Article.deleteMany({})])

  if (destroyOnly) {
    console.log('Destroy complete.')
    process.exit(0)
  }

  console.log('Seeding admin + recruiter users...')
  const admin = await User.create({ name: 'Admin User', email: 'admin@careerhub.com', password: 'admin1234', role: 'admin' })
  const recruiterUsers = await User.create(
    rawCompanies.map((c, i) => ({
      name: `${c.name} Recruiter`,
      email: `recruiter${i + 1}@careerhub.com`,
      password: 'password123',
      role: 'recruiter',
      recruiterStatus: 'APPROVED',
      companyRole: 'OWNER',
      designation: 'Head of Talent Acquisition',
      department: 'Human Resources',
      isEmailVerified: true,
      isPhoneVerified: true,
    }))
  )

  console.log('Seeding a sample student...')
  await User.create({
    name: 'Test Student',
    email: 'student@careerhub.com',
    password: 'password123',
    role: 'student',
    recruiterStatus: 'NONE',
    about: 'Final-year Computer Science student interested in full-stack development.',
    skills: ['React', 'Node.js', 'MongoDB'],
  })

  console.log('Seeding companies...')
  const companies = await Company.create(
    rawCompanies.map((c, i) => ({
      ...c,
      slug: slugify(c.name),
      owner: recruiterUsers[i]._id,
      verified: true,
      status: 'verified',
      companyType: 'Private Limited',
      country: 'India',
      state: 'Karnataka',
      city: c.location === 'Remote' ? 'Bengaluru' : c.location,
      address: `100 Tech Boulevard, ${c.location}`,
      cin: `U72900KA2020PTC00000${i + 1}`,
      gstin: `29AAAAA0000A1Z${i + 1}`,
      domain: `${slugify(c.name)}.com`,
    }))
  )

  const CompanyMember = require('../models/CompanyMember')
  await CompanyMember.deleteMany({})
  await CompanyMember.create(
    companies.map((comp, idx) => ({
      company: comp._id,
      user: recruiterUsers[idx]._id,
      companyRole: 'OWNER',
      designation: 'Head of Talent Acquisition',
      department: 'Human Resources',
      workEmail: recruiterUsers[idx].email,
      status: 'active',
    }))
  )

  // Link company back to recruiter user
  for (let i = 0; i < recruiterUsers.length; i++) {
    await User.findByIdAndUpdate(recruiterUsers[i]._id, { company: companies[i]._id })
  }

  console.log('No dummy jobs seeded. Jobs will be posted manually by verified recruiters.')

  console.log('Seeding articles...')
  await Article.create(rawArticles.map((a) => ({ ...a, slug: slugify(a.title) })))

  console.log('\nSeed complete.')
  console.log('  Admin login:     admin@careerhub.com / admin1234')
  console.log('  Recruiter login: recruiter1@careerhub.com / password123')
  console.log('  Student login:   student@careerhub.com / password123')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
