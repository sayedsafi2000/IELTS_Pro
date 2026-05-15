import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, user } = useAuth()
  const navigate = useNavigate()

  if (user) {
    navigate(user.role === 'ADMIN' ? '/admin' : user.role === 'EXAMINER' ? '/examiner' : '/dashboard')
    return null
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(email, password)
      toast.success(`Welcome back, ${user.name}!`)
      navigate(user.role === 'ADMIN' ? '/admin' : user.role === 'EXAMINER' ? '/examiner' : '/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed')
    } finally { setLoading(false) }
  }

  const fillCredentials = (mail, pass) => {
    setEmail(mail)
    setPassword(pass)
  }

  const testAccounts = [
    { role: 'Admin',   email: 'admin@ieltsplatform.com', password: 'Admin@123' },
    { role: 'Student', email: 'student1@test.com',       password: 'Student@123' }
  ]

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-8">Login to IELTS Pro</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="input" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base font-bold justify-center">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-dashed border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-900/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-surface-500 mb-3">Test credentials</p>
          <div className="space-y-2">
            {testAccounts.map(acc => (
              <button
                type="button"
                key={acc.email}
                onClick={() => fillCredentials(acc.email, acc.password)}
                className="w-full text-left rounded-lg bg-white dark:bg-surface-800 hover:bg-brand-50 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700 px-3 py-2 text-sm transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-brand-600 dark:text-brand-400">{acc.role}</span>
                  <span className="text-[10px] text-surface-400">tap to fill</span>
                </div>
                <div className="font-mono text-xs text-surface-700 dark:text-surface-300 truncate">{acc.email}</div>
                <div className="font-mono text-xs text-surface-500">{acc.password}</div>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center mt-6 text-surface-500">Don't have an account? <Link to="/register" className="text-brand-600 dark:text-brand-400 hover:underline font-medium">Register</Link></p>
      </div>
    </div>
  )
}