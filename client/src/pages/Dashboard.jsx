import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import BandGauge from '../components/ui/BandGauge'
import Avatar from '../components/ui/Avatar'
import Skeleton, { SkeletonCard } from '../components/ui/Skeleton'
import { FileText, Headphones, BookOpen, PenLine, Mic, Clock, ArrowRight } from 'lucide-react'

const moduleIcons = { LISTENING: Headphones, READING: BookOpen, WRITING: PenLine, SPEAKING: Mic }

export default function Dashboard() {
  const { user } = useAuth()
  const { data: sessions, isLoading: sLoading } = useQuery({ queryKey: ['my-sessions'], queryFn: () => api.get('/sessions/my').then(r => r.data) })
  const { data: notifications } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/notifications').then(r => r.data) })
  const { data: results, isLoading: rLoading } = useQuery({ queryKey: ['my-results'], queryFn: () => api.get('/results/student/my').then(r => r.data) })
  const { data: tests } = useQuery({ queryKey: ['tests'], queryFn: () => api.get('/tests').then(r => r.data) })

  const completedSessions = sessions?.filter(s => s.status === 'SUBMITTED' || s.status === 'EVALUATED') || []
  const bestBand = results?.reduce((max, r) => Math.max(max, r.overallBand || 0), 0) || null
  const lastBand = results?.[results.length - 1]?.overallBand || null
  const pending = tests?.filter(t => !sessions?.find(s => s.testId === t.id && (s.status === 'SUBMITTED' || s.status === 'EVALUATED'))) || []

  const chartData = results?.slice(0, 8).reverse().map((r, i) => ({
    name: `T${i + 1}`,
    overall: r.overallBand || 0,
    listening: r.listeningBand || 0,
    reading: r.readingBand || 0,
    writing: r.writingBand || 0,
    speaking: r.speakingBand || 0
  })) || []

  const unread = notifications?.filter(n => !n.isRead).length || 0

  if (sLoading || rLoading) return <div className="space-y-6"><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div></div>

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Greeting */}
      <div className="bg-gradient-to-r from-brand-600 to-purple-700 rounded-2xl p-8 flex items-center justify-between text-white">
        <div>
          <p className="text-brand-100 text-sm mb-1">
            {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}, {user?.name?.split(' ')[0]}
          </p>
          <h1 className="text-2xl font-bold mb-1">Welcome back!</h1>
          <p className="text-brand-100 text-sm">
            {pending.length} test{pending.length !== 1 ? 's' : ''} pending · {completedSessions.length} completed
          </p>
        </div>
        {lastBand && (
          <div className="text-center">
            <p className="text-xs text-brand-200 mb-2">Latest Band</p>
            <BandGauge score={lastBand} size={120} />
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5" elevated>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center"><FileText className="w-5 h-5 text-blue-500" /></div>
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">{completedSessions.length}</p>
              <p className="text-xs text-surface-400">Tests Taken</p>
            </div>
          </div>
        </Card>
        <Card className="p-5" elevated>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center"><Headphones className="w-5 h-5 text-green-500" /></div>
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">{bestBand?.toFixed(1) || '—'}</p>
              <p className="text-xs text-surface-400">Best Band</p>
            </div>
          </div>
        </Card>
        <Card className="p-5" elevated>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center"><BookOpen className="w-5 h-5 text-purple-500" /></div>
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">{lastBand?.toFixed(1) || '—'}</p>
              <p className="text-xs text-surface-400">Last Band</p>
            </div>
          </div>
        </Card>
        <Card className="p-5" elevated>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-500" /></div>
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">{pending.length}</p>
              <p className="text-xs text-surface-400">Pending</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress Chart */}
      {chartData.length > 0 && (
        <Card className="p-6" elevated>
          <h3 className="font-semibold text-surface-900 dark:text-white mb-4">Your Progress</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 9]} ticks={[0, 3, 6, 9]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="overall" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="listening" stroke="#22c55e" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="reading" stroke="#f97316" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="writing" stroke="#a855f7" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="speaking" stroke="#ec4899" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Assigned Tests */}
        <Card className="p-6" elevated>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900 dark:text-white">Assigned Tests</h3>
            <Link to="/tests" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1">View All <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="space-y-3">
            {tests?.slice(0, 4).map(test => {
              const session = sessions?.find(s => s.testId === test.id)
              const result = results?.find(r => r.sessionId === session?.id)
              return (
                <div key={test.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-700 dark:text-surface-200 truncate">{test.title}</p>
                    <div className="flex gap-2 mt-1">
                      {['LISTENING', 'READING', 'WRITING', 'SPEAKING'].map(m => {
                        const Icon = moduleIcons[m]
                        return <span key={m} className="text-xs text-surface-400"><Icon className="w-3 h-3 inline mr-0.5" />{test.modules?.find(mod => mod.type === m) ? '30' : '–'}m</span>
                      })}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={!session ? 'neutral' : session.status === 'IN_PROGRESS' ? 'warning' : 'success'}>
                      {!session ? 'Not Started' : session.status === 'IN_PROGRESS' ? 'In Progress' : result?.overallBand || 'Done'}
                    </Badge>
                    <Link to={session ? `/test/${session.id}` : `/tests/${test.id}`} className="block text-xs text-brand-500 hover:text-brand-600 mt-1">
                      {session ? 'Resume' : 'Start'} →
                    </Link>
                  </div>
                </div>
              )
            })}
            {(!tests || tests.length === 0) && <p className="text-center text-sm text-surface-400 py-6">No tests assigned yet</p>}
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6" elevated>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900 dark:text-white">Notifications</h3>
            {unread > 0 && <span className="badge-danger">{unread} new</span>}
          </div>
          <div className="space-y-2">
            {notifications?.slice(0, 5).map(n => (
              <div key={n.id} className={`p-3 rounded-xl transition-colors ${!n.isRead ? 'bg-brand-50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-800' : 'hover:bg-surface-50 dark:hover:bg-surface-800/50'}`}>
                <p className="text-sm font-medium text-surface-700 dark:text-surface-200">{n.title}</p>
                <p className="text-xs text-surface-400 mt-0.5 line-clamp-2">{n.message}</p>
              </div>
            ))}
            {(!notifications || notifications.length === 0) && <p className="text-center text-sm text-surface-400 py-6">No notifications</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}