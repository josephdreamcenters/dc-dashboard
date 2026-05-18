import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

const ROLE_LABELS = { ceo: 'CEO', admin: 'Admin', director: 'Director', staff: 'Staff' }
const ROLE_COLORS = {
  ceo:      'bg-accent-100 text-accent-700',
  admin:    'bg-primary-100 text-primary-700',
  director: 'bg-blue-100 text-blue-700',
  staff:    'bg-warm-100 text-warm-500',
}

function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── User form ─────────────────────────────────────────────────────────────────

function UserForm({ user: initial, allUsers, teams, onSaved, onCancel }) {
  const isNew = !initial
  const [form, setForm] = useState({
    name:       initial?.name       ?? '',
    email:      initial?.email      ?? '',
    password:   '',
    role:       initial?.role       ?? 'staff',
    title:      initial?.title      ?? '',
    team_id:    initial?.team_id    ?? '',
    reports_to: initial?.reports_to ?? '',
    part_time:  initial?.part_time  ?? false,
    active:     initial?.active     ?? true,
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        name:       form.name,
        email:      form.email,
        role:       form.role,
        title:      form.title      || null,
        team_id:    form.team_id    || null,
        reports_to: form.reports_to || null,
        part_time:  form.part_time,
        active:     form.active,
      }
      if (form.password) body.password = form.password

      let data
      if (isNew) {
        ;({ data } = await api.post('/users', body))
      } else {
        ;({ data } = await api.put(`/users/${initial.id}`, body))
      }
      onSaved(data, isNew)
      toast.success(isNew ? 'User created' : 'User updated')
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Full Name</label>
          <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <label className="label">{isNew ? 'Password' : 'New Password (leave blank to keep)'}</label>
          <input className="input" type="password" required={isNew} value={form.password} onChange={e => set('password', e.target.value)} />
        </div>
        <div>
          <label className="label">Job Title</label>
          <input className="input" value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Team</label>
          <select className="input" value={form.team_id} onChange={e => set('team_id', e.target.value)}>
            <option value="">No team</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Reports To</label>
          <select className="input" value={form.reports_to} onChange={e => set('reports_to', e.target.value)}>
            <option value="">None</option>
            {allUsers.filter(u => u.id !== initial?.id).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-4 pt-5">
          <label className="flex items-center gap-2 text-sm text-warm-700 cursor-pointer">
            <input type="checkbox" checked={form.part_time} onChange={e => set('part_time', e.target.checked)} className="rounded" />
            Part-time
          </label>
          <label className="flex items-center gap-2 text-sm text-warm-700 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="rounded" />
            Active
          </label>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button className="btn-primary text-sm" type="submit" disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Create User' : 'Save Changes'}
        </button>
        <button className="btn-secondary text-sm" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// ── Users tab ─────────────────────────────────────────────────────────────────

function UsersTab({ users, teams, onUpdate }) {
  const [editingId, setEditingId] = useState(null)
  const [adding,    setAdding]    = useState(false)
  const [search,    setSearch]    = useState('')

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleSaved = (saved, isNew) => {
    if (isNew) onUpdate(prev => [saved, ...prev])
    else       onUpdate(prev => prev.map(u => u.id === saved.id ? saved : u))
    setEditingId(null)
    setAdding(false)
  }

  const handleDeactivate = async (u) => {
    if (!confirm(`${u.active ? 'Deactivate' : 'Reactivate'} ${u.name}?`)) return
    try {
      const { data } = await api.put(`/users/${u.id}`, { active: !u.active })
      onUpdate(prev => prev.map(x => x.id === data.id ? data : x))
      toast.success(`${u.name} ${u.active ? 'deactivated' : 'reactivated'}`)
    } catch {
      toast.error('Failed to update user')
    }
  }

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input
          className="input flex-1"
          placeholder="Search users…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="btn-primary text-sm shrink-0" onClick={() => { setAdding(true); setEditingId(null) }}>
          + Add User
        </button>
      </div>

      {adding && (
        <div className="card p-5 mb-4 border-l-4 border-l-primary-400">
          <h3 className="text-sm font-semibold text-warm-900 mb-4">New User</h3>
          <UserForm allUsers={users} teams={teams} onSaved={handleSaved} onCancel={() => setAdding(false)} />
        </div>
      )}

      <div className="card overflow-hidden">
        {filtered.map(u => (
          <div key={u.id} className={`border-b border-warm-50 last:border-0 ${!u.active ? 'opacity-50' : ''}`}>
            {editingId === u.id ? (
              <div className="p-4">
                <UserForm
                  user={u}
                  allUsers={users}
                  teams={teams}
                  onSaved={handleSaved}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 group hover:bg-warm-50">
                <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {u.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-warm-900 truncate">{u.name}</p>
                  <p className="text-xs text-warm-400 truncate">{u.email} · {u.title || '—'}</p>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[u.role] ?? ''}`}>
                  {ROLE_LABELS[u.role] ?? u.role}
                </span>
                {u.team_name && <span className="text-xs text-warm-400 hidden sm:block">{u.team_name}</span>}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingId(u.id); setAdding(false) }}
                    className="text-xs text-warm-400 hover:text-primary-600 px-2 py-1 rounded hover:bg-primary-50">
                    Edit
                  </button>
                  <button onClick={() => handleDeactivate(u)}
                    className={`text-xs px-2 py-1 rounded ${u.active ? 'text-warm-400 hover:text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                    {u.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-6 text-center text-warm-400 text-sm">No users found.</div>
        )}
      </div>
    </div>
  )
}

// ── WIGs tab ──────────────────────────────────────────────────────────────────

function WIGsTab({ teams }) {
  const [wigs,    setWigs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [adding,  setAdding]  = useState(false)
  const [form,    setForm]    = useState({ title: '', team_id: '', wig_type: 'numeric', start_value: '', target_value: '' })
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    api.get('/wigs')
      .then(({ data }) => setWigs(data))
      .finally(() => setLoading(false))
  }, [])

  const createWIG = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.post('/wigs', {
        title:        form.title,
        team_id:      form.team_id || null,
        wig_type:     form.wig_type,
        start_value:  form.start_value  !== '' ? parseFloat(form.start_value)  : null,
        target_value: form.target_value !== '' ? parseFloat(form.target_value) : null,
      })
      setWigs(prev => [...prev, data])
      setForm({ title: '', team_id: '', wig_type: 'numeric', start_value: '', target_value: '' })
      setAdding(false)
      toast.success('WIG created')
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to create WIG')
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async (wig) => {
    if (!confirm(`Deactivate "${wig.title}"?`)) return
    await api.delete(`/wigs/${wig.id}`)
    setWigs(prev => prev.filter(w => w.id !== wig.id))
    toast.success('WIG deactivated')
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-6 w-6 border-4 border-primary-600 border-t-transparent rounded-full" /></div>

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary text-sm" onClick={() => setAdding(a => !a)}>
          {adding ? 'Cancel' : '+ Add WIG'}
        </button>
      </div>

      {adding && (
        <form onSubmit={createWIG} className="card p-4 mb-4 border-l-4 border-l-primary-400">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input className="input col-span-2" required placeholder="WIG title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <select className="input" value={form.team_id} onChange={e => setForm(f => ({ ...f, team_id: e.target.value }))}>
              <option value="">No team</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select className="input" value={form.wig_type} onChange={e => setForm(f => ({ ...f, wig_type: e.target.value }))}>
              <option value="numeric">Numeric</option>
              <option value="percentage">Percentage</option>
              <option value="milestone">Milestone</option>
            </select>
            {form.wig_type !== 'milestone' && (
              <>
                <input className="input" type="number" step="any" placeholder="Start value" value={form.start_value} onChange={e => setForm(f => ({ ...f, start_value: e.target.value }))} />
                <input className="input" type="number" step="any" placeholder="Target value" value={form.target_value} onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))} />
              </>
            )}
          </div>
          <button className="btn-primary text-sm" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create WIG'}</button>
        </form>
      )}

      <div className="card overflow-hidden">
        {wigs.map(w => (
          <div key={w.id} className="flex items-center gap-3 px-4 py-3 border-b border-warm-50 last:border-0 group hover:bg-warm-50">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-warm-900 leading-snug">{w.title}</p>
              <p className="text-xs text-warm-400 mt-0.5">
                {w.team_name ?? 'No team'} · {w.wig_type}
                {w.target_value != null ? ` · Target: ${Number(w.target_value).toLocaleString()}` : ''}
              </p>
            </div>
            <button
              onClick={() => deactivate(w)}
              className="text-xs text-warm-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Deactivate
            </button>
          </div>
        ))}
        {wigs.length === 0 && <div className="p-6 text-center text-warm-400 text-sm">No active WIGs.</div>}
      </div>
    </div>
  )
}

// ── Integrations tab ──────────────────────────────────────────────────────────

function IntegrationsTab() {
  const [status, setStatus] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/bhag')
      .then(() => {})
      .catch(() => {})

    // Fetch integration status via a dedicated query
    fetch(`${import.meta.env.VITE_API_URL}/health`, { headers: { Authorization: `Bearer ${localStorage.getItem('dc_token')}` } })
      .then(r => r.json())
      .then(() => {
        const integrations = [
          { source: 'virtuous',     label: 'Virtuous CRM',    description: 'Donor management & Dream Makers count' },
          { source: 'salesforce',   label: 'Salesforce',      description: "Mary's Home occupancy data" },
          { source: 'athena',       label: 'Athena Health',   description: "Women's Clinic patient count" },
          { source: 'volunteerhub', label: 'VolunteerHub',    description: 'Volunteer engagement data' },
        ]
        setStatus(integrations)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-6 w-6 border-4 border-primary-600 border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-3">
      <p className="text-sm text-warm-500 mb-4">
        External integrations automatically sync WIG data. Contact your administrator to configure API credentials.
      </p>
      {status.map(s => (
        <div key={s.source} className="card p-4 flex items-center gap-4">
          <div className="w-2.5 h-2.5 rounded-full bg-warm-300 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-warm-900">{s.label}</p>
            <p className="text-xs text-warm-400">{s.description}</p>
          </div>
          <span className="text-xs text-warm-400 font-medium">Not configured</span>
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Admin() {
  const { user } = useAuth()
  const [tab,     setTab]     = useState('users')
  const [users,   setUsers]   = useState([])
  const [teams,   setTeams]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const isAdmin = user?.role === 'admin' || user?.role === 'ceo'

  useEffect(() => {
    Promise.all([api.get('/users'), api.get('/users')])
      .then(([uRes]) => {
        const all = uRes.data
        setUsers(all)
        const teamMap = {}
        all.forEach(u => {
          if (u.team_id && u.team_name) teamMap[u.team_id] = { id: u.team_id, name: u.team_name }
        })
        setTeams(Object.values(teamMap).sort((a, b) => a.name.localeCompare(b.name)))
      })
      .catch(() => setError('Failed to load admin data'))
      .finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'users',        label: 'Users' },
    { key: 'wigs',         label: 'WIGs' },
    { key: 'integrations', label: 'Integrations' },
  ]

  if (!isAdmin) return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-900 mb-1">Admin Panel</h1>
      <div className="card p-6 mt-4 border-l-4 border-l-red-500">
        <p className="text-red-700 text-sm">You don't have permission to access the admin panel.</p>
      </div>
    </div>
  )

  if (error) return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-900 mb-1">Admin Panel</h1>
      <div className="card p-6 mt-4 border-l-4 border-l-red-500">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    </div>
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-warm-900 mb-1">Admin Panel</h1>
        <p className="text-warm-500 text-sm">Dream Centers of Colorado Springs · System Administration</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-5 border-b border-warm-100">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-warm-500 hover:text-warm-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-7 w-7 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {tab === 'users'        && <UsersTab users={users} teams={teams} onUpdate={setUsers} />}
          {tab === 'wigs'         && <WIGsTab teams={teams} />}
          {tab === 'integrations' && <IntegrationsTab />}
        </>
      )}
    </div>
  )
}
