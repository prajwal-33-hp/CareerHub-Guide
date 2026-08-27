import { describe, it, expect } from 'vitest'
import {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  formatInterviewDateTime,
  getTimeRemainingBadge,
} from './calendarUtils.js'

describe('calendarUtils', () => {
  const startTime = '2026-09-01T10:00:00.000Z'
  const endTime = '2026-09-01T10:45:00.000Z'

  it('generates valid Google Calendar URL with correct parameters', () => {
    const url = generateGoogleCalendarUrl({
      title: 'Technical Round 1',
      description: 'React & Node assessment',
      location: 'https://careerhub.com/interview/room123',
      startTime,
      endTime,
    })

    expect(url).toContain('calendar.google.com/calendar/render')
    expect(url).toContain('action=TEMPLATE')
    expect(url).toContain('Technical+Round+1')
    expect(url).toContain('20260901T100000Z')
    expect(url).toContain('20260901T104500Z')
  })

  it('generates valid Outlook Calendar URL with ISO timestamps', () => {
    const url = generateOutlookCalendarUrl({
      title: 'System Design Interview',
      description: 'Distributed cache discussion',
      location: 'https://careerhub.com/interview/room456',
      startTime,
      endTime,
    })

    expect(url).toContain('outlook.live.com/calendar/0/deeplink/compose')
    expect(url).toContain('subject=System+Design+Interview')
    expect(url).toContain(encodeURIComponent('2026-09-01T10:00:00.000Z'))
  })

  it('formats interview date and time range properly', () => {
    const res = formatInterviewDateTime(startTime, 45)
    expect(res).toBeDefined()
    expect(res.date).toBeTruthy()
    expect(res.time).toContain('-')
  })

  it('calculates time remaining badge', () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    const badge = getTimeRemainingBadge(futureDate, 45)
    expect(badge).toBeDefined()
    expect(badge.label).toContain('days')
  })
})
