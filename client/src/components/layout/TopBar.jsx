import { BellIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function TopBar() {
  const { user, logout } = useAuth()

  return (
    <header className="h-14 bg-white border-b border-warm-200 flex items-center justify-between px-6 shrink-0 no-print">
      <div />
      <div className="flex items-center gap-4">
        <button className="relative p-1.5 rounded hover:bg-warm-100 text-warm-600 transition-colors">
          <BellIcon className="h-5 w-5" />
        </button>
        <Link to="/profile" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-semibold">
            {user?.name?.charAt(0) ?? '?'}
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-warm-900 leading-none">{user?.name}</p>
            <p className="text-xs text-warm-500 mt-0.5 capitalize">{user?.role}</p>
          </div>
        </Link>
        <button
          onClick={logout}
          className="p-1.5 rounded hover:bg-warm-100 text-warm-500 hover:text-warm-700 transition-colors"
          title="Sign out"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
