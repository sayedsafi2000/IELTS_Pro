import { Outlet, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ui/ThemeToggle'
import { LogOut } from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-surface-100 dark:bg-surface-800/90 dark:border-surface-700">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">IP</span>
            </div>
            <span className="font-bold text-lg text-surface-900 dark:text-white">IELTS Pro</span>
          </Link>

          <div className="flex items-center gap-2">
            <a href="#about" className="px-4 py-2 text-sm text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white transition-colors">About</a>
            <a href="#modules" className="px-4 py-2 text-sm text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white transition-colors">Modules</a>
            <a href="#how-it-works" className="px-4 py-2 text-sm text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white transition-colors">How It Works</a>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <Link to="/tests" className="btn-ghost text-sm">Sample Tests</Link>
                <Link to="/dashboard" className="btn-primary text-sm">Dashboard</Link>
                <button onClick={logout} className="btn-ghost text-sm flex items-center gap-1.5">
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-sm">Login</Link>
                <Link to="/register" className="btn-primary text-sm">Register</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <Outlet />

      {/* Footer */}
      <footer className="bg-surface-900 text-surface-400 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">IP</span>
                </div>
                <span className="font-bold text-white">IELTS Pro</span>
              </div>
              <p className="text-sm text-surface-500">Bangladesh's most advanced computer-based IELTS mock test platform.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Register</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Modules</h4>
              <ul className="space-y-2 text-sm">
                <li className="hover:text-white transition-colors cursor-pointer">Listening</li>
                <li className="hover:text-white transition-colors cursor-pointer">Reading</li>
                <li className="hover:text-white transition-colors cursor-pointer">Writing</li>
                <li className="hover:text-white transition-colors cursor-pointer">Speaking</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <p className="text-sm text-surface-500">info@ieltspro.com</p>
            </div>
          </div>
          <div className="border-t border-surface-800 mt-8 pt-8 text-center text-sm text-surface-500">
            © 2026 IELTS Pro. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}