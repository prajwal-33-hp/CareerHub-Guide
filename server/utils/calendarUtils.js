/**
 * Calendar Link & iCalendar (.ics) Generator Utility
 */

function formatIsoUtc(date) {
  const d = new Date(date)
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function cleanString(str = '') {
  return str.replace(/\r\n|\r|\n/g, '\\n').replace(/[,;]/g, (match) => `\\${match}`)
}

/**
 * Generate 1-Click Google Calendar Web URL
 */
function generateGoogleCalendarUrl({ title, description = '', location = '', startTime, endTime }) {
  const startStr = formatIsoUtc(startTime)
  const endStr = formatIsoUtc(endTime)

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'CareerHub Interview',
    dates: `${startStr}/${endStr}`,
    details: description,
    location: location,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Generate 1-Click Outlook Live / Office 365 Web URL
 */
function generateOutlookCalendarUrl({ title, description = '', location = '', startTime, endTime }) {
  const start = new Date(startTime).toISOString()
  const end = new Date(endTime).toISOString()

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: title || 'CareerHub Interview',
    startdt: start,
    enddt: end,
    body: description,
    location: location,
  })

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

/**
 * Generate RFC 5545 compliant .ics iCalendar file content
 */
function generateICSContent({
  title = 'CareerHub Interview',
  description = '',
  location = '',
  startTime,
  endTime,
  uid,
  organizerName = 'CareerHub Recruiter',
  organizerEmail = 'no-reply@careerhub.com',
}) {
  const nowStr = formatIsoUtc(new Date())
  const startStr = formatIsoUtc(startTime)
  const endStr = formatIsoUtc(endTime)
  const eventUid = uid || `interview_${Date.now()}@careerhub.com`

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CareerHub//Interview Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${eventUid}`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${cleanString(title)}`,
    `DESCRIPTION:${cleanString(description)}`,
    `LOCATION:${cleanString(location)}`,
    `ORGANIZER;CN=${cleanString(organizerName)}:mailto:${organizerEmail}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${cleanString(title)} starting in 15 minutes`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return icsLines.join('\r\n')
}

module.exports = {
  formatIsoUtc,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateICSContent,
}
