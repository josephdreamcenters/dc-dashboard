import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

const TYPE_LABELS = { weekly: 'Weekly', quarterly: 'Quarterly', annual: 'Annual' }
const TYPE_COLORS = {
  weekly:    'bg-primary-100 text-primary-700',
  quarterly: 'bg-accent-100 text-accent-700',
  annual:    'bg-purple-100 text-purple-700',
}

function fmtDateTime(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function fmtDate(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function isUpcoming(ts) {
  return ts && new Date(ts) >= new Date(Date.now() - 60 * 60 * 1000)
}

// ── Schedule form ─────────────────────────────────────────────────────────────

function ScheduleForm({ users, onCreated, onCancel }) {
  const { user } = useAuth()
  const [title,    setTitle]    = useState('')
  const [type,     setType]     = useState('weekly')
  const [date,     setDate]     = useState('')
  const [time,     setTime]     = useState('09:00')
  const [teamId,   setTeamId]   = useState('')
  const [pids,     setPids]     = useState([user?.id].filter(Boolean))
  const [saving,   setSaving]   = useState(false)

  const teams = [...new Map(
    users.filter(u => u.team_id).map(u => [u.team_id, { id: u.team_id, name: u.team_name }])
  ).values()].sort((a, b) => a.name.localeCompare(b.name))

  const toggleParticipant = (id) =>
    setPids(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!date) return
    setSaving(true)
    try {
      const scheduled_date = new Date(`${date}T${time}:00`).toISOString()
      const { data } = await api.post('/meetings', {
        title: title || null,
        type,
        scheduled_date,
        team_id: teamId || null,
        participant_ids: pids,
      })
      onCreated(data)
      toast.success('Meeting scheduled')
    } catch {
      toast.error('Failed to schedule meeting')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 mb-5 border-l-4 border-l-primary-400">
      <h3 className="text-sm font-semibold text-warm-900 mb-4">Schedule a Meeting</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <input
          className="input"
          placeholder="Meeting title (optional)"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <select className="input" value={type} onChange={e => setType(e.target.value)}>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
        <input className="input" type="time" value={time} onChange={e => setTime(e.target.value)} />
        <select className="input" value={teamId} onChange={e => setTeamId(e.target.value)}>
          <option value="">No team</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* Participant selector */}
      <div className="mb-4">
        <p className="label mb-2">Participants</p>
        <div className="flex flex-wrap gap-2">
          {users.filter(u => u.active !== false).map(u => (
            <button
              key={u.id}
              type="button"
              onClick={() => toggleParticipant(u.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                pids.includes(u.id)
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-warm-300 text-warm-600 hover:border-primary-400'
              }`}
            >
              {u.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button className="btn-primary text-sm" type="submit" disabled={saving || !date}>
          {saving ? 'Scheduling…' : 'Schedule'}
        </button>
        <button className="btn-secondary text-sm" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// ── Meeting detail / notes panel ──────────────────────────────────────────────

function MeetingDetail({ meeting, onUpdate, onClose }) {
  const [notes,   setNotes]   = useState(meeting.notes ?? '')
  const [saving,  setSaving]  = useState(false)
  const [ending,  setEnding]  = useState(false)

  const saveNotes = async () => {
    setSaving(true)
    try {
      const { data } = await api.put(`/meetings/${meeting.id}`, { notes })
      onUpdate(data)
      toast.success('Notes saved')
    } catch {
      toast.error('Failed to save notes')
    } finally {
      setSaving(false)
    }
  }

  const endMeeting = async () => {
    if (!confirm('Mark this meeting as ended?')) return
    setEnding(true)
    try {
      const { data } = await api.post(`/meetings/${meeting.id}/end`, { notes })
      onUpdate(data)
      toast.success('Meeting ended')
    } catch {
      toast.error('Failed to end meeting')
    } finally {
      setEnding(false)
    }
  }

  const already_ended = !!meeting.ended_at

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-warm-100">
          <div>
            <h2 className="text-base font-semibold text-warm-900">
              {meeting.title || `${TYPE_LABELS[meeting.type] ?? meeting.type} Meeting`}
            </h2>
            <p className="text-xs text-warm-500 mt-0.5">{fmtDateTime(meeting.scheduled_date)}</p>
          </div>
          <button onClick={onClose} className="text-warm-400 hover:text-warm-700 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Meta */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded font-medium ${TYPE_COLORS[meeting.type] ?? ''}`}>
              {TYPE_LABELS[meeting.type] ?? meeting.type}
            </span>
            {meeting.team_name && (
              <span className="px-2 py-0.5 rounded bg-warm-100 text-warm-600">{meeting.team_name}</span>
            )}
            {already_ended && (
              <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">Ended {fmtDate(meeting.ended_at)}</span>
            )}
          </div>

          {/* Participants */}
          {meeting.participants?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1.5">Participants</p>
              <div className="flex flex-wrap gap-1.5">
                {meeting.participants.map(p => (
                  <span key={p.id} className="text-xs bg-warm-100 text-warm-700 px-2 py-0.5 rounded-full">{p.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1.5">Meeting Notes</p>
            {already_ended ? (
              <div className="bg-warm-50 rounded p-3 text-sm text-warm-700 whitespace-pre-wrap min-h-16">
                {meeting.notes || <span className="text-warm-300 italic">No notes recorded</span>}
              </div>
            ) : (
              <textarea
                className="input w-full h-40 resize-none text-sm"
                placeholder="Capture key discussion points, decisions made, and action items…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            )}
          </div>
        </div>

        {!already_ended && (
          <div className="flex gap-2 p-5 border-t border-warm-100">
            <button className="btn-primary text-sm" onClick={saveNotes} disabled={saving}>
              {saving ? 'Saving…' : 'Save Notes'}
            </button>
            <button
              className="text-sm px-4 py-1.5 rounded font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
              onClick={endMeeting}
              disabled={ending}
            >
              {ending ? 'Ending…' : 'End Meeting'}
            </button>
            <button className="btn-secondary text-sm ml-auto" onClick={onClose}>Close</button>
          </div>
        )}
        {already_ended && (
          <div className="p-5 border-t border-warm-100">
            <button className="btn-secondary text-sm" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── MeetingCard ───────────────────────────────────────────────────────────────

function MeetingCard({ meeting, onClick }) {
  const upcoming  = isUpcoming(meeting.scheduled_date)
  const inProgress = upcoming && !meeting.ended_at && meeting.started_at
  const ended     = !!meeting.ended_at

  return (
    <div
      onClick={onClick}
      className={`card p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
        inProgress ? 'border-l-green-400' :
        upcoming   ? 'border-l-primary-400' :
        ended      ? 'border-l-warm-200' :
                     'border-l-warm-300'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${TYPE_COLORS[meeting.type] ?? 'bg-warm-100 text-warm-600'}`}>
              {TYPE_LABELS[meeting.type] ?? meeting.type}
            </span>
            {ended && <span className="text-xs text-green-600 font-medium">Ended</span>}
            {inProgress && <span className="text-xs text-green-600 font-medium animate-pulse">● In Progress</span>}
          </div>

          <p className="text-sm font-semibold text-warm-900 leading-snug">
            {meeting.title || `${TYPE_LABELS[meeting.type] ?? meeting.type} Meeting`}
          </p>

          <p className="text-xs text-warm-500 mt-1">{fmtDateTime(meeting.scheduled_date)}</p>

          <div className="flex flex-wrap gap-2 mt-2 items-center">
            {meeting.team_name && (
              <span className="text-xs text-warm-400 bg-warm-100 px-1.5 py-0.5 rounded">{meeting.team_name}</span>
            )}
            {meeting.participants?.length > 0 && (
              <span className="text-xs text-warm-400">
                {meeting.participants.slice(0, 3).map(p => p.name.split(' ')[0]).join(', ')}
                {meeting.participants.length > 3 ? ` +${meeting.participants.length - 3}` : ''}
              </span>
            )}
          </div>
        </div>

        <svg className="w-4 h-4 text-warm-300 shrink-0 mt-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Meetings() {
  const [meetings,  setMeetings]  = useState([])
  const [users,     setUsers]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [adding,    setAdding]    = useState(false)
  const [selected,  setSelected]  = useState(null)
  const [filter,    setFilter]    = useState('upcoming')

  const load = useCallback(() => {
    const params = filter === 'upcoming' ? { upcoming: true } : {}
    Promise.all([
      api.get('/meetings', { params }),
      api.get('/users'),
    ])
      .then(([mRes, uRes]) => {
        setMeetings(mRes.data)
        setUsers(uRes.data.filter(u => u.active !== false))
      })
      .catch(() => setError('Failed to load meetings'))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { setLoading(true); load() }, [load])

  const handleCreated = (m) => { setMeetings(prev => [m, ...prev]); setAdding(false) }
  const handleUpdate  = (updated) => {
    setMeetings(prev => prev.map(m => m.id === updated.id ? updated : m))
    setSelected(updated)
  }

  const filters = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'all',      label: 'All' },
  ]

  if (error) return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-900 mb-1">Meetings</h1>
      <div className="card p-6 mt-4 border-l-4 border-l-red-500">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-warm-900 mb-1">Meetings</h1>
          <p className="text-warm-500 text-sm">Dream Centers of Colorado Springs</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setAdding(a => !a)}>
          {adding ? 'Cancel' : '+ Schedule Meeting'}
        </button>
      </div>

      {adding && <ScheduleForm users={users} onCreated={handleCreated} onCancel={() => setAdding(false)} />}

      <div className="flex gap-1 mb-4">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              filter === f.key ? 'bg-primary-600 text-white' : 'text-warm-600 hover:bg-warm-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin h-7 w-7 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="card p-8 text-center text-warm-400 text-sm">
          {filter === 'upcoming' ? 'No upcoming meetings. ' : 'No meetings found. '}
          <button className="text-primary-600 hover:text-primary-800 font-medium" onClick={() => setAdding(true)}>
            Schedule one
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {meetings.map(m => (
            <MeetingCard key={m.id} meeting={m} onClick={() => setSelected(m)} />
          ))}
        </div>
      )}

      {selected && (
        <MeetingDetail
          meeting={selected}
          onUpdate={handleUpdate}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
