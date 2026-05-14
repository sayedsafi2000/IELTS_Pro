import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { clsx } from 'clsx'
import ThemeToggle from './ui/ThemeToggle'
import Avatar from './ui/Avatar'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { Bell, Home, FileText, BarChart2, User, LogOut, GraduationCap, ChevronRight, Video } from 'lucide-react'

function NotificationBell() {
  const { data } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/notifications').then(r => r.data) })
  const unread = data?.filter(n => !n.isRead).length || 0
  return (
    <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
      <Bell className="w-5 h-5 text-surface-500" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-medium">{unread}</span>
      )}
    </Link>
  )
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/enroll', label: 'Enroll Tests', icon: GraduationCap },
  { path: '/tests', label: 'My Tests', icon: FileText },
  { path: '/my-speaking', label: 'Speaking Sessions', icon: Video },
  { path: '/results', label: 'Results', icon: BarChart2 },
  { path: '/profile', label: 'Profile', icon: User },
]

export default function StudentLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-surface-800 border-r border-surface-200 dark:border-surface-700 flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-surface-100 dark:border-surface-700">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">IP</span>
            </div>
            <div>
              <span className="font-bold text-lg text-surface-900 dark:text-white">IELTS Pro</span>
              <p className="text-xs text-surface-400">Student Portal</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path
            return (
              <Link key={item.path} to={item.path}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border-l-4 border-l-brand-500'
                    : 'text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white hover:bg-surface-50 dark:hover:bg-surface-700'
                )}>
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 text-brand-500" />}
              </Link>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-surface-100 dark:border-surface-700">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-700/50 mb-3">
            <Avatar name={user?.name || ''} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-xs text-surface-400 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={logout} className="flex-1 btn-ghost text-sm justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
              <LogOut className="w-4 h-4" />
              Logout
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between px-4 shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">IP</span>
            </div>
            <span className="font-semibold text-surface-900 dark:text-white">IELTS Pro</span>
          </Link>
          <NotificationBell />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}