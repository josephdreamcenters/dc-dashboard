import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import toast from 'react-hot-toast'

// ── Date helpers ────────────────────────────────────────────────────────────

function thisMonday() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff)
  return toYMD(d)
}

function toYMD(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function addWeeks(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number)
  return toYMD(new Date(y, m - 1, d + n * 7))
}

function fmtWeek(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getWeeks(n = 8) {
  const end = thisMonday()
  const weeks = []
  for (let i = n - 1; i >= 0; i--) weeks.push(addWeeks(end, -i))
  return weeks
}

// ── Cell helpers ─────────────────────────────────────────────────────────────

function cellStyle(measure, entry) {
  if (!entry) return null
  if (measure.status_type === 'boolean') {
    return entry.value_boolean ? 'green' : 'red'
  }
  if (measure.status_type === 'numeric') {
    if (!measure.weekly_target) return 'blue'
    const pct = (parseFloat(entry.value_numeric) / parseFloat(measure.weekly_target)) * 100
    if (pct >= 100) return 'green'
    if (pct >= 70)  return 'yellow'
    return 'red'
  }
  return entry.value_text ? 'blue' : null
}

const COLOR_CLASSES = {
  green:  'bg-green-100 text-green-700 border-green-300',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  red:    'bg-red-100 text-red-600 border-red-300',
  blue:   'bg-blue-100 text-blue-700 border-blue-200',
}

function cellLabel(measure, entry) {
  if (!entry) return null
  if (measure.status_type === 'boolean') return entry.value_boolean ? '✓' : '✗'
  if (measure.status_type === 'numeric') return entry.value_numeric ?? '?'
  return '✓'
}

// ── ScoreCell ────────────────────────────────────────────────────────────────

function ScoreCell({ measure, entry, isCurrent, isActive, onClick }) {
  const color = cellStyle(measure, entry)
  const label = cellLabel(measure, entry)

  const base = 'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all shrink-0 select-none'

  if (!entry) {
    if (isCurrent) {
      return (
        <button
          onClick={onClick}
          className={`${base} border-dashed border-warm-300 text-warm-400 hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50`}
          title="Submit score"
        >+</button>
      )
    }
    return <div className={`${base} border-dashed border-warm-200 text-warm-200`} />
  }

  const colorCls = COLOR_CLASSES[color] ?? 'bg-warm-100 text-warm-500 border-warm-300'
  const title = measure.status_type === 'text' ? (entry.value_text ?? '') : ''

  return (
    <div
      className={`${base} ${colorCls} ${isCurrent ? 'cursor-pointer ring-2 ring-offset-1 ring-primary-300' : ''}`}
      onClick={isCurrent ? onClick : undefined}
      title={title}
    >
      {label}
    </div>
  )
}

// ── EditForm ─────────────────────────────────────────────────────────────────

function EditForm({ measure, week, entry, onSave, onCancel }) {
  const [vNum, setVNum] = useState(entry?.value_numeric ?? '')
  const [vBool, setVBool] = useState(entry?.value_boolean ?? null)
  const [vText, setVText] = useState(entry?.value_text ?? '')
  const [notes, setNotes] = useState(entry?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        lead_measure_id: measure.id,
        week_start: week,
        notes: notes || undefined,
      }
      if (measure.status_type === 'numeric')  body.value_numeric = parseFloat(vNum)
      if (measure.status_type === 'boolean')  body.value_boolean = vBool
      if (measure.status_type === 'text')     body.value_text = vText

      if (measure.status_type === 'numeric' && isNaN(body.value_numeric)) {
        toast.error('Enter a valid number')
        setSaving(false)
        return
      }
      if (measure.status_type === 'boolean' && vBool === null) {
        toast.error('Select yes or no')
        setSaving(false)
        return
      }

      const { data } = await api.post('/scorecards/entry', body)
      onSave(measure.id, week, data)
      toast.success('Score saved')
    } catch {
      toast.error('Failed to save score')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mt-2">
      <p className="text-xs font-semibold text-primary-700 mb-3">
        {measure.title} — week of {fmtWeek(week)}
      </p>

      <div className="flex flex-wrap gap-4 items-end">
        {measure.status_type === 'numeric' && (
          <div>
            <label className="label">
              Value{measure.weekly_target ? ` (target: ${measure.weekly_target})` : ''}
            </label>
            <input
              className="input w-28"
              type="number"
              step="any"
              min="0"
              value={vNum}
              onChange={e => setVNum(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {measure.status_type === 'boolean' && (
          <div>
            <label className="label">Completed this week?</label>
            <div className="flex gap-2">
              <button
                onClick={() => setVBool(true)}
                className={`px-4 py-1.5 rounded text-sm font-medium border-2 transition-colors ${
                  vBool === true ? 'bg-green-500 text-white border-green-500' : 'border-warm-300 text-warm-600 hover:border-green-400'
                }`}
              >Yes</button>
              <button
                onClick={() => setVBool(false)}
                className={`px-4 py-1.5 rounded text-sm font-medium border-2 transition-colors ${
                  vBool === false ? 'bg-red-400 text-white border-red-400' : 'border-warm-300 text-warm-600 hover:border-red-300'
                }`}
              >No</button>
            </div>
          </div>
        )}

        {measure.status_type === 'text' && (
          <div className="flex-1 min-w-48">
            <label className="label">Update</label>
            <input
              className="input"
              type="text"
              placeholder="What progress was made this week?"
              value={vText}
              onChange={e => setVText(e.target.value)}
              autoFocus
            />
          </div>
        )}

        <div className="flex-1 min-w-40">
          <label className="label">Notes (optional)</label>
          <input
            className="input"
            type="text"
            placeholder="Any context?"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button className="btn-primary text-xs px-3 py-1.5" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn-secondary text-xs px-3 py-1.5" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function Scorecard() {
  const [measures, setMeasures] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [editingCell, setEditingCell] = useState(null) // { measureId, week }

  const weeks      = getWeeks(8)
  const currentWeek = thisMonday()

  const load = useCallback(() => {
    api.get('/scorecards')
      .then(({ data }) => setMeasures(data))
      .catch(() => setError('Failed to load scorecard data'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = (measureId, week, newEntry) => {
    setMeasures(prev => prev.map(m => {
      if (m.id !== measureId) return m
      const existing = (m.entries || []).filter(e => e.week_start !== week)
      return { ...m, entries: [...existing, newEntry] }
    }))
    setEditingCell(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
    </div>
  )

  if (error) return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-900 mb-1">Scorecard</h1>
      <div className="card p-6 mt-4 border-l-4 border-l-red-500">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    </div>
  )

  // Group by team
  const byTeam = measures.reduce((acc, m) => {
    const key = m.team_name || 'Unassigned'
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-warm-900 mb-1">Scorecard</h1>
          <p className="text-warm-500 text-sm">
            Dream Centers of Colorado Springs · Week of {fmtWeek(currentWeek)}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-warm-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-400 inline-block" /> Met</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Partial</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Missed</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-dashed border-warm-300 inline-block" /> Pending</span>
        </div>
      </div>

      {measures.length === 0 ? (
        <div className="card p-6 text-warm-500 text-sm">No active lead measures found.</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byTeam).map(([teamName, teamMeasures]) => (
            <div key={teamName} className="card overflow-hidden">
              <div className="bg-primary-50 px-5 py-3 border-b border-primary-100">
                <h2 className="text-sm font-semibold text-primary-700">{teamName}</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-warm-100">
                      <th className="text-left text-xs font-semibold text-warm-500 uppercase tracking-wide px-5 py-3 min-w-52">
                        Lead Measure
                      </th>
                      <th className="text-left text-xs font-semibold text-warm-500 uppercase tracking-wide px-3 py-3 min-w-32">
                        Assigned To
                      </th>
                      <th className="text-center text-xs font-semibold text-warm-500 uppercase tracking-wide px-3 py-3 w-20">
                        Target
                      </th>
                      {weeks.map(w => (
                        <th
                          key={w}
                          className={`text-center text-xs font-semibold uppercase tracking-wide px-2 py-3 w-12 ${
                            w === currentWeek ? 'text-primary-600 bg-primary-50' : 'text-warm-400'
                          }`}
                        >
                          {fmtWeek(w)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teamMeasures.flatMap(measure => {
                      const entriesByWeek = Object.fromEntries(
                        (measure.entries || []).map(e => [e.week_start, e])
                      )
                      const isEditing = editingCell?.measureId === measure.id

                      const mainRow = (
                        <tr key={measure.id} className="border-b border-warm-50 hover:bg-warm-50 transition-colors">
                          <td className="px-5 py-3">
                            <p className="text-sm font-medium text-warm-900 leading-snug">{measure.title}</p>
                            {measure.wig_title && (
                              <p className="text-xs text-warm-400 mt-0.5 truncate max-w-xs">{measure.wig_title}</p>
                            )}
                          </td>
                          <td className="px-3 py-3 text-sm text-warm-600">
                            {measure.assigned_to_name ?? '—'}
                          </td>
                          <td className="px-3 py-3 text-center text-xs font-medium text-warm-500">
                            {measure.weekly_target
                              ? `${measure.weekly_target}/wk`
                              : measure.status_type === 'boolean' ? 'Yes/No'
                              : '—'}
                          </td>
                          {weeks.map(week => {
                            const entry = entriesByWeek[week]
                            const isCurrent = week === currentWeek
                            return (
                              <td
                                key={week}
                                className={`px-2 py-3 text-center ${isCurrent ? 'bg-primary-50' : ''}`}
                              >
                                <div className="flex justify-center">
                                  <ScoreCell
                                    measure={measure}
                                    entry={entry}
                                    isCurrent={isCurrent}
                                    onClick={() => setEditingCell(
                                      editingCell?.measureId === measure.id ? null
                                      : { measureId: measure.id, week }
                                    )}
                                  />
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      )

                      const editRow = isEditing ? (
                        <tr key={`edit-${measure.id}`}>
                          <td colSpan={3 + weeks.length} className="px-5 pb-4">
                            <EditForm
                              measure={measure}
                              week={editingCell.week}
                              entry={entriesByWeek[editingCell.week]}
                              onSave={handleSave}
                              onCancel={() => setEditingCell(null)}
                            />
                          </td>
                        </tr>
                      ) : null

                      return editRow ? [mainRow, editRow] : [mainRow]
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
