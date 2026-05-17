import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

function ProgressBar({ pct, color = 'blue' }) {
  const fill = {
    blue:   'bg-primary-600',
    green:  'bg-green-500',
    yellow: 'bg-yellow-500',
    red:    'bg-red-500',
    accent: 'bg-accent-600',
  }
  const clamped = Math.min(100, Math.max(0, pct ?? 0))
  return (
    <div className="w-full bg-warm-100 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${fill[color] ?? fill.blue}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

function calcPct(start, target, current) {
  const s = parseFloat(start) || 0
  const t = parseFloat(target) || 0
  const c = parseFloat(current) || 0
  if (t === s) return 0
  return ((c - s) / (t - s)) * 100
}

function barColor(pct) {
  if (pct >= 80) return 'green'
  if (pct >= 50) return 'blue'
  if (pct >= 30) return 'yellow'
  return 'red'
}

function fmtNum(wig_type, value) {
  if (value === null || value === undefined) return '—'
  const n = parseFloat(value)
  if (isNaN(n)) return '—'
  if (wig_type === 'percentage') return `${n.toFixed(1)}%`
  return n.toLocaleString()
}

function fmtDate(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const MILESTONE_STYLES = {
  complete: 'bg-green-100 text-green-800',
  on_track: 'bg-blue-100 text-blue-800',
  at_risk:  'bg-yellow-100 text-yellow-800',
  behind:   'bg-red-100 text-red-800',
}
const MILESTONE_LABELS = {
  complete: 'Complete',
  on_track: 'On Track',
  at_risk:  'At Risk',
  behind:   'Behind',
}

function MilestoneTag({ status }) {
  const s = status || 'behind'
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${MILESTONE_STYLES[s] ?? MILESTONE_STYLES.behind}`}>
      {MILESTONE_LABELS[s] ?? s}
    </span>
  )
}

function TeamWIGCard({ wigs: initialWigs, teamName, onUpdated }) {
  const { user } = useAuth()
  const [wigs, setWigs] = useState(initialWigs)
  const [editing, setEditing] = useState(null) // wig id being edited
  const [inputValue, setInputValue] = useState('')
  const [milestoneStatus, setMilestoneStatus] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { setWigs(initialWigs) }, [initialWigs])

  const canEdit = ['admin', 'ceo', 'director'].includes(user?.role)

  const startEdit = (wig) => {
    setEditing(wig.id)
    setInputValue(wig.wig_type !== 'milestone' ? (parseFloat(wig.current_value) || '') : '')
    setMilestoneStatus(wig.milestone_status || 'on_track')
    setNote('')
  }

  const cancelEdit = () => { setEditing(null); setNote('') }

  const saveEdit = async (wig) => {
    setSaving(true)
    try {
      const body = wig.wig_type === 'milestone'
        ? { milestone_status: milestoneStatus, note: note || undefined }
        : { value: parseFloat(inputValue), note: note || undefined }
      const { data } = await api.post(`/wigs/${wig.id}/values`, body)
      setWigs(prev => prev.map(w => w.id === wig.id ? { ...w, ...data } : w))
      setEditing(null)
      setNote('')
      toast.success('WIG updated')
      onUpdated?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update WIG')
    } finally {
      setSaving(false)
    }
  }

  const latestDate = wigs.map(w => w.as_of_date).filter(Boolean).sort().at(-1)

  return (
    <div className="card p-5 flex flex-col">
      <p className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded self-start mb-3">
        {teamName}
      </p>

      <div className="space-y-4 divide-y divide-warm-100 flex-1">
        {wigs.map(wig => {
          const pct = wig.wig_type !== 'milestone'
            ? calcPct(wig.start_value, wig.target_value, wig.current_value)
            : null
          const isEditing = editing === wig.id

          return (
            <div key={wig.id} className="pt-4 first:pt-0">
              {/* Title row */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-warm-900 leading-snug flex-1">{wig.title}</p>
                {wig.wig_type === 'milestone'
                  ? <MilestoneTag status={wig.milestone_status} />
                  : <span className="text-lg font-bold text-warm-900 shrink-0 tabular-nums">
                      {fmtNum(wig.wig_type, wig.current_value)}
                    </span>
                }
              </div>

              {/* Progress */}
              {wig.wig_type !== 'milestone' && (
                <>
                  <div className="flex justify-between text-xs text-warm-400 mb-1">
                    <span>Start: {fmtNum(wig.wig_type, wig.start_value)}</span>
                    <span>Goal: {fmtNum(wig.wig_type, wig.target_value)}</span>
                  </div>
                  <ProgressBar pct={pct} color={barColor(pct)} />
                  <p className="text-right text-xs text-warm-400 mt-0.5">{pct?.toFixed(1)}%</p>
                </>
              )}

              {/* Inline edit form */}
              {isEditing ? (
                <div className="mt-3 bg-warm-50 rounded p-3 border border-warm-200">
                  {wig.wig_type === 'milestone' ? (
                    <div className="mb-2">
                      <label className="label">Status</label>
                      <select
                        className="input"
                        value={milestoneStatus}
                        onChange={e => setMilestoneStatus(e.target.value)}
                      >
                        <option value="on_track">On Track</option>
                        <option value="at_risk">At Risk</option>
                        <option value="behind">Behind</option>
                        <option value="complete">Complete</option>
                      </select>
                    </div>
                  ) : (
                    <div className="mb-2">
                      <label className="label">New value</label>
                      <input
                        className="input"
                        type="number"
                        step="any"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        autoFocus
                      />
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="label">Note (optional)</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="What changed?"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-primary text-xs px-3 py-1.5"
                      onClick={() => saveEdit(wig)}
                      disabled={saving}
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      className="btn-secondary text-xs px-3 py-1.5"
                      onClick={cancelEdit}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : canEdit && (
                <button
                  className="mt-2 text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors"
                  onClick={() => startEdit(wig)}
                >
                  Update value →
                </button>
              )}
            </div>
          )
        })}
      </div>

      {latestDate && !editing && (
        <p className="text-xs text-warm-400 mt-3 pt-2 border-t border-warm-100">
          Updated {fmtDate(latestDate)}
        </p>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [bhag, setBhag] = useState(null)
  const [wigs, setWigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    Promise.all([api.get('/bhag'), api.get('/wigs')])
      .then(([bhagRes, wigsRes]) => {
        setBhag(bhagRes.data)
        setWigs(wigsRes.data)
      })
      .catch(() => setError('Failed to load dashboard data. Please refresh the page.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-warm-900 mb-1">Dashboard</h1>
        <div className="card p-6 mt-4 border-l-4 border-l-red-500">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const bhagPct = bhag ? calcPct(bhag.start_value, bhag.target_value, bhag.current_value) : 0

  const byTeam = wigs.reduce((acc, wig) => {
    const key = wig.team_name || 'Unassigned'
    if (!acc[key]) acc[key] = []
    acc[key].push(wig)
    return acc
  }, {})

  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-900 mb-1">Dashboard</h1>
      <p className="text-warm-500 text-sm mb-6">
        Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''} · Dream Centers of Colorado Springs
      </p>

      {/* BHAG */}
      {bhag && (
        <div className="card p-6 mb-8 border-l-4 border-l-accent-600">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
            <div>
              <span className="text-xs font-semibold text-accent-700 uppercase tracking-widest">
                Big Hairy Audacious Goal
              </span>
              <h2 className="text-xl font-semibold text-warm-900 mt-1">{bhag.title}</h2>
              {bhag.description && <p className="text-sm text-warm-500 mt-1">{bhag.description}</p>}
            </div>
            <div className="text-left sm:text-right shrink-0">
              <div className="text-4xl font-bold text-accent-700">{fmtNum('numeric', bhag.current_value)}</div>
              <div className="text-sm text-warm-500 mt-0.5">of {fmtNum('numeric', bhag.target_value)} goal</div>
            </div>
          </div>
          <ProgressBar pct={bhagPct} color="accent" />
          <div className="flex justify-between text-xs text-warm-400 mt-1.5">
            <span>{fmtNum('numeric', bhag.start_value)} start</span>
            <span>{bhagPct.toFixed(1)}% to goal</span>
          </div>
        </div>
      )}

      {/* Team WIGs */}
      <h2 className="section-title">Team WIGs</h2>
      {wigs.length === 0 ? (
        <div className="card p-6 text-warm-500 text-sm">No active WIGs found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Object.entries(byTeam).map(([teamName, teamWigs]) => (
            <TeamWIGCard
              key={teamName}
              teamName={teamName}
              wigs={teamWigs}
              onUpdated={load}
            />
          ))}
        </div>
      )}
    </div>
  )
}
