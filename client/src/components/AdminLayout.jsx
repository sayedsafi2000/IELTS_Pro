import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { clsx } from 'clsx'
import ThemeToggle from './ui/ThemeToggle'
import Avatar from './ui/Avatar'
import { LayoutDashboard, FileText, Users, UserPlus, ClipboardCheck, ScrollText, LogOut, Bell, Video } from 'lucide-react'

const mainNav = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/sessions', label: 'Sessions', icon: ScrollText },
  { path: '/admin/tests', label: 'Tests', icon: FileText },
  { path: '/admin/students', label: 'Students', icon: Users },
  { path: '/admin/enrollments', label: 'Approvals', icon: ClipboardCheck },
  { path: '/admin/enroll', label: 'Assign Tests', icon: UserPlus },
]

const evalNav = [
  { path: '/admin/evaluate', label: 'Evaluate', icon: ClipboardCheck },
  { path: '/admin/live-speaking', label: 'Live Speaking', icon: Video },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const isActive = (path) => location.pathname === path || (path !== '/admin' && location.pathname.startsWith(path))

  const headerTitle = (() => {
    const p = location.pathname.replace(/\/$/, '')
    const parts = p.split('/').filter(Boolean)
    if (parts.length <= 1) return 'Dashboard'
    const section = parts[1]
    if (section === 'sessions' && parts[2]) return 'Session result'
    if (section === 'sessions') return 'Test sessions'
    if (section === 'tests' && parts[2] === 'new') return 'New test'
    if (section === 'tests' && parts[2]) return 'Edit test'
    if (section === 'tests') return 'Tests'
    if (section === 'students') return 'Students'
    if (section === 'enroll') return 'Assign tests'
    if (section === 'enrollments') return 'Enrollment approvals'
    if (section === 'evaluate') return 'Evaluate'
    return section.replace(/-/g, ' ')
  })()

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white dark:bg-surface-800 border-r border-surface-200 dark:border-surface-700 flex flex-col fixed h-full z-30">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-surface-200 dark:border-surface-700">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">IP</span>
          </div>
          <span className="font-semibold text-surface-900 dark:text-white">IELTS Pro</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto space-y-6">
          <div>
            <p className="section-label px-5 mb-2">Main</p>
            {mainNav.map(item => (
              <Link key={item.path} to={item.path}
                className={clsx(
                  'flex items-center gap-3 mx-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                  isActive(item.path)
                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 font-medium'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-100'
                )}>
                <item.icon className={clsx('w-4 h-4 shrink-0', isActive(item.path) && 'text-brand-500')} />
                {item.label}
              </Link>
            ))}
          </div>
          <div>
            <p className="section-label px-5 mb-2">Evaluation</p>
            {evalNav.map(item => (
              <Link key={item.path} to={item.path}
                className={clsx(
                  'flex items-center gap-3 mx-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                  isActive(item.path)
                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 font-medium'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-100'
                )}>
                <item.icon className={clsx('w-4 h-4 shrink-0', isActive(item.path) && 'text-brand-500')} />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Bottom */}
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

      {/* Main Content */}
      <div className="flex-1 ml-60">
        {/* Top Bar */}
        <header className="h-16 bg-white/80 dark:bg-surface-800/80 backdrop-blur-md border-b border-surface-200 dark:border-surface-700 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white capitalize">
              {headerTitle}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors relative">
              <Bell className="w-4 h-4 text-surface-500" />
            </button>
            <Avatar name={user?.name || ''} size="sm" />
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}