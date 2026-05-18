import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const STATUS_CONFIG = {
  draft:                { label: 'Draft',               color: 'bg-warm-100 text-warm-500' },
  employee_submitted:   { label: 'Employee Submitted',  color: 'bg-blue-100 text-blue-700' },
  supervisor_submitted: { label: 'Supervisor Submitted', color: 'bg-accent-100 text-accent-700' },
  complete:             { label: 'Complete',             color: 'bg-green-100 text-green-700' },
}

const EMPLOYEE_QUESTIONS = [
  { key: 'wins',         label: 'Key Wins This Quarter',          placeholder: 'What went well? What are you most proud of?' },
  { key: 'challenges',   label: 'Challenges & Lessons Learned',    placeholder: 'What was difficult? What did you learn?' },
  { key: 'goals_next',   label: 'Goals for Next Quarter',          placeholder: 'What do you want to accomplish?' },
  { key: 'support',      label: 'Support Needed',                  placeholder: 'What do you need from your supervisor or the organization?' },
  { key: 'core_values',  label: 'Living the Core Values',          placeholder: 'How have you demonstrated our core values this quarter?' },
]

const SUPERVISOR_QUESTIONS = [
  { key: 'strengths',      label: 'Strengths',                       placeholder: 'What does this employee do exceptionally well?' },
  { key: 'growth_areas',   label: 'Growth Areas',                    placeholder: 'Where can they improve or develop?' },
  { key: 'goals_set',      label: 'Goals Set for Next Quarter',      placeholder: 'Agreed-upon goals for the coming quarter.' },
  { key: 'overall_rating', label: 'Overall Performance Rating',      placeholder: 'Exceeds / Meets / Below expectations — and why.' },
  { key: 'notes',          label: 'Additional Notes',                placeholder: 'Anything else to note.' },
]

const YEAR = new Date().getFullYear()

function fmtDate(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Create review form ────────────────────────────────────────────────────────

function CreateReviewForm({ users, onCreated, onCancel }) {
  const { user } = useAuth()
  const [employeeId,   setEmployeeId]   = useState('')
  const [supervisorId, setSupervisorId] = useState(user?.id ?? '')
  const [quarter,      setQuarter]      = useState('Q2')
  const [year,         setYear]         = useState(YEAR)
  const [saving,       setSaving]       = useState(false)

  const staff = users.filter(u => u.active !== false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!employeeId) return
    setSaving(true)
    try {
      const { data } = await api.post('/reviews', {
        employee_id: parseInt(employeeId),
        supervisor_id: parseInt(supervisorId),
        quarter, year: parseInt(year),
      })
      onCreated(data)
      toast.success('Review created')
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to create review')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 mb-5 border-l-4 border-l-accent-400">
      <h3 className="text-sm font-semibold text-warm-900 mb-4">Create Quarterly Review</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <select className="input col-span-2" value={employeeId} onChange={e => setEmployeeId(e.target.value)} required>
          <option value="">Select employee…</option>
          {staff.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className="input col-span-2" value={supervisorId} onChange={e => setSupervisorId(e.target.value)}>
          <option value="">Select supervisor…</option>
          {staff.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className="input" value={quarter} onChange={e => setQuarter(e.target.value)}>
          {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
        </select>
        <input className="input" type="number" value={year} onChange={e => setYear(e.target.value)} min={2024} max={2030} />
      </div>
      <div className="flex gap-2">
        <button className="btn-primary text-sm" type="submit" disabled={saving || !employeeId}>
          {saving ? 'Creating…' : 'Create Review'}
        </button>
        <button className="btn-secondary text-sm" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// ── Review detail modal ───────────────────────────────────────────────────────

function ReviewModal({ review: initial, currentUserId, isManager, onUpdate, onClose }) {
  const [review,  setReview]  = useState(initial)
  const [empDraft, setEmpDraft] = useState(initial.employee_section ?? {})
  const [supDraft, setSupDraft] = useState(initial.supervisor_section ?? {})
  const [saving,  setSaving]  = useState(false)
  const [tab,     setTab]     = useState('employee')

  const isEmployee   = review.employee_id   === currentUserId
  const isSupervisor = review.supervisor_id === currentUserId || isManager

  const saveEmployee = async (submit = false) => {
    setSaving(true)
    try {
      const { data } = await api.put(`/reviews/${review.id}/employee`, { section: empDraft, submit })
      setReview(data)
      onUpdate(data)
      toast.success(submit ? 'Self-assessment submitted' : 'Draft saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const saveSupervisor = async (submit = false) => {
    setSaving(true)
    try {
      const { data } = await api.put(`/reviews/${review.id}/supervisor`, { section: supDraft, submit })
      setReview(data)
      onUpdate(data)
      toast.success(submit ? 'Evaluation submitted — review complete' : 'Draft saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const cfg = STATUS_CONFIG[review.status] ?? STATUS_CONFIG.draft
  const isComplete = review.status === 'complete'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-warm-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-warm-900">
              {review.employee_name} — {review.quarter} {review.year}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${cfg.color}`}>{cfg.label}</span>
              <span className="text-xs text-warm-400">Supervisor: {review.supervisor_name}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-warm-400 hover:text-warm-700 text-xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-warm-100 shrink-0">
          {[
            { key: 'employee',   label: 'Self-Assessment' },
            { key: 'supervisor', label: 'Supervisor Evaluation' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-warm-500 hover:text-warm-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5">
          {tab === 'employee' && (
            <div className="space-y-4">
              {review.employee_submitted_at && (
                <p className="text-xs text-blue-600">Submitted {fmtDate(review.employee_submitted_at)}</p>
              )}
              {EMPLOYEE_QUESTIONS.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  {isEmployee && !isComplete ? (
                    <textarea
                      className="input w-full h-24 resize-none text-sm"
                      placeholder={placeholder}
                      value={empDraft[key] ?? ''}
                      onChange={e => setEmpDraft(d => ({ ...d, [key]: e.target.value }))}
                    />
                  ) : (
                    <div className="bg-warm-50 rounded p-3 text-sm text-warm-700 whitespace-pre-wrap min-h-12">
                      {review.employee_section?.[key] || <span className="text-warm-300 italic">Not completed</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'supervisor' && (
            <div className="space-y-4">
              {review.supervisor_submitted_at && (
                <p className="text-xs text-green-600">Submitted {fmtDate(review.supervisor_submitted_at)}</p>
              )}
              {SUPERVISOR_QUESTIONS.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  {isSupervisor && !isComplete ? (
                    <textarea
                      className="input w-full h-24 resize-none text-sm"
                      placeholder={placeholder}
                      value={supDraft[key] ?? ''}
                      onChange={e => setSupDraft(d => ({ ...d, [key]: e.target.value }))}
                    />
                  ) : (
                    <div className="bg-warm-50 rounded p-3 text-sm text-warm-700 whitespace-pre-wrap min-h-12">
                      {review.supervisor_section?.[key] || <span className="text-warm-300 italic">Not completed</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!isComplete && (
          <div className="border-t border-warm-100 p-4 flex flex-wrap gap-2 shrink-0">
            {tab === 'employee' && isEmployee && (
              <>
                <button className="btn-secondary text-sm" onClick={() => saveEmployee(false)} disabled={saving}>
                  Save Draft
                </button>
                <button className="btn-primary text-sm" onClick={() => saveEmployee(true)} disabled={saving}>
                  {saving ? 'Submitting…' : 'Submit Self-Assessment'}
                </button>
              </>
            )}
            {tab === 'supervisor' && isSupervisor && (
              <>
                <button className="btn-secondary text-sm" onClick={() => saveSupervisor(false)} disabled={saving}>
                  Save Draft
                </button>
                <button
                  className="text-sm px-4 py-1.5 rounded font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                  onClick={() => saveSupervisor(true)}
                  disabled={saving || review.status === 'draft'}
                  title={review.status === 'draft' ? 'Employee must submit first' : ''}
                >
                  {saving ? 'Completing…' : 'Complete Review'}
                </button>
              </>
            )}
            <button className="btn-secondary text-sm ml-auto" onClick={onClose}>Close</button>
          </div>
        )}
        {isComplete && (
          <div className="border-t border-warm-100 p-4 shrink-0">
            <button className="btn-secondary text-sm" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── ReviewCard ────────────────────────────────────────────────────────────────

function ReviewCard({ review, onClick }) {
  const cfg = STATUS_CONFIG[review.status] ?? STATUS_CONFIG.draft
  return (
    <div
      onClick={onClick}
      className="card p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-accent-300"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-semibold text-warm-900">{review.employee_name}</p>
          <p className="text-xs text-warm-500 mt-0.5">{review.employee_title}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-warm-100 text-warm-700">
              {review.quarter} {review.year}
            </span>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${cfg.color}`}>{cfg.label}</span>
          </div>
          {review.supervisor_name && (
            <p className="text-xs text-warm-400 mt-1.5">Supervisor: {review.supervisor_name}</p>
          )}
        </div>
        <svg className="w-4 h-4 text-warm-300 shrink-0 mt-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Reviews() {
  const { user } = useAuth()
  const [reviews,  setReviews]  = useState([])
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [adding,   setAdding]   = useState(false)
  const [selected, setSelected] = useState(null)

  const isManager = ['admin', 'ceo', 'director'].includes(user?.role)

  const load = useCallback(() => {
    Promise.all([api.get('/reviews'), api.get('/users')])
      .then(([rRes, uRes]) => {
        setReviews(rRes.data)
        setUsers(uRes.data.filter(u => u.active !== false))
      })
      .catch(() => setError('Failed to load reviews'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreated = (r) => { setReviews(prev => [r, ...prev]); setAdding(false) }
  const handleUpdate  = (updated) => setReviews(prev => prev.map(r => r.id === updated.id ? updated : r))

  if (error) return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-900 mb-1">Quarterly Reviews</h1>
      <div className="card p-6 mt-4 border-l-4 border-l-red-500">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    </div>
  )

  const mine   = reviews.filter(r => r.employee_id === user?.id)
  const others = isManager ? reviews.filter(r => r.employee_id !== user?.id) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-warm-900 mb-1">Quarterly Reviews</h1>
          <p className="text-warm-500 text-sm">Dream Centers of Colorado Springs</p>
        </div>
        {isManager && (
          <button className="btn-primary text-sm" onClick={() => setAdding(a => !a)}>
            {adding ? 'Cancel' : '+ Create Review'}
          </button>
        )}
      </div>

      {adding && <CreateReviewForm users={users} onCreated={handleCreated} onCancel={() => setAdding(false)} />}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin h-7 w-7 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {mine.length > 0 && (
            <div>
              <h2 className="section-title">My Reviews</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {mine.map(r => <ReviewCard key={r.id} review={r} onClick={() => setSelected(r)} />)}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              <h2 className="section-title">Team Reviews</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {others.map(r => <ReviewCard key={r.id} review={r} onClick={() => setSelected(r)} />)}
              </div>
            </div>
          )}

          {reviews.length === 0 && (
            <div className="card p-8 text-center text-warm-400 text-sm">
              No reviews yet.
              {isManager && (
                <button className="block mx-auto mt-3 text-primary-600 hover:text-primary-800 font-medium text-sm"
                  onClick={() => setAdding(true)}>
                  Create the first review
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {selected && (
        <ReviewModal
          review={selected}
          currentUserId={user?.id}
          isManager={isManager}
          onUpdate={handleUpdate}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
