import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  Clock,
  Video,
  ExternalLink,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  CalendarPlus,
  Share2,
  XCircle,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import {
  formatInterviewDateTime,
  getTimeRemainingBadge,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  downloadICSFile,
} from '../../utils/calendarUtils.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import api from '../../services/api.js'

export default function InterviewScheduleCard({
  interview,
  onUpdated,
  compact = false,
}) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)
  const [selectingSlot, setSelectingSlot] = useState(false)
  const [chosenSlotId, setChosenSlotId] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  if (!interview) return null

  const isStudent = user?.role === 'student'
  const isRecruiter = user?.role === 'recruiter' || user?.role === 'admin'

  const activeSlot =
    interview.selectedSlot?.startTime
      ? interview.selectedSlot
      : interview.proposedSlots?.[0]

  const formatted = activeSlot?.startTime
    ? formatInterviewDateTime(activeSlot.startTime, activeSlot.durationMinutes || 45)
    : null

  const remainingBadge = activeSlot?.startTime
    ? getTimeRemainingBadge(activeSlot.startTime, activeSlot.durationMinutes || 45)
    : null

  const jobTitle = interview.job?.title || 'Job Role'
  const companyName = interview.job?.company?.name || 'Company'
  const roomUrl =
    interview.meetingLink ||
    `${window.location.origin}/interview/${interview.meetingRoomId || `room_${interview._id}`}`

  const eventTitle = `${interview.title || 'Technical Interview'} - ${jobTitle} (${companyName})`
  const eventDesc = `CareerHub Interview Session\nRole: ${jobTitle}\nCompany: ${companyName}\nFormat: ${
    interview.type === 'video_careerhub' ? 'CareerHub Live Video Studio' : interview.type
  }\nMeeting Link: ${roomUrl}\n\nNotes from recruiter:\n${interview.notes || 'Please be on time.'}`

  const googleUrl =
    interview.googleCalendarUrl ||
    (activeSlot?.startTime
      ? generateGoogleCalendarUrl({
          title: eventTitle,
          description: eventDesc,
          location: roomUrl,
          startTime: activeSlot.startTime,
          endTime: activeSlot.endTime,
        })
      : '#')

  const outlookUrl =
    interview.outlookCalendarUrl ||
    (activeSlot?.startTime
      ? generateOutlookCalendarUrl({
          title: eventTitle,
          description: eventDesc,
          location: roomUrl,
          startTime: activeSlot.startTime,
          endTime: activeSlot.endTime,
        })
      : '#')

  function handleCopyLink() {
    navigator.clipboard.writeText(roomUrl)
    setCopied(true)
    showToast('Meeting link copied to clipboard!', 'success')
    setTimeout(() => setCopied(false), 2500)
  }

  function handleDownloadICS() {
    if (!activeSlot?.startTime) return
    downloadICSFile({
      title: eventTitle,
      description: eventDesc,
      location: roomUrl,
      startTime: activeSlot.startTime,
      endTime: activeSlot.endTime,
      id: interview._id,
      organizerName: interview.recruiter?.name || companyName,
      organizerEmail: interview.recruiter?.email || 'no-reply@careerhub.com',
    })
    showToast('Downloaded .ics calendar invite!', 'success')
  }

  async function handleConfirmSlot(slot) {
    setSelectingSlot(true)
    try {
      const { data } = await api.post(`/interviews/${interview._id}/select-slot`, {
        slotId: slot._id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        durationMinutes: slot.durationMinutes,
      })
      showToast('🎉 Interview slot confirmed! Calendar invites ready.', 'success')
      if (onUpdated) onUpdated(data.interview)
    } catch (err) {
      showToast(err.message || 'Failed to select slot', 'danger')
    } finally {
      setSelectingSlot(false)
    }
  }

  async function handleCancelInterview() {
    setCancelling(true)
    try {
      const { data } = await api.put(`/interviews/${interview._id}/cancel`, {
        reason: cancelReason.trim(),
      })
      showToast('Interview was cancelled.', 'info')
      setShowCancelModal(false)
      if (onUpdated) onUpdated(data.interview)
    } catch (err) {
      showToast(err.message || 'Failed to cancel interview', 'danger')
    } finally {
      setCancelling(false)
    }
  }

  // State: Candidate Slot Picker Required
  if (interview.status === 'slots_offered' && isStudent) {
    return (
      <div className="rounded-xl border-2 border-signal/30 bg-amber-50/40 p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-signal/20 text-signal-dark">
            <Sparkles size={20} />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-ink">
                Select Your Interview Time Slot
              </h3>
              <span className="badge bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold">
                Action Required
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-soft">
              Recruiter offered {interview.proposedSlots?.length || 2} flexible options for{' '}
              <span className="font-semibold text-ink">{interview.title || 'Technical Interview'}</span>.
              Choose the one that best fits your schedule:
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {interview.proposedSlots?.map((slot, idx) => {
                const dt = formatInterviewDateTime(slot.startTime, slot.durationMinutes || 45)
                const isSelected = chosenSlotId === (slot._id || idx)
                return (
                  <button
                    type="button"
                    key={slot._id || idx}
                    onClick={() => setChosenSlotId(slot._id || idx)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-signal bg-white ring-2 ring-signal shadow-xs'
                        : 'border-ink/15 bg-white hover:border-ink/30'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                        <Calendar size={13} className="text-signal-dark" />
                        {dt.date}
                      </p>
                      <p className="text-[11px] text-ink-soft mt-0.5 flex items-center gap-1.5">
                        <Clock size={12} />
                        {dt.time}
                      </p>
                    </div>
                    <div
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-signal bg-signal' : 'border-ink/20'
                      }`}
                    >
                      {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-ink" />}
                    </div>
                  </button>
                )
              })}
            </div>

            {interview.notes && (
              <div className="mt-3 rounded-md bg-white border border-ink/10 p-2.5 text-xs text-ink-soft">
                <span className="font-semibold text-ink">Recruiter Note:</span> {interview.notes}
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={chosenSlotId === null || selectingSlot}
                onClick={() => {
                  const targetSlot = interview.proposedSlots.find(
                    (s, i) => (s._id || i) === chosenSlotId
                  )
                  if (targetSlot) handleConfirmSlot(targetSlot)
                }}
                className="btn-primary inline-flex items-center gap-2 text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {selectingSlot ? (
                  'Confirming Slot…'
                ) : (
                  <>
                    <CheckCircle2 size={15} /> Confirm Selected Time Slot
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // State: Recruiter waiting for student slot selection
  if (interview.status === 'slots_offered' && isRecruiter) {
    return (
      <div className="rounded-xl border border-ink/15 bg-paper p-4 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-signal-dark" />
            <span className="font-bold text-ink">{interview.title || 'Technical Interview'}</span>
          </div>
          <span className="badge bg-amber-50 text-amber-800 border-amber-200">
            Awaiting Candidate Selection
          </span>
        </div>
        <p className="mt-2 text-ink-soft">
          You offered {interview.proposedSlots?.length || 2} flexible time options to candidate. You
          will receive an automated real-time notification once confirmed.
        </p>
      </div>
    )
  }

  // State: Cancelled
  if (interview.status === 'cancelled') {
    return (
      <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-xs text-danger">
        <div className="flex items-center justify-between">
          <span className="font-bold flex items-center gap-1.5">
            <XCircle size={15} /> Interview Cancelled
          </span>
          <span className="badge bg-danger/15 text-danger font-semibold">Cancelled</span>
        </div>
        {interview.cancellationReason && (
          <p className="mt-1.5 text-danger/80">Reason: {interview.cancellationReason}</p>
        )}
      </div>
    )
  }

  // State: Confirmed & Scheduled Interview
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/10 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-base font-bold text-ink">
              {interview.title || 'Interview Session'}
            </span>
            {remainingBadge && (
              <span className={`badge border text-xs px-2.5 py-0.5 ${remainingBadge.color}`}>
                {remainingBadge.label}
              </span>
            )}
            <span className="badge bg-ink/5 text-ink-soft border-ink/10 text-xs">
              {interview.type === 'video_careerhub'
                ? '🎥 Live Video Studio'
                : interview.type === 'video_external'
                ? '🔗 External Video'
                : interview.type === 'phone'
                ? '📞 Phone Call'
                : '🏢 In-Person'}
            </span>
          </div>
          <p className="text-xs text-ink-soft mt-1">
            {jobTitle} • {companyName}
          </p>
        </div>

        {/* Action: Direct Join Video Room */}
        {interview.type === 'video_careerhub' ? (
          <Link
            to={`/interview/${interview.meetingRoomId || `room_${interview._id}`}${
              isStudent
                ? `?role=student&recruiter=${encodeURIComponent(interview.recruiter?.name || 'Recruiter')}&job=${encodeURIComponent(jobTitle)}`
                : `?role=recruiter&candidate=${encodeURIComponent(interview.candidate?.name || 'Student')}&job=${encodeURIComponent(jobTitle)}`
            }`}
            className="btn-primary inline-flex items-center gap-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Video size={15} /> Join Live Video Room
          </Link>
        ) : (
          <a
            href={roomUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary inline-flex items-center gap-2 text-xs font-bold"
          >
            <ExternalLink size={14} /> Open Meeting Link
          </a>
        )}
      </div>

      {/* Date & Time Highlights */}
      {formatted && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-paper rounded-lg p-3.5 border border-ink/5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white border border-ink/10 flex items-center justify-center text-signal-dark shadow-2xs">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide font-semibold text-ink-soft">
                Interview Date
              </p>
              <p className="text-xs font-bold text-ink">{formatted.date}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white border border-ink/10 flex items-center justify-center text-signal-dark shadow-2xs">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide font-semibold text-ink-soft">
                Scheduled Time ({activeSlot.durationMinutes || 45} mins)
              </p>
              <p className="text-xs font-bold text-ink">{formatted.time}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recruiter Notes */}
      {interview.notes && (
        <div className="mt-3 rounded-lg border border-ink/5 bg-slate-50/60 p-3 text-xs text-ink-soft">
          <span className="font-semibold text-ink">Instructions & Notes:</span> {interview.notes}
        </div>
      )}

      {/* 1-Click Calendar Add Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-ink/10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-soft flex items-center gap-1 mr-1">
            <CalendarPlus size={14} /> Add to Calendar:
          </span>

          {/* Google Calendar Link */}
          <a
            href={googleUrl}
            target="_blank"
            rel="noreferrer"
            className="badge py-1.5 px-2.5 bg-white border border-ink/15 hover:border-signal text-ink font-semibold text-xs transition-colors inline-flex items-center gap-1.5 shadow-2xs"
            title="Add event directly to your Google Calendar"
          >
            <span className="text-blue-600 font-black">G</span> Google Calendar
          </a>

          {/* Outlook Calendar Link */}
          <a
            href={outlookUrl}
            target="_blank"
            rel="noreferrer"
            className="badge py-1.5 px-2.5 bg-white border border-ink/15 hover:border-signal text-ink font-semibold text-xs transition-colors inline-flex items-center gap-1.5 shadow-2xs"
            title="Add event directly to Outlook / Office 365"
          >
            <span className="text-sky-600 font-bold">O</span> Outlook
          </a>

          {/* Download .ICS File */}
          <button
            type="button"
            onClick={handleDownloadICS}
            className="badge py-1.5 px-2.5 bg-white border border-ink/15 hover:border-signal text-ink font-semibold text-xs transition-colors inline-flex items-center gap-1.5 shadow-2xs"
            title="Download .ics file for Apple Calendar, Outlook Desktop, or others"
          >
            <Download size={13} className="text-ink-soft" /> Download .ics
          </button>
        </div>

        {/* Auxiliary actions: Copy link & Cancel */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="btn-ghost inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink"
            title="Copy Video Room URL"
          >
            {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy Link'}
          </button>

          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="btn-ghost text-xs text-danger/80 hover:text-danger hover:bg-danger/10"
          >
            Cancel Interview
          </button>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl border border-ink/10">
            <h4 className="font-display text-base font-bold text-ink">Cancel Interview</h4>
            <p className="mt-1 text-xs text-ink-soft">
              Are you sure you want to cancel this interview? Both parties will be notified.
            </p>
            <textarea
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation (optional)"
              className="input-field mt-3 text-xs"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="btn-secondary text-xs"
              >
                Keep Interview
              </button>
              <button
                type="button"
                onClick={handleCancelInterview}
                disabled={cancelling}
                className="btn-primary bg-danger text-white hover:bg-danger/90 text-xs font-bold"
              >
                {cancelling ? 'Cancelling…' : 'Yes, Cancel Interview'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
