import { useState } from 'react'
import {
  Calendar,
  Clock,
  Video,
  ExternalLink,
  Phone,
  MapPin,
  Sparkles,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import Modal from '../common/Modal.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import api from '../../services/api.js'

const DURATIONS = [
  { label: '15 mins', value: 15 },
  { label: '30 mins', value: 30 },
  { label: '45 mins', value: 45 },
  { label: '60 mins', value: 60 },
]

const MEETING_TYPES = [
  {
    id: 'video_careerhub',
    label: 'CareerHub Video Studio',
    desc: 'Built-in 1-to-1 WebRTC video, chat & scorecard',
    icon: Video,
  },
  {
    id: 'video_external',
    label: 'Google Meet / Zoom',
    desc: 'Provide an external video call link',
    icon: ExternalLink,
  },
  {
    id: 'phone',
    label: 'Phone Call',
    desc: 'Audio interview via candidate phone',
    icon: Phone,
  },
  {
    id: 'in_person',
    label: 'In-Person',
    desc: 'Onsite office interview',
    icon: MapPin,
  },
]

// Helper to get formatted local datetime string for input type="datetime-local"
function getDefaultDateTimeString(addDays = 1, hour = 11, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() + addDays)
  d.setHours(hour, minute, 0, 0)
  const offset = d.getTimezoneOffset()
  const localDate = new Date(d.getTime() - offset * 60 * 1000)
  return localDate.toISOString().slice(0, 16)
}

export default function ScheduleInterviewModal({
  isOpen,
  onClose,
  application,
  onScheduled,
}) {
  const { showToast } = useToast()

  const candidateName = application?.applicant?.name || 'Candidate'
  const jobTitle = application?.job?.title || 'Job'

  const [title, setTitle] = useState(`Technical Interview - ${jobTitle}`)
  const [type, setType] = useState('video_careerhub')
  const [duration, setDuration] = useState(45)
  const [mode, setMode] = useState('single') // 'single' | 'flexible'
  const [customLink, setCustomLink] = useState('')
  const [notes, setNotes] = useState(
    'Please join 5 minutes early with a stable internet connection and your code environment ready.'
  )

  // Single Slot Mode
  const [singleDateTime, setSingleDateTime] = useState(getDefaultDateTimeString(1, 14, 0))

  // Flexible Slots Mode (2-3 proposed options)
  const [flexibleSlots, setFlexibleSlots] = useState([
    getDefaultDateTimeString(1, 10, 0),
    getDefaultDateTimeString(1, 15, 0),
  ])

  const [submitting, setSubmitting] = useState(false)

  function addFlexibleSlot() {
    if (flexibleSlots.length >= 4) return
    const nextSlot = getDefaultDateTimeString(flexibleSlots.length + 1, 11, 0)
    setFlexibleSlots([...flexibleSlots, nextSlot])
  }

  function removeFlexibleSlot(index) {
    if (flexibleSlots.length <= 1) return
    setFlexibleSlots(flexibleSlots.filter((_, i) => i !== index))
  }

  function updateFlexibleSlot(index, val) {
    const updated = [...flexibleSlots]
    updated[index] = val
    setFlexibleSlots(updated)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) {
      showToast('Please provide an interview title', 'danger')
      return
    }

    setSubmitting(true)

    try {
      let payload = {
        applicationId: application._id,
        title: title.trim(),
        type,
        meetingLink: type === 'video_external' ? customLink.trim() : undefined,
        notes: notes.trim(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      }

      if (mode === 'single') {
        const start = new Date(singleDateTime)
        const end = new Date(start.getTime() + duration * 60 * 1000)
        payload.selectedSlot = {
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          durationMinutes: duration,
        }
      } else {
        const proposed = flexibleSlots.map((dt) => {
          const start = new Date(dt)
          const end = new Date(start.getTime() + duration * 60 * 1000)
          return {
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            durationMinutes: duration,
          }
        })
        payload.proposedSlots = proposed
      }

      const { data } = await api.post('/interviews/schedule', payload)

      showToast(
        mode === 'single'
          ? `🎉 Interview scheduled with ${candidateName}!`
          : `📬 Interview time slots sent to ${candidateName}!`,
        'success'
      )

      if (onScheduled) {
        onScheduled(data.interview)
      }
      onClose()
    } catch (err) {
      showToast(err.message || 'Failed to schedule interview', 'danger')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Candidate Interview" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Top Context Header */}
        <div className="rounded-lg border border-ink/10 bg-paper p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-ink-soft">Candidate</p>
            <p className="font-display text-sm font-bold text-ink">{candidateName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-soft">Target Position</p>
            <p className="font-display text-sm font-semibold text-ink">{jobTitle}</p>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-ink uppercase tracking-wide">
            Interview Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field mt-1.5 text-sm"
            placeholder="e.g. Technical Round 1 - Full Stack Assessment"
            required
          />
        </div>

        {/* Format & Location */}
        <div>
          <label className="block text-xs font-semibold text-ink uppercase tracking-wide mb-1.5">
            Interview Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {MEETING_TYPES.map((t) => {
              const Icon = t.icon
              const isSelected = type === t.id
              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-signal bg-signal/10 ring-1 ring-signal'
                      : 'border-ink/10 bg-white hover:border-ink/20'
                  }`}
                >
                  <div
                    className={`p-2 rounded-md ${
                      isSelected ? 'bg-signal text-ink' : 'bg-paper text-ink-soft'
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink">{t.label}</p>
                    <p className="text-[11px] text-ink-soft mt-0.5 leading-tight">{t.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* External Link Input if external */}
        {type === 'video_external' && (
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wide">
              Meeting URL (Google Meet / Zoom / Teams)
            </label>
            <input
              type="url"
              value={customLink}
              onChange={(e) => setCustomLink(e.target.value)}
              className="input-field mt-1.5 text-sm"
              placeholder="https://meet.google.com/abc-defg-hij"
              required
            />
          </div>
        )}

        {/* Duration Selection */}
        <div>
          <label className="block text-xs font-semibold text-ink uppercase tracking-wide mb-1.5">
            Duration
          </label>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button
                type="button"
                key={d.value}
                onClick={() => setDuration(d.value)}
                className={`badge py-1.5 px-3 border text-xs cursor-pointer ${
                  duration === d.value
                    ? 'border-signal bg-signal text-ink font-bold shadow-xs'
                    : 'border-ink/15 bg-white text-ink-soft hover:bg-paper'
                }`}
              >
                <Clock size={12} className="inline mr-1" />
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scheduling Mode Toggle */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-ink uppercase tracking-wide">
              Scheduling Mode
            </label>
            <div className="flex rounded-md border border-ink/10 p-0.5 bg-paper text-xs font-medium">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`px-3 py-1 rounded transition-colors ${
                  mode === 'single' ? 'bg-white text-ink shadow-xs font-bold' : 'text-ink-soft'
                }`}
              >
                Direct Confirmed Time
              </button>
              <button
                type="button"
                onClick={() => setMode('flexible')}
                className={`px-3 py-1 rounded transition-colors ${
                  mode === 'flexible' ? 'bg-white text-ink shadow-xs font-bold' : 'text-ink-soft'
                }`}
              >
                Offer Flexible Slots
              </button>
            </div>
          </div>

          {mode === 'single' ? (
            <div className="space-y-2">
              <input
                type="datetime-local"
                value={singleDateTime}
                onChange={(e) => setSingleDateTime(e.target.value)}
                className="input-field text-sm font-medium"
                required
              />
              <p className="text-[11px] text-ink-soft flex items-center gap-1">
                <Calendar size={12} />
                Selected time is in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs text-ink-soft">
                Candidate will be invited to select one of the following time slots:
              </p>
              {flexibleSlots.map((slot, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink-soft w-6">#{idx + 1}</span>
                  <input
                    type="datetime-local"
                    value={slot}
                    onChange={(e) => updateFlexibleSlot(idx, e.target.value)}
                    className="input-field text-sm font-medium flex-1"
                    required
                  />
                  {flexibleSlots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFlexibleSlot(idx)}
                      className="p-2 text-danger hover:bg-danger/10 rounded-md transition-colors"
                      title="Remove Slot"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              {flexibleSlots.length < 4 && (
                <button
                  type="button"
                  onClick={addFlexibleSlot}
                  className="btn-ghost inline-flex items-center gap-1.5 text-xs text-signal-dark hover:text-signal-dark font-semibold mt-1"
                >
                  <Plus size={14} /> Add Another Time Option
                </button>
              )}
            </div>
          )}
        </div>

        {/* Preparation Notes */}
        <div>
          <label className="block text-xs font-semibold text-ink uppercase tracking-wide">
            Candidate Notes / Preparation Guidelines
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input-field mt-1.5 text-xs"
            placeholder="e.g. Have your development environment ready, 45-minute live coding session."
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-ink/10">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="btn-secondary text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary inline-flex items-center gap-2 text-xs font-bold shadow-sm"
          >
            {submitting ? (
              'Scheduling Interview…'
            ) : mode === 'single' ? (
              <>
                <Calendar size={14} /> Confirm & Schedule Interview
              </>
            ) : (
              <>
                <Sparkles size={14} /> Send Time Slots to Candidate
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
