/**
 * Calendar Link & iCalendar (.ics) Client Utilities
 */

export function formatIsoUtc(date) {
  const d = new Date(date)
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function cleanString(str = '') {
  return str.replace(/\r\n|\r|\n/g, '\\n').replace(/[,;]/g, (match) => `\\${match}`)
}

export function generateGoogleCalendarUrl({ title, description = '', location = '', startTime, endTime }) {
  if (!startTime || !endTime) return '#'
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

export function generateOutlookCalendarUrl({ title, description = '', location = '', startTime, endTime }) {
  if (!startTime || !endTime) return '#'
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

export function downloadICSFile({
  title = 'CareerHub Interview',
  description = '',
  location = '',
  startTime,
  endTime,
  id,
  organizerName = 'CareerHub Recruiter',
  organizerEmail = 'no-reply@careerhub.com',
}) {
  if (!startTime || !endTime) return

  const nowStr = formatIsoUtc(new Date())
  const startStr = formatIsoUtc(startTime)
  const endStr = formatIsoUtc(endTime)
  const eventUid = id ? `interview_${id}@careerhub.com` : `interview_${Date.now()}@careerhub.com`

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
    `DESCRIPTION:Reminder: ${cleanString(title)} in 15 minutes`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `interview-${id || 'session'}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function formatInterviewDateTime(date, durationMinutes = 45) {
  if (!date) return ''
  const d = new Date(date)
  const dateFormatted = d.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timeFormatted = d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  const endTime = new Date(d.getTime() + durationMinutes * 60 * 1000)
  const endTimeFormatted = endTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return {
    date: dateFormatted,
    time: `${timeFormatted} - ${endTimeFormatted}`,
    full: `${dateFormatted} at ${timeFormatted}`,
  }
}

export function getTimeRemainingBadge(date, durationMinutes = 45) {
  if (!date) return null
  const now = Date.now()
  const start = new Date(date).getTime()
  const end = start + durationMinutes * 60 * 1000

  const diffMs = start - now

  if (now > end) {
    return { label: 'Completed', color: 'bg-slate-100 text-slate-600 border-slate-200' }
  }

  if (now >= start && now <= end) {
    return { label: '🔴 LIVE NOW', color: 'bg-emerald-500 text-white border-emerald-600 animate-pulse font-bold' }
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) {
    const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)))
    return { label: `Starts in ${diffMins}m`, color: 'bg-amber-500 text-white border-amber-600 animate-pulse font-semibold' }
  }

  if (diffHours < 24) {
    return { label: `In ${diffHours}h`, color: 'bg-blue-50 text-blue-700 border-blue-200 font-semibold' }
  }

  if (diffDays === 1) {
    return { label: 'Tomorrow', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold' }
  }

  return { label: `In ${diffDays} days`, color: 'bg-slate-50 text-slate-700 border-slate-200' }
}
