import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

const PRIORITY_STYLES = {
  urgent: 'bg-red-100 text-red-700 border-red-300',
  high:   'bg-orange-100 text-orange-700 border-orange-300',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  low:    'bg-warm-100 text-warm-500 border-warm-200',
}
const STATUS_STYLES = {
  not_started: 'bg-warm-100 text-warm-500',
  in_progress: 'bg-blue-100 text-blue-700',
  complete:    'bg-green-100 text-green-700',
}
const STATUS_LABELS = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  complete:    'Complete',
}
const PRIORITY_LABELS = {
  urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low',
}

function fmtDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(dateStr, status) {
  if (!dateStr || status === 'complete') return false
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d) < new Date(new Date().toDateString())
}

// ── AddTodoForm ───────────────────────────────────────────────────────────────

function AddTodoForm({ users, onCreated, onCancel }) {
  const { user } = useAuth()
  const [title, setTitle]           = useState('')
  const [assignedTo, setAssignedTo] = useState(user?.id ?? '')
  const [dueDate, setDueDate]       = useState('')
  const [priority, setPriority]     = useState('medium')
  const [saving, setSaving]         = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const { data } = await api.post('/todos', {
        title: title.trim(),
        assigned_to: assignedTo || null,
        due_date: dueDate || null,
        priority,
      })
      onCreated(data)
      toast.success('To-do created')
    } catch {
      toast.error('Failed to create to-do')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 mb-4 border-l-4 border-l-primary-400">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="input flex-1"
          placeholder="What needs to get done?"
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
          required
        />
        <select className="input w-40" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
          <option value="">Unassigned</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <input
          className="input w-36"
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          placeholder="Due date"
        />
        <select className="input w-28" value={priority} onChange={e => setPriority(e.target.value)}>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <div className="flex gap-2 shrink-0">
          <button className="btn-primary text-sm px-4" type="submit" disabled={saving}>
            {saving ? 'Adding…' : 'Add'}
          </button>
          <button className="btn-secondary text-sm px-3" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}

// ── TodoRow ───────────────────────────────────────────────────────────────────

function TodoRow({ todo, onUpdate, onDelete }) {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState({ ...todo })
  const [saving, setSaving]   = useState(false)

  const canEdit = ['admin', 'ceo', 'director'].includes(user?.role)
    || todo.assigned_to === user?.id
    || todo.created_by === user?.id

  const cycleStatus = async () => {
    const next = {
      not_started: 'in_progress',
      in_progress: 'complete',
      complete: 'not_started',
    }[todo.status]
    try {
      const { data } = await api.put(`/todos/${todo.id}`, { status: next })
      onUpdate(data)
    } catch {
      toast.error('Failed to update status')
    }
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      const { data } = await api.put(`/todos/${todo.id}`, {
        title:       draft.title,
        assigned_to: draft.assigned_to || null,
        due_date:    draft.due_date || null,
        priority:    draft.priority,
      })
      onUpdate(data)
      setEditing(false)
      toast.success('Updated')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this to-do?')) return
    try {
      await api.delete(`/todos/${todo.id}`)
      onDelete(todo.id)
      toast.success('Deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const overdue = isOverdue(todo.due_date, todo.status)

  if (editing) {
    return (
      <div className="px-4 py-3 border-b border-warm-100 bg-warm-50">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            className="input flex-1 min-w-48 text-sm"
            value={draft.title}
            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            autoFocus
          />
          <input
            className="input w-36 text-sm"
            type="date"
            value={draft.due_date?.split('T')[0] ?? ''}
            onChange={e => setDraft(d => ({ ...d, due_date: e.target.value }))}
          />
          <select
            className="input w-28 text-sm"
            value={draft.priority}
            onChange={e => setDraft(d => ({ ...d, priority: e.target.value }))}
          >
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button className="btn-primary text-xs px-3 py-1.5" onClick={saveEdit} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-start gap-3 px-4 py-3 border-b border-warm-100 group hover:bg-warm-50 transition-colors ${
      todo.status === 'complete' ? 'opacity-60' : ''
    }`}>
      {/* Status toggle circle */}
      <button
        onClick={cycleStatus}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
          todo.status === 'complete'
            ? 'bg-green-500 border-green-500 text-white'
            : todo.status === 'in_progress'
            ? 'bg-blue-100 border-blue-400'
            : 'border-warm-300 hover:border-primary-400'
        }`}
        title="Cycle status"
      >
        {todo.status === 'complete' && (
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {todo.status === 'in_progress' && (
          <div className="w-2 h-2 rounded-full bg-blue-500" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium text-warm-900 leading-snug ${todo.status === 'complete' ? 'line-through text-warm-400' : ''}`}>
          {todo.title}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${PRIORITY_STYLES[todo.priority]}`}>
            {PRIORITY_LABELS[todo.priority]}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_STYLES[todo.status]}`}>
            {STATUS_LABELS[todo.status]}
          </span>
          {todo.assigned_to_name && (
            <span className="text-xs text-warm-500">→ {todo.assigned_to_name}</span>
          )}
          {todo.due_date && (
            <span className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-warm-400'}`}>
              {overdue ? '⚠ ' : ''}Due {fmtDate(todo.due_date)}
            </span>
          )}
          {todo.team_name && (
            <span className="text-xs text-warm-400 bg-warm-100 px-1.5 py-0.5 rounded">{todo.team_name}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      {canEdit && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => { setDraft({ ...todo }); setEditing(true) }}
            className="text-xs text-warm-400 hover:text-primary-600 px-2 py-1 rounded hover:bg-primary-50 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="text-xs text-warm-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Todos() {
  const { user } = useAuth()
  const [todos, setTodos]       = useState([])
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [adding, setAdding]     = useState(false)
  const [filter, setFilter]     = useState('active') // 'active' | 'mine' | 'complete' | 'all'

  const load = useCallback(() => {
    const params = {}
    if (filter === 'mine')     { params.mine = true }
    if (filter === 'complete') { params.status = 'complete' }

    Promise.all([
      api.get('/todos', { params }),
      api.get('/users'),
    ])
      .then(([todosRes, usersRes]) => {
        let data = todosRes.data
        if (filter === 'active') data = data.filter(t => t.status !== 'complete')
        setTodos(data)
        setUsers(usersRes.data.filter(u => u.active !== false))
      })
      .catch(() => setError('Failed to load to-dos'))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { setLoading(true); load() }, [load])

  const handleCreated = (todo) => {
    setTodos(prev => [todo, ...prev])
    setAdding(false)
  }
  const handleUpdate = (updated) => {
    setTodos(prev => {
      const next = prev.map(t => t.id === updated.id ? updated : t)
      if (filter === 'active') return next.filter(t => t.status !== 'complete')
      if (filter === 'complete') return next.filter(t => t.status === 'complete')
      return next
    })
  }
  const handleDelete = (id) => setTodos(prev => prev.filter(t => t.id !== id))

  const filters = [
    { key: 'active',   label: 'Active' },
    { key: 'mine',     label: 'Mine' },
    { key: 'complete', label: 'Complete' },
    { key: 'all',      label: 'All' },
  ]

  const overdueCount = todos.filter(t => isOverdue(t.due_date, t.status)).length

  if (error) return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-900 mb-1">To-Dos</h1>
      <div className="card p-6 mt-4 border-l-4 border-l-red-500">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-warm-900 mb-1">To-Dos</h1>
          <p className="text-warm-500 text-sm">
            Dream Centers of Colorado Springs
            {overdueCount > 0 && (
              <span className="ml-2 text-red-600 font-medium">· {overdueCount} overdue</span>
            )}
          </p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setAdding(a => !a)}>
          {adding ? 'Cancel' : '+ Add To-Do'}
        </button>
      </div>

      {adding && (
        <AddTodoForm users={users} onCreated={handleCreated} onCancel={() => setAdding(false)} />
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-primary-600 text-white'
                : 'text-warm-600 hover:bg-warm-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin h-7 w-7 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : todos.length === 0 ? (
          <div className="p-8 text-center text-warm-400 text-sm">
            {filter === 'mine' ? "No to-dos assigned to you." : "No to-dos found."}
            {filter === 'active' && (
              <button
                className="block mx-auto mt-3 text-primary-600 hover:text-primary-800 font-medium text-sm"
                onClick={() => setAdding(true)}
              >+ Add the first to-do</button>
            )}
          </div>
        ) : (
          <div>
            {todos.map(todo => (
              <TodoRow
                key={todo.id}
                todo={todo}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
