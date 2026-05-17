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
  const hasChildren = node.children?.length > 0

  return (
    <div className="flex flex-col items-center">
      <PersonCard node={node} />

      {hasChildren && (
        <>
          {/* Vertical line down from parent */}
          <div className="w-px h-6 bg-warm-300" />

          {node.children.length === 1 ? (
            /* Single child — just a straight line */
            <OrgNode node={node.children[0]} />
          ) : (
            <div className="flex flex-col items-center">
              {/* Horizontal connector bar */}
              <div className="flex items-start">
                {node.children.map((child, i) => (
                  <div key={child.id} className="flex flex-col items-center">
                    {/* Left cap, center, right cap for horizontal line */}
                    <div className={`h-px bg-warm-300 ${
                      i === 0 ? 'w-1/2 self-end' :
                      i === node.children.length - 1 ? 'w-1/2 self-start' :
                      'w-full'
                    }`} />
                  </div>
                ))}
              </div>

              {/* Children row with horizontal line above */}
              <div className="relative flex gap-6 items-start">
                {/* Full-width horizontal line */}
                <div
                  className="absolute top-0 left-[104px] right-[104px] h-px bg-warm-300"
                  style={{ left: '50%', transform: 'none' }}
                />
                {node.children.map((child, idx) => (
                  <div key={child.id} className="flex flex-col items-center">
                    {/* Short vertical drop to each child */}
                    <div className="w-px h-6 bg-warm-300" />
                    <OrgNode node={child} />
                  </div>
                ))}
              </div>
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
  // Sort children: directors first, then staff, alphabetically within
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

export default function OrgChart() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/users')
      .then(({ data }) => setUsers(data.filter(u => u.active !== false)))
      .catch(() => setError('Failed to load org chart'))
      .finally(() => setLoading(false))
  }, [])

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
        <div className="flex items-center gap-3">
          {legend.map(({ role, label }) => (
            <div key={role} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded border ${ROLE_STYLES[role]}`} />
              <span className="text-xs text-warm-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-8 overflow-auto">
        <div className="flex justify-center min-w-max mx-auto">
          {roots.map(root => (
            <OrgNode key={root.id} node={root} />
          ))}
        </div>
      </div>
    </div>
  )
}
