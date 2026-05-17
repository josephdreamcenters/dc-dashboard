import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import toast from 'react-hot-toast'

function Section({ title, children }) {
  return (
    <div className="card p-6 mb-5">
      <h2 className="text-base font-semibold text-warm-900 mb-4 pb-3 border-b border-warm-100">{title}</h2>
      {children}
    </div>
  )
}

export default function Profile() {
  const { user, logout } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Name / title form
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)

  // Email form
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    api.get('/users/me')
      .then(({ data }) => {
        setProfile(data)
        setName(data.name ?? '')
        setTitle(data.title ?? '')
        setNewEmail(data.email ?? '')
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  const saveInfo = async (e) => {
    e.preventDefault()
    setSavingInfo(true)
    try {
      await api.put(`/users/${user.id}`, { name, title })
      toast.success('Profile updated — changes will show on next login')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setSavingInfo(false)
    }
  }

  const saveEmail = async (e) => {
    e.preventDefault()
    if (!newEmail || newEmail === profile?.email) {
      toast.error('Enter a new email address')
      return
    }
    setSavingEmail(true)
    try {
      await api.put(`/users/${user.id}`, { email: newEmail, current_password: emailPassword })
      toast.success('Email updated — please log in again with your new email')
      setTimeout(logout, 2000)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update email')
    } finally {
      setSavingEmail(false)
      setEmailPassword('')
    }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setSavingPassword(true)
    try {
      await api.put(`/users/${user.id}`, { password: newPassword, current_password: currentPassword })
      toast.success('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-warm-900 mb-1">My Profile</h1>
      <p className="text-warm-500 text-sm mb-6">Manage your account information and password</p>

      {/* Read-only account info */}
      <div className="card p-6 mb-5 bg-warm-50 border-warm-200">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {profile?.name?.charAt(0) ?? '?'}
          </div>
          <div>
            <p className="font-semibold text-warm-900">{profile?.name}</p>
            <p className="text-sm text-warm-500">{profile?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded font-medium capitalize">{profile?.role}</span>
              {profile?.team_name && <span className="text-xs text-warm-500">{profile.team_name}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Name & Title */}
      <Section title="Name & Title">
        <form onSubmit={saveInfo} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Job title</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Director of Operations" />
          </div>
          <button type="submit" className="btn-primary" disabled={savingInfo}>
            {savingInfo ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </Section>

      {/* Email */}
      <Section title="Email address">
        <form onSubmit={saveEmail} className="space-y-4">
          <div>
            <label className="label">New email address</label>
            <input className="input" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Current password (required to change email)</label>
            <input className="input" type="password" value={emailPassword} onChange={e => setEmailPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <p className="text-xs text-warm-500">You will be logged out automatically after changing your email.</p>
          <button type="submit" className="btn-primary" disabled={savingEmail}>
            {savingEmail ? 'Updating…' : 'Update email'}
          </button>
        </form>
      </Section>

      {/* Password */}
      <Section title="Change password">
        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <label className="label">Current password</label>
            <input className="input" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <div>
            <label className="label">New password</label>
            <input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input className="input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <button type="submit" className="btn-primary" disabled={savingPassword}>
            {savingPassword ? 'Changing…' : 'Change password'}
          </button>
        </form>
      </Section>
    </div>
  )
}
