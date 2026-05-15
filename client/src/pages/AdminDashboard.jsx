import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Skeleton, { SkeletonCard } from '../components/ui/Skeleton'
import { Users, FileText, CheckCircle, Target, PenLine, Mic, ArrowRight, BarChart2, Check, X, Clock, CreditCard } from 'lucide-react'

function KPICard({ label, value, icon: Icon, color, trend }) {
  return (
    <Card className="p-6" elevated>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <span className="text-xs font-medium text-surface-400">{trend}</span>
      </div>
      <div className="text-3xl font-bold text-surface-900 dark:text-white mb-1">{value ?? '—'}</div>
      <p className="section-label">{label}</p>
    </Card>
  )
}

export default function AdminDashboard() {
  const queryClient = useQueryClient()
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.get('/admin/stats').then(r => r.data) })
  const { data: results, isLoading: resultsLoading } = useQuery({ queryKey: ['admin-results'], queryFn: () => api.get('/results/admin/all?limit=30').then(r => r.data) })
  const { data: pending } = useQuery({ queryKey: ['pending-evaluations'], queryFn: async () => {
    const [w, s] = await Promise.all([api.get('/writing/pending').then(r => r.data), api.get('/speaking/pending').then(r => r.data)])
    return { writing: w, speaking: s }
  } })
  const { data: pendingEnrollments = [], isLoading: enrLoading } = useQuery({
    queryKey: ['admin-enrollments', 'PENDING'],
    queryFn: () => api.get('/enrollments/admin/all?status=PENDING').then(r => r.data)
  })

  const invalidateEnrollments = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] })
    queryClient.invalidateQueries({ queryKey: ['available-tests'] })
    queryClient.invalidateQueries({ queryKey: ['my-enrollments'] })
  }

  const approveMutation = useMutation({
    mutationFn: (id) => api.patch(`/enrollments/${id}/approve`),
    onSuccess: () => { toast.success('Enrollment approved'); invalidateEnrollments() },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to approve')
  })

  const rejectMutation = useMutation({
    mutationFn: (id) => api.patch(`/enrollments/${id}/reject`, { reason: 'Payment could not be verified' }),
    onSuccess: () => { toast.success('Enrollment rejected'); invalidateEnrollments() },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to reject')
  })

  const bandData = results?.results?.reduce((acc, r) => {
    const b = Math.round(r.overallBand || 0)
    if (b >= 1 && b <= 9) acc[b] = (acc[b] || 0) + 1
    return acc
  }, {})

  const hasBandStats = bandData && Object.keys(bandData).length > 0

  const chartData = results?.results?.slice(0, 14).reverse().map((r, i) => ({
    day: `Day ${i + 1}`,
    band: r.overallBand || 0
  })) || []

  if (statsLoading) return <div className="space-y-6"><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-1">Dashboard</h1>
        <p className="text-sm text-surface-500">Welcome back! Here's an overview of your platform.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Students" value={stats?.totalStudents} icon={Users} color="#6366f1" trend="All time" />
        <KPICard label="Total Tests" value={stats?.totalTests} icon={FileText} color="#8b5cf6" trend="Active" />
        <KPICard label="Sessions Today" value={stats?.sessionsToday} icon={CheckCircle} color="#22c55e" trend="Today" />
        <KPICard label="Average Band" value={stats?.averageOverallBand?.toFixed(1) || '—'} icon={Target} color="#f59e0b" trend="Avg score" />
      </div>

      {/* Pending Enrollment Approvals */}
      <Card className="p-6" elevated>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-surface-900 dark:text-white">Pending Enrollment Approvals</h3>
              <p className="text-xs text-surface-400">
                {pendingEnrollments.length} student{pendingEnrollments.length === 1 ? '' : 's'} waiting for approval
              </p>
            </div>
          </div>
          <Link to="/admin/enrollments" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {enrLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : pendingEnrollments.length === 0 ? (
          <div className="py-6 text-center text-sm text-surface-400">
            No pending enrollment requests
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 dark:border-surface-700">
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase pb-3">Student</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase pb-3 hidden md:table-cell">Test</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase pb-3">Payment</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase pb-3 hidden lg:table-cell">Submitted</th>
                  <th className="text-right text-xs font-semibold text-surface-500 uppercase pb-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingEnrollments.slice(0, 5).map(en => {
                  const isPaid = (en.test?.price || 0) > 0
                  return (
                    <tr key={en.id} className="border-b border-surface-50 dark:border-surface-800 last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={en.user?.name || ''} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-surface-700 dark:text-surface-200">{en.user?.name}</p>
                            <p className="text-xs text-surface-400">{en.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 hidden md:table-cell">
                        <p className="text-sm text-surface-600 dark:text-surface-300">{en.test?.title}</p>
                        <p className="text-xs text-surface-400">{isPaid ? `৳${en.test.price}` : 'Free'}</p>
                      </td>
                      <td className="py-3">
                        {en.trxId ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-xs text-surface-500">
                              <CreditCard className="w-3 h-3" />
                              {en.paymentMethod || 'Manual'}
                            </span>
                            <code className="block text-xs bg-surface-100 dark:bg-surface-700 px-1.5 py-0.5 rounded font-mono text-surface-700 dark:text-surface-200 max-w-[140px] truncate">
                              {en.trxId}
                            </code>
                          </div>
                        ) : (
                          <span className="text-xs text-surface-400">Free enrollment</span>
                        )}
                      </td>
                      <td className="py-3 hidden lg:table-cell">
                        <span className="text-xs text-surface-400">
                          {new Date(en.assignedAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            loading={approveMutation.isPending && approveMutation.variables === en.id}
                            onClick={() => approveMutation.mutate(en.id)}
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            loading={rejectMutation.isPending && rejectMutation.variables === en.id}
                            onClick={() => rejectMutation.mutate(en.id)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {pendingEnrollments.length > 5 && (
              <p className="text-xs text-surface-400 text-center mt-3">
                Showing 5 of {pendingEnrollments.length}.{' '}
                <Link to="/admin/enrollments" className="text-brand-500 hover:underline">View all →</Link>
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-5 gap-4">
        <Card className="p-6 lg:col-span-3" elevated>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-surface-900 dark:text-white">Test Attempts</h3>
              <p className="text-xs text-surface-400">Last 14 sessions</p>
            </div>
            <BarChart2 className="w-4 h-4 text-surface-400" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={false} axisLine={false} />
              <YAxis domain={[0, 9]} ticks={[0, 3, 6, 9]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="band" stroke="#6366f1" strokeWidth={2} fill="url(#bandGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 lg:col-span-2" elevated>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-surface-900 dark:text-white">Band Distribution</h3>
              <p className="text-xs text-surface-400">Score breakdown</p>
            </div>
          </div>
          {hasBandStats ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={Object.entries(bandData).map(([band, count]) => ({ band, count }))} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="band" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-surface-400 text-sm py-8">No data yet</p>}
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-6 lg:col-span-2" elevated>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900 dark:text-white">Recent Sessions</h3>
            <Link to="/admin/sessions" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1">
              View all sessions <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 dark:border-surface-700">
                  <th className="text-left text-xs section-label pb-3">Student</th>
                  <th className="text-left text-xs section-label pb-3 hidden md:table-cell">Test</th>
                  <th className="text-left text-xs section-label pb-3 hidden lg:table-cell">Started</th>
                  <th className="text-left text-xs section-label pb-3">Status</th>
                  <th className="text-left text-xs section-label pb-3">Band</th>
                  <th className="text-left text-xs section-label pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {resultsLoading && (
                  <tr><td colSpan={6} className="py-6"><Skeleton className="h-24 w-full rounded-xl" /></td></tr>
                )}
                {!resultsLoading && (results?.results?.slice(0, 8) ?? []).map(r => (
                  <tr key={r.id} className="border-b border-surface-50 dark:border-surface-800 last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={r.session?.user?.name || ''} size="sm" />
                        <span className="text-sm font-medium text-surface-700 dark:text-surface-300">{r.session?.user?.name}</span>
                      </div>
                    </td>
                    <td className="py-3 hidden md:table-cell">
                      <span className="text-sm text-surface-500">{r.session?.test?.title}</span>
                    </td>
                    <td className="py-3 hidden lg:table-cell">
                      <span className="text-xs text-surface-400">{new Date(r.session?.startedAt).toLocaleDateString()}</span>
                    </td>
                    <td className="py-3">
                      <Badge variant={r.session?.status === 'EVALUATED' ? 'success' : r.session?.status === 'SUBMITTED' ? 'warning' : 'neutral'}>
                        {r.session?.status || '—'}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">{r.overallBand || '—'}</span>
                    </td>
                    <td className="py-3">
                      <Link to={`/admin/sessions/${r.sessionId}`} className="text-xs text-brand-500 hover:text-brand-600">View →</Link>
                    </td>
                  </tr>
                ))}
                {!resultsLoading && (!results?.results || results.results.length === 0) && (
                  <tr><td colSpan={6} className="py-8 text-center text-sm text-surface-400">No sessions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6" elevated>
          <h3 className="font-semibold text-surface-900 dark:text-white mb-4">Pending Evaluations</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800/50 rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <PenLine className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-surface-700 dark:text-surface-200">Writing</p>
                <p className="text-xs text-surface-400">{pending?.writing?.length || 0} submissions</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800/50 rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center">
                <Mic className="w-4 h-4 text-pink-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-surface-700 dark:text-surface-200">Speaking</p>
                <p className="text-xs text-surface-400">{pending?.speaking?.length || 0} submissions</p>
              </div>
            </div>
          </div>
          <Link to="/admin/evaluate" className="btn-primary w-full justify-center mt-4 text-sm">
            Go Evaluate →
          </Link>
        </Card>
      </div>
    </div>
  )
}