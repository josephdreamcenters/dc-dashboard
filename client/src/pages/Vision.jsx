import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

const SECTIONS = [
  {
    key: 'core_values',
    label: 'Core Values',
    hint: 'The fundamental beliefs and principles guiding your organization.',
    placeholder: 'Faith-Centered\nCompassion\nExcellence\nStewardship\nCollaboration',
  },
  {
    key: 'core_focus',
    label: 'Core Focus',
    hint: 'Your purpose/cause and niche — why you exist and what you do best.',
    placeholder: 'Purpose: To provide life-affirming resources and holistic support...',
  },
  {
    key: 'bhag_text',
    label: 'BHAG',
    hint: 'Big Hairy Audacious Goal — your 10-25 year moonshot.',
    placeholder: 'Increase total Dream Makers from 100 to 500 by 12/31/26',
  },
  {
    key: 'marketing_strategy',
    label: 'Marketing Strategy',
    hint: 'Target market, uniques, proven process, and guarantee.',
    placeholder: 'Target market: Women in Colorado Springs facing unplanned pregnancies...',
  },
  {
    key: 'three_year_picture',
    label: '3-Year Picture',
    hint: 'What does the organization look like three years from now?',
    placeholder: 'Revenue: $5M\nHeadcount: 35\nKey milestones...',
  },
  {
    key: 'one_year_plan',
    label: '1-Year Plan',
    hint: 'Revenue, profit, measurables, and 3-7 goals for this year.',
    placeholder: 'Goals:\n1. Raise $3.5M operating budget\n2. Reach 160 volunteers...',
  },
  {
    key: 'quarterly_priorities',
    label: 'Quarterly Priorities (Rocks)',
    hint: 'The 3-7 most important things to accomplish this quarter.',
    placeholder: '1. Launch volunteer LMS\n2. Complete HR vendor selection\n3. ...',
  },
]

function fmtDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function Vision() {
  const { user } = useAuth()
  const [vision,   setVision]   = useState(null)
  const [draft,    setDraft]    = useState({})
  const [editing,  setEditing]  = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)
  const [history,  setHistory]  = useState([])
  const [showHist, setShowHist] = useState(false)

  const canEdit = ['admin', 'ceo', 'director'].includes(user?.role)

  useEffect(() => {
    api.get('/vision')
      .then(({ data }) => {
        setVision(data)
        setDraft(data ?? {})
      })
      .catch(() => setError('Failed to load vision document'))
      .finally(() => setLoading(false))
  }, [])

  const startEdit = () => { setDraft({ ...vision }); setEditing(true) }
  const cancelEdit = () => { setDraft({ ...vision }); setEditing(false) }

  const save = async () => {
    setSaving(true)
    try {
      const { data } = await api.put('/vision', draft)
      setVision(data)
      setEditing(false)
      toast.success(`Vision saved — version ${data.version}`)
    } catch {
      toast.error('Failed to save vision')
    } finally {
      setSaving(false)
    }
  }

  const loadHistory = async () => {
    if (history.length) { setShowHist(h => !h); return }
    const { data } = await api.get('/vision/history')
    setHistory(data)
    setShowHist(true)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
    </div>
  )

  if (error) return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-900 mb-1">Vision</h1>
      <div className="card p-6 mt-4 border-l-4 border-l-red-500">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-warm-900 mb-1">Vision</h1>
          <p className="text-warm-500 text-sm">
            Dream Centers of Colorado Springs
            {vision?.version && ` · Version ${vision.version}`}
            {vision?.created_at && ` · Last updated ${fmtDate(vision.created_at)}`}
          </p>
        </div>
        <div className="flex gap-2">
          {vision && (
            <button onClick={loadHistory} className="btn-secondary text-sm">
              {showHist ? 'Hide History' : 'History'}
            </button>
          )}
          {canEdit && !editing && (
            <button onClick={startEdit} className="btn-primary text-sm">Edit Vision</button>
          )}
          {editing && (
            <>
              <button onClick={cancelEdit} className="btn-secondary text-sm" disabled={saving}>Cancel</button>
              <button onClick={save} className="btn-primary text-sm" disabled={saving}>
                {saving ? 'Saving…' : 'Save Version'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Version history */}
      {showHist && history.length > 0 && (
        <div className="card p-4 mb-5">
          <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide mb-2">Version History</p>
          <div className="space-y-1">
            {history.map(h => (
              <div key={h.id} className="flex items-center gap-3 text-sm">
                <span className="text-primary-600 font-medium w-12">v{h.version}</span>
                <span className="text-warm-500">{fmtDate(h.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {SECTIONS.map(({ key, label, hint, placeholder }) => (
          <div key={key} className={`card p-5 ${key === 'core_values' || key === 'bhag_text' ? '' : ''}`}>
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-warm-900">{label}</h2>
              <p className="text-xs text-warm-400 mt-0.5">{hint}</p>
            </div>
            {editing ? (
              <textarea
                className="input w-full text-sm resize-none"
                style={{ minHeight: '120px' }}
                placeholder={placeholder}
                value={draft[key] ?? ''}
                onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
              />
            ) : (
              <div className="text-sm text-warm-700 whitespace-pre-wrap leading-relaxed min-h-16">
                {vision?.[key] || <span className="text-warm-300 italic">Not yet defined</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      {!vision && !editing && canEdit && (
        <div className="card p-8 text-center mt-4">
          <p className="text-warm-500 text-sm mb-3">No vision document yet.</p>
          <button onClick={startEdit} className="btn-primary text-sm">Create Vision Document</button>
        </div>
      )}
    </div>
  )
}
