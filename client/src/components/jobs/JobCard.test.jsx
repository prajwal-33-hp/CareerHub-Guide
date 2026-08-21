import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AllProviders } from '../../test/testUtils.jsx'
import JobCard from './JobCard.jsx'
import { jobs } from '../../utils/mockData.js'

const sampleJob = jobs[0]

describe('JobCard', () => {
  it('renders the job title, job type, and salary', () => {
    render(<JobCard job={sampleJob} />, { wrapper: AllProviders })
    expect(screen.getByText(sampleJob.title)).toBeInTheDocument()
    expect(screen.getByText(sampleJob.jobType)).toBeInTheDocument()
    expect(screen.getByText(sampleJob.salary)).toBeInTheDocument()
  })

  it('links to the job details page using the job slug', () => {
    render(<JobCard job={sampleJob} />, { wrapper: AllProviders })
    const link = screen.getByRole('link', { name: new RegExp(sampleJob.title) })
    expect(link).toHaveAttribute('href', `/jobs/${sampleJob.slug}`)
  })

  it('toggles the saved state when the bookmark button is clicked', async () => {
    const user = userEvent.setup()
    render(<JobCard job={sampleJob} />, { wrapper: AllProviders })

    const saveButton = screen.getByRole('button', { name: /save job/i })
    await user.click(saveButton)

    expect(screen.getByRole('button', { name: /remove from saved jobs/i })).toBeInTheDocument()
  })
})
