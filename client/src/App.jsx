import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import StudentLayout from './components/StudentLayout'
import AdminLayout from './components/AdminLayout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Tests from './pages/Tests'
import TestDetail from './pages/TestDetail'
import ActiveTest from './pages/ActiveTest'
import Results from './pages/Results'
import ResultDetail from './pages/ResultDetail'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import AdminDashboard from './pages/AdminDashboard'
import AdminTests from './pages/AdminTests'
import AdminTestEdit from './pages/AdminTestEdit'
import AdminStudents from './pages/AdminStudents'
import AdminEnroll from './pages/AdminEnroll'
import EnrollTests from './pages/EnrollTests'
import AdminEnrollments from './pages/AdminEnrollments'
import AdminEvaluate from './pages/AdminEvaluate'
import AdminSessions from './pages/AdminSessions'
import { PageLoader } from './components/SharedComponents'

function RequireAuth({ role, children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" />
  if (role && user.role !== role) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/dashboard'} />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>
        <Route path="/dashboard" element={<RequireAuth role="STUDENT"><StudentLayout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
        </Route>
        <Route path="/tests" element={<RequireAuth role="STUDENT"><StudentLayout /></RequireAuth>}>
          <Route index element={<Tests />} />
        </Route>
        <Route path="/tests/:id" element={<RequireAuth role="STUDENT"><StudentLayout /></RequireAuth>}>
          <Route index element={<TestDetail />} />
        </Route>
        <Route path="/test/:sessionId" element={<RequireAuth role="STUDENT"><StudentLayout /></RequireAuth>}>
          <Route index element={<ActiveTest />} />
        </Route>
        <Route path="/results" element={<RequireAuth role="STUDENT"><StudentLayout /></RequireAuth>}>
          <Route index element={<Results />} />
        </Route>
        <Route path="/results/:sessionId" element={<RequireAuth role="STUDENT"><StudentLayout /></RequireAuth>}>
          <Route index element={<ResultDetail />} />
        </Route>
        <Route path="/profile" element={<RequireAuth><StudentLayout /></RequireAuth>}>
          <Route index element={<Profile />} />
        </Route>
        <Route path="/enroll" element={<RequireAuth role="STUDENT"><StudentLayout /></RequireAuth>}>
          <Route index element={<EnrollTests />} />
        </Route>
        <Route path="/notifications" element={<RequireAuth><StudentLayout /></RequireAuth>}>
          <Route index element={<Notifications />} />
        </Route>
        <Route path="/admin" element={<RequireAuth role="ADMIN"><AdminLayout /></RequireAuth>}>
          <Route index element={<AdminDashboard />} />
          <Route path="tests" element={<AdminTests />} />
          <Route path="tests/new" element={<AdminTestEdit />} />
          <Route path="tests/:id" element={<AdminTestEdit />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="enrollments" element={<AdminEnrollments />} />
          <Route path="enroll" element={<AdminEnroll />} />
          <Route path="evaluate" element={<AdminEvaluate />} />
          <Route path="sessions" element={<AdminSessions />} />
          <Route path="sessions/:sessionId" element={<ResultDetail />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthProvider>
  )
}