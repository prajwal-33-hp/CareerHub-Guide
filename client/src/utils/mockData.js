export const companies = [
  { id: 'c1', name: 'Northbeam Labs', slug: 'northbeam-labs', logo: 'NB', industry: 'Fintech', location: 'Bengaluru', employees: '201-500', description: 'Northbeam Labs builds risk infrastructure for digital lenders across South Asia.' },
  { id: 'c2', name: 'Verdant Systems', slug: 'verdant-systems', logo: 'VS', industry: 'Climate Tech', location: 'Pune', employees: '51-200', description: 'Verdant Systems designs IoT sensor networks for precision agriculture.' },
  { id: 'c3', name: 'Cascade Health', slug: 'cascade-health', logo: 'CH', industry: 'Healthtech', location: 'Hyderabad', employees: '501-1000', description: 'Cascade Health connects clinics to diagnostic labs through a unified patient record system.' },
  { id: 'c4', name: 'Ledgerline', slug: 'ledgerline', logo: 'LL', industry: 'SaaS', location: 'Remote', employees: '11-50', description: 'Ledgerline is an accounting automation platform for small businesses.' },
  { id: 'c5', name: 'Ferrovia Retail', slug: 'ferrovia-retail', logo: 'FR', industry: 'E-commerce', location: 'Mumbai', employees: '1000+', description: 'Ferrovia Retail operates a marketplace connecting regional manufacturers to online buyers.' },
]

export const jobs = [
  {
    id: 'j1', slug: 'react-developer-bangalore', title: 'React Developer', companyId: 'c1',
    location: 'Bengaluru', workMode: 'Hybrid', jobType: 'Full Time', experience: '1-3 yrs',
    salary: '₹8L - ₹14L', skills: ['React', 'TypeScript', 'Redux', 'Tailwind CSS'],
    postedDate: '2026-08-04', deadline: '2026-09-15',
    description: 'Northbeam Labs is looking for a React Developer to build the dashboards our lending partners use to review credit risk in real time.',
    responsibilities: ['Build and maintain React components for the risk dashboard', 'Collaborate with backend engineers on API contracts', 'Optimize rendering performance for data-dense views', 'Write unit and integration tests'],
    requirements: ['1-3 years of experience with React', 'Strong understanding of state management patterns', 'Comfort with REST APIs and async data', 'Familiarity with TypeScript is a plus'],
    benefits: ['Health insurance for you and dependents', 'Annual learning stipend', 'Hybrid work with 2 office days/week', 'ESOPs'],
  },
  {
    id: 'j2', slug: 'backend-engineer-node-pune', title: 'Backend Engineer (Node.js)', companyId: 'c2',
    location: 'Pune', workMode: 'On-site', jobType: 'Full Time', experience: '2-4 yrs',
    salary: '₹10L - ₹16L', skills: ['Node.js', 'Express', 'MongoDB', 'AWS'],
    postedDate: '2026-08-01', deadline: '2026-09-10',
    description: 'Verdant Systems needs a backend engineer to scale the ingestion pipeline that processes sensor readings from farms across the country.',
    responsibilities: ['Design REST APIs for the sensor ingestion pipeline', 'Optimize MongoDB queries at scale', 'Set up monitoring and alerting', 'Mentor junior engineers'],
    requirements: ['2+ years with Node.js and Express', 'Experience with MongoDB or another document store', 'Understanding of message queues', 'Exposure to AWS or GCP'],
    benefits: ['Provident fund matching', 'On-site meals', 'Relocation assistance', 'Quarterly team offsites'],
  },
  {
    id: 'j3', slug: 'fullstack-developer-remote', title: 'Full Stack Developer', companyId: 'c4',
    location: 'Remote', workMode: 'Remote', jobType: 'Full Time', experience: '2-5 yrs',
    salary: '₹12L - ₹20L', skills: ['React', 'Node.js', 'PostgreSQL', 'Docker'],
    postedDate: '2026-07-28', deadline: '2026-09-01',
    description: 'Ledgerline is hiring a full stack developer to own features end-to-end across our accounting automation product.',
    responsibilities: ['Ship features across the full stack', 'Review pull requests', 'Participate in on-call rotation', 'Work directly with customers on feedback'],
    requirements: ['2+ years shipping production full stack applications', 'Comfort with SQL databases', 'Experience with containerized deployments', 'Excellent written communication for async work'],
    benefits: ['Fully remote', 'Flexible hours', 'Home office stipend', 'Unlimited PTO'],
  },
  {
    id: 'j4', slug: 'frontend-intern-hyderabad', title: 'Frontend Developer Intern', companyId: 'c3',
    location: 'Hyderabad', workMode: 'On-site', jobType: 'Internship', experience: '0-1 yrs',
    salary: '₹25,000/mo', skills: ['React', 'JavaScript', 'CSS'],
    postedDate: '2026-08-06', deadline: '2026-08-30',
    description: 'Cascade Health is offering a 6-month internship for students who want hands-on experience building patient-facing interfaces.',
    responsibilities: ['Build UI components under senior engineer guidance', 'Fix bugs from the QA backlog', 'Write documentation for components you build'],
    requirements: ['Final year student or recent graduate', 'Basic knowledge of React and JavaScript', 'Eagerness to learn'],
    benefits: ['Stipend', 'Certificate of completion', 'Pre-placement offer for top performers'],
  },
  {
    id: 'j5', slug: 'devops-engineer-mumbai', title: 'DevOps Engineer', companyId: 'c5',
    location: 'Mumbai', workMode: 'Hybrid', jobType: 'Full Time', experience: '3-6 yrs',
    salary: '₹15L - ₹24L', skills: ['Kubernetes', 'Docker', 'CI/CD', 'AWS'],
    postedDate: '2026-07-20', deadline: '2026-08-25',
    description: 'Ferrovia Retail is scaling its marketplace infrastructure and needs a DevOps engineer to own our Kubernetes clusters.',
    responsibilities: ['Manage Kubernetes clusters across environments', 'Build and maintain CI/CD pipelines', 'Own incident response for infrastructure', 'Drive cost optimization initiatives'],
    requirements: ['3+ years in a DevOps or SRE role', 'Deep knowledge of Kubernetes and Docker', 'Experience with Terraform', 'On-call availability'],
    benefits: ['Health insurance', 'Performance bonus', 'Hybrid work model', 'Learning budget'],
  },
  {
    id: 'j6', slug: 'python-developer-internship-remote', title: 'Python Developer Intern', companyId: 'c1',
    location: 'Remote', workMode: 'Remote', jobType: 'Internship', experience: '0-1 yrs',
    salary: '₹20,000/mo', skills: ['Python', 'Django', 'SQL'],
    postedDate: '2026-08-08', deadline: '2026-09-05',
    description: 'Northbeam Labs is hiring a Python intern to support our data engineering team with ETL pipeline work.',
    responsibilities: ['Write scripts to clean and transform data', 'Support the data team with ad-hoc analysis', 'Document pipeline logic'],
    requirements: ['Coursework or projects using Python', 'Basic SQL knowledge', 'Currently pursuing a degree in CS or related field'],
    benefits: ['Stipend', 'Mentorship from senior data engineers', 'Flexible remote schedule'],
  },
]

export const skills = ['React', 'Node.js', 'Python', 'Java', 'TypeScript', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes', 'Django', 'Express']

export const categories = [
  { name: 'Software Development', count: 482 },
  { name: 'Data Science', count: 156 },
  { name: 'Design', count: 98 },
  { name: 'DevOps & Cloud', count: 121 },
  { name: 'Product Management', count: 74 },
  { name: 'Marketing', count: 63 },
]

export const stats = [
  { label: 'Live job postings', value: '2,400+' },
  { label: 'Companies hiring', value: '380+' },
  { label: 'Students placed', value: '11,200+' },
  { label: 'Avg. time to first interview', value: '6 days' },
]

export const articles = [
  { id: 'a1', slug: 'how-to-become-a-full-stack-developer', title: 'How to Become a Full Stack Developer', excerpt: 'A practical roadmap covering the skills, projects, and order of learning that actually gets you hired.' },
  { id: 'a2', slug: 'react-developer-roadmap', title: 'React Developer Roadmap', excerpt: 'From JSX fundamentals to state management and performance — what to learn and in what order.' },
  { id: 'a3', slug: 'how-to-prepare-for-technical-interviews', title: 'How to Prepare for Technical Interviews', excerpt: 'What interviewers are actually evaluating, and how to practice for it without burning out.' },
]

export function getCompanyById(id) {
  return companies.find((c) => c.id === id)
}
