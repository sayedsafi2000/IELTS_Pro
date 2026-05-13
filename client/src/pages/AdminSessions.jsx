import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Skeleton from '../components/ui/Skeleton'
import { Pagination } from '../components/SharedComponents'
import { ScrollText } from 'lucide-react'

export default function AdminSessions() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const studentId = searchParams.get('student') || ''
  const testId = searchParams.get('test') || ''

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    p.set('page', String(page))
    p.set('limit', '20')
    if (studentId) p.set('studentId', studentId)
    if (testId) p.set('testId', testId)
    return p.toString()
  }, [page, studentId, testId])

  const { data: tests } = useQuery({ queryKey: ['admin-tests'], queryFn: () => api.get('/tests').then(r => r.data) })
  const { data, isLoading } = useQuery({
    queryKey: ['admin-results-list', page, studentId, testId],
    queryFn: () => api.get(`/results/admin/all?${queryString}`).then(r => r.data)
  })

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
    setSearchParams(next)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-1 flex items-center gap-2">
            <ScrollText className="w-7 h-7 text-brand-500 shrink-0" />
            Test sessions
          </h1>
          <p className="text-sm text-surface-500">Every completed mock with a result record. Open any row to review answers and bands.</p>
        </div>
      </div>

      <Card className="p-4 flex flex-wrap gap-3 items-end" elevated>
        <div className="flex flex-col gap-1 min-w-[180px]">
          <label className="text-xs section-label">Test</label>
          <select
            className="input text-sm py-2"
            value={testId}
            onChange={e => setFilter('test', e.target.value)}
          >
            <option value="">All tests</option>
            {tests?.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>
      </Card>

      {studentId && (
        <Card className="p-4 flex flex-wrap items-center justify-between gap-3 bg-brand-50/50 dark:bg-brand-900/10 border-brand-100 dark:border-brand-900/40" elevated>
          <p className="text-sm text-surface-700 dark:text-surface-300">
            Showing mock tests for a single student (filtered list).
          </p>
          <button type="button" className="btn-ghost text-sm shrink-0" onClick={() => setFilter('student', '')}>
            Clear student filter
          </button>
        </Card>
      )}

      <Card className="overflow-hidden" elevated>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100 dark:border-surface-700">
                <th className="text-left text-xs section-label px-4 py-3">Student</th>
                <th className="text-left text-xs section-label px-4 py-3 hidden md:table-cell">Test</th>
                <th className="text-left text-xs section-label px-4 py-3 hidden lg:table-cell">Started</th>
                <th className="text-left text-xs section-label px-4 py-3">Status</th>
                <th className="text-left text-xs section-label px-4 py-3">Band</th>
                <th className="text-right text-xs section-label px-4 py-3"> </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-8"><Skeleton className="h-10 w-full" /></td></tr>
              )}
              {!isLoading && data?.results?.map(r => (
                <tr key={r.id} className="border-b border-surface-50 dark:border-surface-800 last:border-0 hover:bg-surface-50/80 dark:hover:bg-surface-800/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={r.session?.user?.name || ''} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{r.session?.user?.name}</p>
                        <p className="text-xs text-surface-400 truncate hidden sm:block">{r.session?.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-surface-600 dark:text-surface-400">{r.session?.test?.title}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-surface-400">
                    {r.session?.startedAt ? new Date(r.session.startedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={r.session?.status === 'EVALUATED' ? 'success' : r.session?.status === 'SUBMITTED' ? 'warning' : 'neutral'}>
                      {r.session?.status || '—'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-surface-800 dark:text-surface-200">{r.overallBand ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/sessions/${r.sessionId}`} className="text-sm text-brand-500 hover:text-brand-600 font-medium">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {!isLoading && (!data?.results || data.results.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-surface-400">
                    No sessions match these filters yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data && data.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-surface-100 dark:border-surface-700 flex justify-center">
            <Pagination
              page={page}
              totalPages={data.totalPages}
              onPageChange={(p) => {
                const next = new URLSearchParams(searchParams)
                next.set('page', String(p))
                setSearchParams(next)
              }}
            />
          </div>
        )}
      </Card>
    </div>
  )
}
