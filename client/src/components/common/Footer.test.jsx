import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Footer from './Footer.jsx'

describe('Footer', () => {
  it('renders valid social links with target="_blank" and rel="noopener noreferrer"', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    )

    const twitterLink = screen.getByRole('link', { name: /twitter/i })
    expect(twitterLink).toHaveAttribute('href', 'https://twitter.com')
    expect(twitterLink).toHaveAttribute('target', '_blank')
    expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer')

    const linkedinLink = screen.getByRole('link', { name: /linkedin/i })
    expect(linkedinLink).toHaveAttribute('href', 'https://linkedin.com')
    expect(linkedinLink).toHaveAttribute('target', '_blank')
    expect(linkedinLink).toHaveAttribute('rel', 'noopener noreferrer')

    const githubLink = screen.getByRole('link', { name: /github/i })
    expect(githubLink).toHaveAttribute('href', 'https://github.com')
    expect(githubLink).toHaveAttribute('target', '_blank')
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
