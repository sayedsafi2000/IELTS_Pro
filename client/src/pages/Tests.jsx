import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../services/api'
import EmptyState from '../components/ui/EmptyState'
import Card from '../components/ui/Card'
import { FileText } from 'lucide-react'

export default function Tests() {
  const { data: tests } = useQuery({ queryKey: ['tests'], queryFn: () => api.get('/tests').then(r => r.data) })
  const { data: sessions } = useQuery({ queryKey: ['my-sessions'], queryFn: () => api.get('/sessions/my').then(r => r.data) })

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Available Tests</h1>
        <p className="text-sm text-surface-500 mt-1">{tests?.length || 0} tests available</p>
      </div>
      {tests && tests.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {tests.map(test => {
            const session = sessions?.find(s => s.testId === test.id)
            return (
              <Card key={test.id} className="p-6" elevated>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-white">{test.title}</h3>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${test.isPublished ? 'badge-success' : 'badge-neutral'}`}>{test.isPublished ? 'Published' : 'Draft'}</span>
                </div>
                <p className="text-sm text-surface-500 mb-4">{test.description || 'No description'}</p>
                <div className="flex items-center gap-4 text-sm text-surface-400 mb-5">
                  <span>{test.modules?.length || 0} modules</span>
                  <span>•</span>
                  <span>{test.duration} min</span>
                </div>
                <Link to={`/tests/${test.id}`} className="btn-primary w-full justify-center py-2.5">
                  {!session ? 'Start Test' : session.status === 'IN_PROGRESS' ? 'Resume Test' : 'View Details'}
                </Link>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="p-0">
          <EmptyState icon={FileText} title="No tests available" description="Check back later for available tests." />
        </Card>
      )}
    </div>
  )
}