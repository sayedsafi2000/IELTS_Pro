import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from './SharedComponents'

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" />
  if (role && user.role !== role) return <Navigate to={user.role === 'ADMIN' ? '/admin' : user.role === 'EXAMINER' ? '/examiner' : '/dashboard'} />
  return children
}