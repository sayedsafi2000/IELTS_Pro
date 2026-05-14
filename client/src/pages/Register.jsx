import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const { register, user } = useAuth()
  const navigate = useNavigate()

  if (user) {
    navigate(user.role === 'ADMIN' ? '/admin' : user.role === 'EXAMINER' ? '/examiner' : '/dashboard')
    return null
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await register(form.name, form.email, form.password, form.phone)
      toast.success(`Welcome, ${user.name}!`)
      navigate(user.role === 'ADMIN' ? '/admin' : user.role === 'EXAMINER' ? '/examiner' : '/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-8">Create Your Account</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Full Name</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Phone (optional)</label>
            <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Password</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} className="input" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base font-bold justify-center">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="text-center mt-6 text-surface-500">Already have an account? <Link to="/login" className="text-brand-600 dark:text-brand-400 hover:underline font-medium">Login</Link></p>
      </div>
    </div>
  )
}