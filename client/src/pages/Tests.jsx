import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../services/api'
import EmptyState from '../components/ui/EmptyState'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { FileText, Clock, GraduationCap, ArrowRight } from 'lucide-react'

export default function Tests() {
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: () => api.get('/enrollments/student/my').then(r => r.data)
  })
  const { data: sessions } = useQuery({
    queryKey: ['my-sessions'],
    queryFn: () => api.get('/sessions/my').then(r => r.data)
  })

  const enrolled = (enrollments || []).filter(e => e.status === 'APPROVED')
  const pending  = (enrollments || []).filter(e => e.status === 'PENDING')

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">My Tests</h1>
          <p className="text-sm text-surface-500 mt-1">{enrolled.length} approved • {pending.length} pending</p>
        </div>
        <Link to="/enroll" className="btn-primary text-sm">
          <GraduationCap className="w-4 h-4" />
          Browse Tests
        </Link>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2].map(i => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      ) : enrollments && enrollments.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {enrollments.map(en => {
            const test = en.test
            const session = sessions?.find(s => s.testId === test.id)
            const isApproved = en.status === 'APPROVED'

            return (
              <Card key={en.id} className="p-6" elevated>
                <div className="flex justify-between items-start mb-3 gap-2">
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-white">{test.title}</h3>
                  {isApproved
                    ? <Badge variant="success">Enrolled</Badge>
                    : en.status === 'PENDING'
                      ? <Badge variant="warning">Pending</Badge>
                      : <Badge variant="danger">Rejected</Badge>}
                </div>
                <p className="text-sm text-surface-500 mb-4 line-clamp-2">{test.description || 'No description'}</p>
                <div className="flex items-center gap-3 text-xs text-surface-400 mb-5">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{test.duration} min</span>
                  {test.isPaid && test.price > 0 ? (
                    <span>•  ৳{test.price}</span>
                  ) : (
                    <span>•  Free</span>
                  )}
                </div>

                {isApproved ? (
                  <Link to={`/tests/${test.id}`} className="btn-primary w-full justify-center py-2.5">
                    {!session
                      ? 'Start Test'
                      : session.status === 'IN_PROGRESS'
                        ? 'Resume Test'
                        : 'View Details'}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : en.status === 'PENDING' ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400 text-center">Awaiting admin approval</p>
                ) : (
                  <Link to="/enroll" className="btn-secondary w-full justify-center py-2.5">
                    Try another test
                  </Link>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="p-0">
          <EmptyState
            icon={FileText}
            title="You haven't enrolled in any tests yet"
            description="Browse the available tests and enroll to start practicing."
            action={
              <Link to="/enroll" className="btn-primary">
                <GraduationCap className="w-4 h-4" />
                Browse Tests
              </Link>
            }
          />
        </Card>
      )}
    </div>
  )
}
