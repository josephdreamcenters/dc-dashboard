import { useState, useEffect } from 'react'
import api from '../lib/api'

const ROLE_STYLES = {
  ceo:      'bg-accent-100 text-accent-800 border-accent-300',
  admin:    'bg-primary-100 text-primary-800 border-primary-300',
  director: 'bg-blue-100 text-blue-800 border-blue-300',
  staff:    'bg-warm-100 text-warm-700 border-warm-300',
}
const ROLE_LABELS = {
  ceo: 'CEO', admin: 'Admin', director: 'Director', staff: 'Staff',
}
const CARD_BORDER = {
  ceo:      'border-accent-400',
  admin:    'border-primary-400',
  director: 'border-blue-400',
  staff:    'border-warm-300',
}

function PersonCard({ node }) {
  const roleStyle = ROLE_STYLES[node.role] ?? ROLE_STYLES.staff
  const borderStyle = CARD_BORDER[node.role] ?? CARD_BORDER.staff
  return (
    <div className={`bg-white rounded-lg border-2 ${borderStyle} shadow-sm px-4 py-3 w-52 shrink-0`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {node.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-warm-900 leading-tight truncate">{node.name}</p>
        </div>
      </div>
      {node.title && (
        <p className="text-xs text-warm-500 leading-snug mb-1.5">{node.title}</p>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${roleStyle}`}>
          {ROLE_LABELS[node.role] ?? node.role}
        </span>
        {node.team_name && (
          <span className="text-xs text-warm-400 truncate">{node.team_name}</span>
        )}
      </div>
    </div>
  )
}

function OrgNode({ node }) {
  const children = node.children ?? []
  const hasChildren = children.length > 0

  return (
    <div className="flex flex-col items-center">
      <PersonCard node={node} />

      {hasChildren && (
        <>
          {/* Vertical line down from parent card */}
          <div className="w-px h-6 bg-warm-300" />

          {children.length === 1 ? (
            <OrgNode node={children[0]} />
          ) : (
            <div className="flex items-start">
              {children.map((child, i) => {
                const isFirst = i === 0
                const isLast = i === children.length - 1
                return (
                  <div key={child.id} className="flex flex-col items-center px-4">
                    {/*
                      Each child contributes its half of the horizontal connector bar.
                      Left half drawn for all except the first child.
                      Right half drawn for all except the last child.
                      Vertical drop always drawn center-to-bottom.
                    */}
                    <div className="relative w-full h-6">
                      {!isFirst && (
                        <div className="absolute top-0 left-0 right-1/2 h-px bg-warm-300" />
                      )}
                      {!isLast && (
                        <div className="absolute top-0 left-1/2 right-0 h-px bg-warm-300" />
                      )}
                      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-warm-300" />
                    </div>
                    <OrgNode node={child} />
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function buildTree(users) {
  const map = {}
  users.forEach(u => { map[u.id] = { ...u, children: [] } })
  const roots = []
  users.forEach(u => {
    if (u.reports_to && map[u.reports_to]) {
      map[u.reports_to].children.push(map[u.id])
    } else if (!u.reports_to) {
      roots.push(map[u.id])
    }
  })
  const sortChildren = (node) => {
    node.children.sort((a, b) => {
      const order = { ceo: 0, admin: 1, director: 2, staff: 3 }
      const diff = (order[a.role] ?? 4) - (order[b.role] ?? 4)
      return diff !== 0 ? diff : a.name.localeCompare(b.name)
    })
    node.children.forEach(sortChildren)
    return node
  }
  return roots.map(sortChildren)
}

const ZOOM_STEP = 0.1
const ZOOM_MIN = 0.3
const ZOOM_MAX = 1.5

export default function OrgChart() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    api.get('/users')
      .then(({ data }) => setUsers(data.filter(u => u.active !== false)))
      .catch(() => setError('Failed to load org chart'))
      .finally(() => setLoading(false))
  }, [])

  const zoomIn  = () => setScale(s => Math.min(ZOOM_MAX, Math.round((s + ZOOM_STEP) * 10) / 10))
  const zoomOut = () => setScale(s => Math.max(ZOOM_MIN, Math.round((s - ZOOM_STEP) * 10) / 10))
  const zoomReset = () => setScale(1)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
    </div>
  )

  if (error) return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-900 mb-1">Organizational Chart</h1>
      <div className="card p-6 mt-4 border-l-4 border-l-red-500">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    </div>
  )

  const roots = buildTree(users)

  const legend = [
    { role: 'ceo',      label: 'CEO' },
    { role: 'admin',    label: 'Admin' },
    { role: 'director', label: 'Director' },
    { role: 'staff',    label: 'Staff' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-warm-900 mb-1">Organizational Chart</h1>
          <p className="text-warm-500 text-sm">Dream Centers of Colorado Springs · {users.length} people</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            {legend.map(({ role, label }) => (
              <div key={role} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded border ${ROLE_STYLES[role]}`} />
                <span className="text-xs text-warm-600">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 border border-warm-200 rounded-lg bg-white shadow-sm px-1 py-1">
            <button
              onClick={zoomOut}
              disabled={scale <= ZOOM_MIN}
              className="w-7 h-7 flex items-center justify-center rounded text-warm-600 hover:bg-warm-100 disabled:opacity-30 disabled:cursor-not-allowed text-base leading-none"
              title="Zoom out"
            >−</button>
            <button
              onClick={zoomReset}
              className="px-2 h-7 text-xs font-medium text-warm-600 hover:bg-warm-100 rounded min-w-[3rem]"
              title="Reset zoom"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={zoomIn}
              disabled={scale >= ZOOM_MAX}
              className="w-7 h-7 flex items-center justify-center rounded text-warm-600 hover:bg-warm-100 disabled:opacity-30 disabled:cursor-not-allowed text-base leading-none"
              title="Zoom in"
            >+</button>
          </div>
        </div>
      </div>

      <div className="card overflow-auto">
        <div style={{ zoom: scale }}>
          <div className="flex justify-center min-w-max mx-auto p-8">
            {roots.map(root => (
              <OrgNode key={root.id} node={root} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
