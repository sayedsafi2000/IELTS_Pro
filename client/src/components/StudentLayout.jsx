import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { clsx } from 'clsx'
import ThemeToggle from './ui/ThemeToggle'
import Avatar from './ui/Avatar'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { Bell, Home, FileText, BarChart2, User } from 'lucide-react'

function NotificationBell() {
  const { data } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/notifications').then(r => r.data) })
  const unread = data?.filter(n => !n.isRead).length || 0
  return (
    <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
      <Bell className="w-4 h-4 text-surface-500" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-medium">{unread}</span>
      )}
    </Link>
  )
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/tests', label: 'My Tests', icon: FileText },
  { path: '/results', label: 'Results', icon: BarChart2 },
  { path: '/profile', label: 'Profile', icon: User },
]

export default function StudentLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      {/* Navbar */}
      <header className="h-16 bg-white/80 dark:bg-surface-800/80 backdrop-blur-md border-b border-surface-200 dark:border-surface-700 flex items-center justify-between px-6 sticky top-0 z-30">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">IP</span>
          </div>
          <span className="font-semibold text-surface-900 dark:text-white hidden sm:block">IELTS Pro</span>
        </Link>

        {/* Nav Links */}
        <nav className="flex items-center gap-1">
          {navItems.map(item => (
            <Link key={item.path} to={item.path}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                location.pathname === item.path
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100'
              )}>
              {location.pathname === item.path && <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
          <div className="flex items-center gap-3 ml-2 pl-2 border-l border-surface-200 dark:border-surface-700">
            <Avatar name={user?.name || ''} size="sm" />
            <div className="hidden md:block">
              <p className="text-sm font-medium text-surface-700 dark:text-surface-200">{user?.name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}