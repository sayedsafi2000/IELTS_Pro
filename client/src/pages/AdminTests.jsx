import { clsx } from 'clsx'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import ConfirmModal from '../components/ui/ConfirmModal'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { useState } from 'react'
import { FileText, Plus, Eye, Copy, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

export default function AdminTests() {
  const queryClient = useQueryClient()
  const { data: tests, isLoading } = useQuery({ queryKey: ['admin-tests'], queryFn: () => api.get('/tests').then(r => r.data) })
  const [deleteId, setDeleteId] = useState(null)

  const deleteMutation = useMutation({ mutationFn: id => api.delete(`/tests/${id}`), onSuccess: () => { queryClient.invalidateQueries(['admin-tests']); toast.success('Test deleted') }, onError: () => toast.error('Failed to delete') })
  const publishMutation = useMutation({ mutationFn: ({ id, isPublished }) => api.patch(`/tests/${id}/publish`, { isPublished }), onSuccess: () => queryClient.invalidateQueries(['admin-tests']) })

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Tests</h1>
          <p className="text-sm text-surface-500">{tests?.length || 0} test{tests?.length !== 1 ? 's' : ''} total</p>
        </div>
        <Link to="/admin/tests/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Create Test
        </Link>
      </div>

      {tests?.length > 0 ? (
        <div className="space-y-3">
          {tests.map(test => (
            <Card key={test.id} className="p-4 flex items-center gap-4 hover:shadow-card transition-all" elevated>
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-brand-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-surface-900 dark:text-white truncate">{test.title}</h3>
                  <Badge variant={test.isPublished ? 'success' : 'neutral'} dot={false}>{test.isPublished ? 'Published' : 'Draft'}</Badge>
                </div>
                <p className="text-xs text-surface-400 mt-0.5">{test.type} • {test.modules?.length || 0} modules • {test.duration} min</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => publishMutation.mutate({ id: test.id, isPublished: !test.isPublished })}
                  className={clsx('flex items-center gap-1.5 text-sm font-medium transition-colors', test.isPublished ? 'text-green-600 hover:text-green-700' : 'text-surface-400 hover:text-surface-600')}>
                  {test.isPublished ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  {test.isPublished ? 'Published' : 'Publish'}
                </button>
                <Link to={`/admin/tests/${test.id}`} className="btn-ghost text-sm px-3 py-2">
                  <Eye className="w-4 h-4" /> Edit
                </Link>
                <button onClick={() => setDeleteId(test.id)} className="p-2 text-surface-400 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-0">
          <EmptyState icon={FileText} title="No tests yet" description="Create your first mock test to get started." action={
            <Link to="/admin/tests/new" className="btn-primary">Create Test</Link>
          } />
        </Card>
      )}

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)}
        title="Delete Test" description="Are you sure you want to delete this test? This action cannot be undone."
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null) }} />
    </div>
  )
}