import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../services/api'

export default function Tests() {
  const { data: tests } = useQuery({ queryKey: ['tests'], queryFn: () => api.get('/tests').then(r => r.data) })
  const { data: sessions } = useQuery({ queryKey: ['my-sessions'], queryFn: () => api.get('/sessions/my').then(r => r.data) })

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Available Tests</h1>
      <div className="grid md:grid-cols-2 gap-6">
        {tests?.map(test => {
          const session = sessions?.find(s => s.testId === test.id)
          return (
            <div key={test.id} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold">{test.title}</h3>
                <span className={`text-xs px-2 py-1 rounded ${test.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{test.isPublished ? 'Published' : 'Draft'}</span>
              </div>
              <p className="text-gray-500 text-sm mb-4">{test.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span>{test.modules?.length || 0} modules</span>
                <span>{test.duration} min total</span>
              </div>
              <Link to={`/tests/${test.id}`} className="block text-center py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {!session ? 'Start Test' : session.status === 'IN_PROGRESS' ? 'Resume Test' : 'View Details'}
              </Link>
            </div>
          )
        })}
      </div>
      {(!tests || tests.length === 0) && <div className="text-center py-12 text-gray-500">No tests assigned yet.</div>}
    </div>
  )
}