import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useAuth } from '../hooks/useAuth'

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

function WIGCard({ wig }) {
  const pct = wig.wig_type !== 'milestone'
    ? calcPct(wig.start_value, wig.target_value, wig.current_value)
    : null

  return (
    <div className="card p-5 flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded truncate max-w-[60%]">
          {wig.team_name || 'Unassigned'}
        </span>
        {wig.wig_type === 'milestone' && <MilestoneTag status={wig.milestone_status} />}
      </div>

      <h3 className="text-sm font-semibold text-warm-900 mb-3 leading-snug flex-1">{wig.title}</h3>

      {wig.wig_type === 'milestone' ? (
        <p className="text-xs text-warm-400">Milestone</p>
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-2xl font-bold text-warm-900">{fmtNum(wig.wig_type, wig.current_value)}</span>
            <span className="text-xs text-warm-400">of {fmtNum(wig.wig_type, wig.target_value)}</span>
          </div>
          <ProgressBar pct={pct} color={barColor(pct)} />
          <div className="flex justify-between text-xs text-warm-400 mt-1">
            <span>{fmtNum(wig.wig_type, wig.start_value)} start</span>
            <span>{pct?.toFixed(1)}%</span>
          </div>
        </>
      )}

      {wig.as_of_date && (
        <div className="text-xs text-warm-400 mt-3 pt-2 border-t border-warm-100">
          {fmtDate(wig.as_of_date)}
          {wig.last_updated_by_name && ` · ${wig.last_updated_by_name}`}
        </div>
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

  useEffect(() => {
    Promise.all([api.get('/bhag'), api.get('/wigs')])
      .then(([bhagRes, wigsRes]) => {
        setBhag(bhagRes.data)
        setWigs(wigsRes.data)
      })
      .catch(() => setError('Failed to load dashboard data. Please refresh the page.'))
      .finally(() => setLoading(false))
  }, [])

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

  const bhagPct = bhag
    ? calcPct(bhag.start_value, bhag.target_value, bhag.current_value)
    : 0

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
              {bhag.description && (
                <p className="text-sm text-warm-500 mt-1">{bhag.description}</p>
              )}
            </div>
            <div className="text-left sm:text-right shrink-0">
              <div className="text-4xl font-bold text-accent-700">
                {fmtNum('numeric', bhag.current_value)}
              </div>
              <div className="text-sm text-warm-500 mt-0.5">
                of {fmtNum('numeric', bhag.target_value)} goal
              </div>
            </div>
          </div>
          <ProgressBar pct={bhagPct} color="accent" />
          <div className="flex justify-between text-xs text-warm-400 mt-1.5">
            <span>{fmtNum('numeric', bhag.start_value)} start</span>
            <span>{bhagPct.toFixed(1)}% to goal</span>
          </div>
          {bhag.as_of_date && (
            <p className="text-xs text-warm-400 mt-2">
              Last updated {fmtDate(bhag.as_of_date)}
              {bhag.last_updated_by_name && ` by ${bhag.last_updated_by_name}`}
            </p>
          )}
        </div>
      )}

      {/* Team WIGs */}
      <h2 className="section-title">Team WIGs</h2>
      {wigs.length === 0 ? (
        <div className="card p-6 text-warm-500 text-sm">No active WIGs found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {wigs.map(wig => <WIGCard key={wig.id} wig={wig} />)}
        </div>
      )}
    </div>
  )
}
