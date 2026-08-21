import { Helmet } from 'react-helmet-async'
import Hero from '../components/home/Hero.jsx'
import PopularCategories from '../components/home/PopularCategories.jsx'
import FeaturedCompanies from '../components/home/FeaturedCompanies.jsx'
import LatestJobs from '../components/home/LatestJobs.jsx'
import Stats from '../components/home/Stats.jsx'
import CTA from '../components/home/CTA.jsx'

export default function Home() {
  return (
    <>
      <Helmet>
        <title>CareerHub | Find Jobs & Internships</title>
        <meta
          name="description"
          content="Discover jobs and internships that match your skills and career goals. Browse thousands of open roles from vetted companies."
        />
      </Helmet>
      <Hero />
      <PopularCategories />
      <FeaturedCompanies />
      <LatestJobs type="Full Time" title="Latest Jobs" viewAllTo="/jobs" />
      <Stats />
      <LatestJobs type="Internship" title="Latest Internships" viewAllTo="/internships" />
      <CTA />
    </>
  )
}
