import { NavLink } from 'react-router-dom'
import {
  HomeIcon,
  ChartBarIcon,
  FlagIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CalendarIcon,
  DocumentTextIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/',               label: 'Dashboard',            icon: HomeIcon },
  { to: '/scorecard',      label: 'Scorecard',            icon: ChartBarIcon },
  { to: '/wigs',           label: 'WIGs & Rocks',         icon: FlagIcon },
  { to: '/todos',          label: 'To-Dos',               icon: CheckCircleIcon },
  { to: '/issues',         label: 'Issues',               icon: ExclamationCircleIcon },
  { to: '/meetings',       label: 'Meetings',             icon: CalendarIcon },
  { to: '/vision',         label: 'Vision',               icon: DocumentTextIcon },
  { to: '/org-chart',      label: 'Accountability Chart', icon: UsersIcon },
  { to: '/check-in',       label: 'Weekly Check-In',      icon: ClipboardDocumentListIcon },
  { to: '/reviews',        label: 'Quarterly Reviews',    icon: ClipboardDocumentCheckIcon },
]

const adminItems = [
  { to: '/admin',          label: 'Admin Panel',          icon: Cog6ToothIcon },
]

export default function Sidebar() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isCEO = user?.role === 'ceo'

  return (
    <nav className="w-64 bg-primary-800 text-white flex flex-col shrink-0 no-print">
      <div className="px-6 py-5 border-b border-primary-700">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-300 mb-1">Dream Centers</p>
        <h1 className="text-lg font-bold text-white leading-tight">Operating System</h1>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-0.5 px-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white font-medium'
                      : 'text-primary-200 hover:bg-primary-700 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        {(isAdmin || isCEO) && (
          <>
            <div className="mx-3 my-3 border-t border-primary-700" />
            <ul className="space-y-0.5 px-3">
              {adminItems.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                        isActive
                          ? 'bg-primary-600 text-white font-medium'
                          : 'text-primary-200 hover:bg-primary-700 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="px-6 py-4 border-t border-primary-700">
        <p className="text-xs text-primary-400">Colorado Springs, CO</p>
      </div>
    </nav>
  )
}
