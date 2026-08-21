import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AllProviders } from '../test/testUtils.jsx'
import Skills from './Skills.jsx'
import api from '../services/api.js'

vi.mock('../services/api.js', () => ({
  default: {
    get: vi.fn(),
  },
}))

describe('Skills page', () => {
  const mockJobs = [
    { _id: '1', skills: ['React', 'Node.js'] },
    { _id: '2', skills: ['React', 'MongoDB'] },
  ]

  beforeEach(() => {
    api.get.mockResolvedValue({ data: { jobs: mockJobs } })
  })

  it('renders a link for every skill from the backend', async () => {
    render(<Skills />, { wrapper: AllProviders })

    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('Node.js')).toBeInTheDocument()
      expect(screen.getByText('MongoDB')).toBeInTheDocument()
    })
  })

  it('links each skill to the filtered jobs page', async () => {
    render(<Skills />, { wrapper: AllProviders })

    await waitFor(() => {
      const firstSkillLink = screen.getByText('React').closest('a')
      expect(firstSkillLink).toHaveAttribute('href', expect.stringContaining('/jobs?skill='))
    })
  })
})
