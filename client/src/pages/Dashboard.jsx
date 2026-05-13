import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import BandGauge from '../components/ui/BandGauge'
import Avatar from '../components/ui/Avatar'
import { FileText, Headphones, BookOpen, PenLine, Mic, Clock, ArrowRight, Trophy, Target, TrendingUp, Star, Bell } from 'lucide-react'

const moduleIcons = { LISTENING: Headphones, READING: BookOpen, WRITING: PenLine, SPEAKING: Mic }
const moduleColors = {
  LISTENING: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  READING: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  WRITING: 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  SPEAKING: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data: sessions, isLoading: sLoading } = useQuery({ queryKey: ['my-sessions'], queryFn: () => api.get('/sessions/my').then(r => r.data) })
  const { data: notifications } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/notifications').then(r => r.data) })
  const { data: results, isLoading: rLoading } = useQuery({ queryKey: ['my-results'], queryFn: () => api.get('/results/student/my').then(r => r.data) })
  const { data: enrollments } = useQuery({ queryKey: ['student-enrollments'], queryFn: () => api.get('/enrollments/student/my').then(r => r.data) })

  const completedSessions = sessions?.filter(s => s.status === 'SUBMITTED' || s.status === 'EVALUATED') || []
  const bestBand = results?.reduce((max, r) => Math.max(max, r.overallBand || 0), 0) || null
  const lastBand = results?.[results.length - 1]?.overallBand || null
  const approvedEnrollments = enrollments?.filter(e => e.status === 'APPROVED') || []
  const pendingEnrollments = enrollments?.filter(e => e.status === 'PENDING') || []

  const chartData = results?.slice(0, 8).reverse().map((r, i) => ({
    name: `T${i + 1}`,
    overall: r.overallBand || 0,
  })) || []

  const unread = notifications?.filter(n => !n.isRead).length || 0
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'

  if (sLoading || rLoading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-purple-700 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvZz48L3N2Zz4=')] opacity-20" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-brand-200 text-sm mb-1">{greeting}</p>
            <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.name?.split(' ')[0]}!</h1>
            <div className="flex items-center gap-4 text-sm text-brand-100">
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4" /> {approvedEnrollments.length} enrolled tests
              </span>
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> {completedSessions.length} completed
              </span>
              {pendingEnrollments.length > 0 && (
                <span className="flex items-center gap-1.5 bg-amber-500/30 px-3 py-1 rounded-full">
                  <Clock className="w-4 h-4" /> {pendingEnrollments.length} pending
                </span>
              )}
            </div>
          </div>
          {lastBand && (
            <div className="text-center">
              <p className="text-xs text-brand-200 mb-2">Latest Band</p>
              <BandGauge score={lastBand} size={100} />
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 group hover:shadow-card transition-all" elevated>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">{completedSessions.length}</p>
              <p className="text-xs text-surface-400">Tests Taken</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 group hover:shadow-card transition-all" elevated>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Trophy className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">{bestBand?.toFixed(1) || '—'}</p>
              <p className="text-xs text-surface-400">Best Band</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 group hover:shadow-card transition-all" elevated>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Target className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">{lastBand?.toFixed(1) || '—'}</p>
              <p className="text-xs text-surface-400">Last Band</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 group hover:shadow-card transition-all" elevated>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">{approvedEnrollments.length}</p>
              <p className="text-xs text-surface-400">Enrolled Tests</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress Chart & Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Progress Chart */}
        {chartData.length > 0 && (
          <Card className="lg:col-span-2 p-6" elevated>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-surface-900 dark:text-white">Your Progress</h3>
                <p className="text-xs text-surface-400 mt-1">Band score over time</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-500" /> Overall</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 9]} ticks={[0, 3, 6, 9]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="overall" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="p-6" elevated>
          <h3 className="font-semibold text-surface-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link to="/enroll" className="flex items-center gap-3 p-4 rounded-xl bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-brand-700 dark:text-brand-400">Enroll in Tests</p>
                <p className="text-xs text-brand-600 dark:text-brand-500">Browse available mock tests</p>
              </div>
              <ArrowRight className="w-4 h-4 text-brand-500" />
            </Link>
            <Link to="/results" className="flex items-center gap-3 p-4 rounded-xl bg-surface-50 dark:bg-surface-700/50 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-surface-200 dark:bg-surface-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-surface-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-surface-700 dark:text-surface-200">View Results</p>
                <p className="text-xs text-surface-400">Check your performance</p>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-400" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent Tests & Notifications */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Enrolled Tests */}
        <Card className="p-6" elevated>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900 dark:text-white">My Tests</h3>
            <Link to="/enroll" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1">
              Browse more <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {approvedEnrollments.slice(0, 4).map(enrollment => {
              const session = sessions?.find(s => s.testId === enrollment.testId && s.status === 'IN_PROGRESS')
              const completed = sessions?.find(s => s.testId === enrollment.testId && s.status === 'SUBMITTED')
              return (
                <div key={enrollment.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-700 dark:text-surface-200 truncate">{enrollment.test?.title}</p>
                    <p className="text-xs text-surface-400">{enrollment.test?.modules?.length || 0} modules</p>
                  </div>
                  <div className="shrink-0">
                    {session ? (
                      <Link to={`/test/${session.id}`} className="btn-primary text-xs py-1.5 px-3">
                        Resume
                      </Link>
                    ) : completed ? (
                      <Badge variant="success">Completed</Badge>
                    ) : (
                      <Link to={`/tests/${enrollment.testId}`} className="btn-ghost text-xs py-1.5 px-3">
                        Start
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
            {approvedEnrollments.length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-surface-300 mx-auto mb-2" />
                <p className="text-sm text-surface-400">No enrolled tests yet</p>
                <Link to="/enroll" className="btn-primary text-sm mt-3">Browse Tests</Link>
              </div>
            )}
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6" elevated>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900 dark:text-white">Notifications</h3>
            {unread > 0 && <Badge variant="danger">{unread} new</Badge>}
          </div>
          <div className="space-y-2">
            {notifications?.slice(0, 5).map(n => (
              <div key={n.id} className={clsx(
                'p-3 rounded-xl transition-colors',
                !n.isRead ? 'bg-brand-50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-800' : 'hover:bg-surface-50 dark:hover:bg-surface-800/50'
              )}>
                <p className="text-sm font-medium text-surface-700 dark:text-surface-200">{n.title}</p>
                <p className="text-xs text-surface-400 mt-0.5 line-clamp-2">{n.message}</p>
              </div>
            ))}
            {(!notifications || notifications.length === 0) && (
              <div className="text-center py-8">
                <Bell className="w-10 h-10 text-surface-300 mx-auto mb-2" />
                <p className="text-sm text-surface-400">No notifications</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}