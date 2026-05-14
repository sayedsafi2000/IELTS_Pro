import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { clsx } from 'clsx'
import ThemeToggle from './ui/ThemeToggle'
import Avatar from './ui/Avatar'
import { LayoutDashboard, ClipboardCheck, Plug, LogOut, Bell, Video } from 'lucide-react'

const nav = [
  { path: '/examiner', label: 'Sessions', icon: Video },
  { path: '/examiner/evaluate', label: 'Evaluate', icon: ClipboardCheck },
  { path: '/examiner/integrations', label: 'Integrations', icon: Plug },
]

export default function ExaminerLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const isActive = (path) => location.pathname === path || (path !== '/examiner' && location.pathname.startsWith(path))

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex">
      <aside className="w-60 bg-white dark:bg-surface-800 border-r border-surface-200 dark:border-surface-700 flex flex-col fixed h-full z-30">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-surface-200 dark:border-surface-700">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">EX</span>
          </div>
          <span className="font-semibold text-surface-900 dark:text-white">Examiner</span>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto space-y-1">
          {nav.map(item => (
            <Link key={item.path} to={item.path}
              className={clsx(
                'flex items-center gap-3 mx-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                isActive(item.path)
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 font-medium'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800'
              )}>
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-3 mb-3">
            <Avatar name={user?.name || ''} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-surface-700 dark:text-surface-200 truncate">{user?.name}</p>
              <p className="text-xs text-surface-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors w-full">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>
      <div className="flex-1 ml-60">
        <header className="h-16 bg-white/80 dark:bg-surface-800/80 backdrop-blur-md border-b border-surface-200 dark:border-surface-700 flex items-center justify-between px-6 sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Examiner Portal</h2>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Bell className="w-4 h-4 text-surface-500" />
            <Avatar name={user?.name || ''} size="sm" />
          </div>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
