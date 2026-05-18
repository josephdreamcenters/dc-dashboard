import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

const STAGE_CONFIG = {
  identify: { label: 'Identify',  color: 'bg-warm-100 text-warm-600',    step: 1 },
  discuss:  { label: 'Discuss',   color: 'bg-blue-100 text-blue-700',    step: 2 },
  solve:    { label: 'Solve',     color: 'bg-accent-100 text-accent-700', step: 3 },
}
const STATUS_CONFIG = {
  open:          { label: 'Open',          color: 'bg-warm-100 text-warm-600' },
  in_discussion: { label: 'In Discussion', color: 'bg-blue-100 text-blue-700' },
  resolved:      { label: 'Resolved',      color: 'bg-green-100 text-green-700' },
}
const PRIORITY_LABELS = { 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low', 5: 'Minor' }
const PRIORITY_COLORS  = {
  1: 'bg-red-100 text-red-700 border-red-300',
  2: 'bg-orange-100 text-orange-700 border-orange-200',
  3: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  4: 'bg-warm-100 text-warm-500 border-warm-200',
  5: 'bg-warm-50 text-warm-400 border-warm-100',
}

function fmtDate(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── IDS Stage stepper ─────────────────────────────────────────────────────────

function IDSStepper({ stage, status }) {
  const steps = ['identify', 'discuss', 'solve']
  const currentStep = status === 'resolved' ? 4 : (STAGE_CONFIG[stage]?.step ?? 1)
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, idx) => {
        const stepNum = idx + 1
        const done    = currentStep > stepNum
        const active  = currentStep === stepNum
        return (
          <div key={s} className="flex items-center gap-1">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
              done   ? 'bg-green-500 border-green-500 text-white' :
              active ? 'bg-primary-600 border-primary-600 text-white' :
                       'border-warm-200 text-warm-300'
            }`}>
              {done ? '✓' : stepNum}
            </div>
            <span className={`text-xs font-medium hidden sm:inline ${
              active ? 'text-primary-700' : done ? 'text-green-600' : 'text-warm-300'
            }`}>{STAGE_CONFIG[s].label}</span>
            {idx < 2 && <div className={`w-4 h-px mx-0.5 ${done ? 'bg-green-400' : 'bg-warm-200'}`} />}
          </div>
        )
      })}
      {status === 'resolved' && (
        <>
          <div className="w-4 h-px mx-0.5 bg-green-400" />
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-green-500 border-2 border-green-500 text-white">✓</div>
          <span className="text-xs font-medium text-green-600 hidden sm:inline">Resolved</span>
        </>
      )}
    </div>
  )
}

// ── IssueCard ─────────────────────────────────────────────────────────────────

function IssueCard({ issue, onUpdate, onDelete }) {
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes]       = useState('')
  const [acting, setActing]     = useState(false)

  const canEdit = ['admin', 'ceo', 'director'].includes(user?.role)
    || issue.logged_by === user?.id

  const nextAction = issue.status === 'resolved' ? null
    : issue.stage === 'identify' ? { action: 'discuss', label: 'Move to Discuss →', placeholder: 'What did you identify about this issue?' }
    : issue.stage === 'discuss'  ? { action: 'solve',   label: 'Move to Solve →',   placeholder: 'What was discussed?' }
    : issue.stage === 'solve'    ? { action: 'resolve', label: 'Mark Resolved ✓',    placeholder: 'What is the solution?' }
    : null

  const handleProgress = async () => {
    if (!nextAction) return
    setActing(true)
    try {
      const { data } = await api.post(`/issues/${issue.id}/progress`, {
        action: nextAction.action,
        notes: notes || undefined,
      })
      onUpdate(data)
      setNotes('')
      setExpanded(false)
      toast.success(nextAction.action === 'resolve' ? 'Issue resolved!' : 'Issue advanced')
    } catch {
      toast.error('Failed to update issue')
    } finally {
      setActing(false)
    }
  }

  const handleReopen = async () => {
    setActing(true)
    try {
      const { data } = await api.post(`/issues/${issue.id}/progress`, { action: 'reopen' })
      onUpdate(data)
      toast.success('Issue reopened')
    } catch {
      toast.error('Failed to reopen')
    } finally {
      setActing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this issue?')) return
    try {
      await api.delete(`/issues/${issue.id}`)
      onDelete(issue.id)
      toast.success('Deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const isResolved = issue.status === 'resolved'

  return (
    <div className={`card mb-3 overflow-hidden ${isResolved ? 'opacity-70' : ''}`}>
      {/* Header row */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-warm-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="mt-0.5 shrink-0">
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[issue.priority] ?? PRIORITY_COLORS[3]}`}>
            P{issue.priority}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold text-warm-900 leading-snug ${isResolved ? 'line-through text-warm-400' : ''}`}>
            {issue.title}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <IDSStepper stage={issue.stage} status={issue.status} />
            {issue.team_name && (
              <span className="text-xs text-warm-400 bg-warm-100 px-1.5 py-0.5 rounded">
                {issue.team_name}
              </span>
            )}
            {issue.logged_by_name && (
              <span className="text-xs text-warm-400">by {issue.logged_by_name}</span>
            )}
            {isResolved && issue.resolved_at && (
              <span className="text-xs text-green-600">Resolved {fmtDate(issue.resolved_at)}</span>
            )}
          </div>
        </div>

        <svg
          className={`w-4 h-4 text-warm-400 shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-warm-100 px-4 pb-4 pt-3">
          {/* IDS notes history */}
          <div className="space-y-3 mb-4">
            {[
              { label: 'Identify Notes', value: issue.identify_notes },
              { label: 'Discuss Notes',  value: issue.discuss_notes },
              { label: 'Solve / Resolution', value: issue.solve_notes },
            ].filter(n => n.value).map(n => (
              <div key={n.label}>
                <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1">{n.label}</p>
                <p className="text-sm text-warm-700 bg-warm-50 rounded p-2.5">{n.value}</p>
              </div>
            ))}
          </div>

          {/* Progress actions */}
          {canEdit && !isResolved && nextAction && (
            <div className="border-t border-warm-100 pt-3">
              <textarea
                className="input text-sm w-full h-20 resize-none mb-2"
                placeholder={nextAction.placeholder}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  className={`text-sm px-4 py-1.5 rounded font-medium transition-colors ${
                    nextAction.action === 'resolve'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'btn-primary'
                  }`}
                  onClick={handleProgress}
                  disabled={acting}
                >
                  {acting ? 'Saving…' : nextAction.label}
                </button>
                {canEdit && (
                  <button
                    onClick={handleDelete}
                    className="text-xs text-warm-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors ml-auto"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Resolved state */}
          {isResolved && canEdit && (
            <div className="border-t border-warm-100 pt-3 flex gap-2">
              <button
                className="text-xs text-warm-500 hover:text-primary-600 font-medium"
                onClick={handleReopen}
                disabled={acting}
              >
                Reopen Issue
              </button>
              <button
                onClick={handleDelete}
                className="text-xs text-warm-400 hover:text-red-600 ml-auto"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── AddIssueForm ──────────────────────────────────────────────────────────────

function AddIssueForm({ teams, onCreated, onCancel }) {
  const [title,    setTitle]    = useState('')
  const [desc,     setDesc]     = useState('')
  const [teamId,   setTeamId]   = useState('')
  const [priority, setPriority] = useState('3')
  const [saving,   setSaving]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const { data } = await api.post('/issues', {
        title: title.trim(),
        description: desc || null,
        team_id: teamId || null,
        priority: parseInt(priority),
      })
      onCreated(data)
      toast.success('Issue logged')
    } catch {
      toast.error('Failed to log issue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 mb-5 border-l-4 border-l-accent-400">
      <h3 className="text-sm font-semibold text-warm-900 mb-3">Log a New Issue</h3>
      <div className="space-y-3">
        <input
          className="input"
          placeholder="Describe the issue clearly and specifically"
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
          required
        />
        <textarea
          className="input h-20 resize-none text-sm"
          placeholder="Additional context (optional)"
          value={desc}
          onChange={e => setDesc(e.target.value)}
        />
        <div className="flex gap-3">
          <select className="input flex-1" value={teamId} onChange={e => setTeamId(e.target.value)}>
            <option value="">No team</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="input w-36" value={priority} onChange={e => setPriority(e.target.value)}>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>P{k} – {v}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary text-sm" type="submit" disabled={saving}>
            {saving ? 'Logging…' : 'Log Issue'}
          </button>
          <button className="btn-secondary text-sm" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Issues() {
  const [issues,  setIssues]  = useState([])
  const [teams,   setTeams]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [adding,  setAdding]  = useState(false)
  const [filter,  setFilter]  = useState('open')

  const load = useCallback(() => {
    const params = filter !== 'all' ? { status: filter } : {}
    Promise.all([
      api.get('/issues', { params }),
      api.get('/users'),
    ])
      .then(([issuesRes, usersRes]) => {
        setIssues(issuesRes.data)
        const teamMap = {}
        usersRes.data.forEach(u => {
          if (u.team_id && u.team_name) teamMap[u.team_id] = { id: u.team_id, name: u.team_name }
        })
        setTeams(Object.values(teamMap).sort((a, b) => a.name.localeCompare(b.name)))
      })
      .catch(() => setError('Failed to load issues'))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { setLoading(true); load() }, [load])

  const handleCreated = (issue) => { setIssues(prev => [issue, ...prev]); setAdding(false) }
  const handleUpdate  = (updated) => {
    setIssues(prev => {
      const next = prev.map(i => i.id === updated.id ? updated : i)
      if (filter === 'open') return next.filter(i => i.status !== 'resolved')
      if (filter === 'resolved') return next.filter(i => i.status === 'resolved')
      return next
    })
  }
  const handleDelete = (id) => setIssues(prev => prev.filter(i => i.id !== id))

  const filters = [
    { key: 'open',     label: 'Open' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'all',      label: 'All' },
  ]

  if (error) return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-900 mb-1">Issues</h1>
      <div className="card p-6 mt-4 border-l-4 border-l-red-500">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-warm-900 mb-1">Issues</h1>
          <p className="text-warm-500 text-sm">
            Dream Centers of Colorado Springs · IDS Process
          </p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setAdding(a => !a)}>
          {adding ? 'Cancel' : '+ Log Issue'}
        </button>
      </div>

      {adding && <AddIssueForm teams={teams} onCreated={handleCreated} onCancel={() => setAdding(false)} />}

      {/* Filter tabs */}
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

      {/* IDS legend */}
      <div className="flex items-center gap-4 text-xs text-warm-500 mb-4 px-1">
        <span className="font-semibold text-warm-700">IDS:</span>
        <span><strong>I</strong>dentify the real issue</span>
        <span className="text-warm-300">·</span>
        <span><strong>D</strong>iscuss solutions</span>
        <span className="text-warm-300">·</span>
        <span><strong>S</strong>olve and commit</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin h-7 w-7 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : issues.length === 0 ? (
        <div className="card p-8 text-center text-warm-400 text-sm">
          {filter === 'open' ? 'No open issues. ' : 'No issues found.'}
          {filter === 'open' && (
            <button
              className="text-primary-600 hover:text-primary-800 font-medium"
              onClick={() => setAdding(true)}
            >Log one now</button>
          )}
        </div>
      ) : (
        <div>
          {issues.map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
