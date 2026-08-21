import { describe, it, expect } from 'vitest'
import { jobs, companies, getCompanyById } from './mockData.js'

describe('mockData', () => {
  it('every job references a company that actually exists', () => {
    for (const job of jobs) {
      const company = getCompanyById(job.companyId)
      expect(company, `Job "${job.title}" references missing company ${job.companyId}`).toBeDefined()
    }
  })

  it('every job has a unique slug (required for routing)', () => {
    const slugs = jobs.map((j) => j.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('getCompanyById returns undefined for an unknown id', () => {
    expect(getCompanyById('does-not-exist')).toBeUndefined()
  })

  it('every company has a non-empty name and slug', () => {
    for (const c of companies) {
      expect(c.name).toBeTruthy()
      expect(c.slug).toBeTruthy()
    }
  })
})
