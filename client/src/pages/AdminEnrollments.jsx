import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Avatar from '../components/ui/Avatar'
import ConfirmModal from '../components/ui/ConfirmModal'
import { clsx } from 'clsx'
import { Check, X, Clock, FileText, Eye, Filter, Search } from 'lucide-react'

function EnrollmentRow({ enrollment, onApprove, onReject }) {
  const isPending = enrollment.status === 'PENDING'
  const isApproved = enrollment.status === 'APPROVED'
  const isRejected = enrollment.status === 'REJECTED'

  return (
    <tr className="border-b border-surface-100 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <Avatar name={enrollment.user?.name || ''} size="sm" />
          <div>
            <p className="font-medium text-surface-900 dark:text-white">{enrollment.user?.name}</p>
            <p className="text-xs text-surface-400">{enrollment.user?.email}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <p className="text-sm font-medium text-surface-700 dark:text-surface-200">{enrollment.test?.title}</p>
        <p className="text-xs text-surface-400">{enrollment.test?.modules?.length || 0} modules</p>
      </td>
      <td className="py-4 px-4">
        {enrollment.trxId ? (
          <code className="text-xs bg-surface-100 dark:bg-surface-700 px-2 py-1 rounded font-mono">{enrollment.trxId}</code>
        ) : (
          <span className="text-xs text-surface-400">Free enrollment</span>
        )}
      </td>
      <td className="py-4 px-4">
        <span className="text-xs text-surface-400">
          {new Date(enrollment.assignedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </td>
      <td className="py-4 px-4">
        <Badge variant={isPending ? 'warning' : isApproved ? 'success' : 'danger'}>
          {isPending && <Clock className="w-3 h-3 mr-1" />}
          {isApproved && <Check className="w-3 h-3 mr-1" />}
          {isRejected && <X className="w-3 h-3 mr-1" />}
          {enrollment.status}
        </Badge>
      </td>
      <td className="py-4 px-4">
        {isPending && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => onApprove(enrollment)} className="btn-primary">
              <Check className="w-3.5 h-3.5" /> Approve
            </Button>
            <Button size="sm" variant="danger" onClick={() => onReject(enrollment)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
        {isApproved && (
          <Button size="sm" variant="ghost" as="a" href={`/admin/enroll`}>
            <Eye className="w-3.5 h-3.5" />
          </Button>
        )}
        {isRejected && (
          <span className="text-xs text-surface-400">Rejected</span>
        )}
      </td>
    </tr>
  )
}

export default function AdminEnrollments() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [rejectModal, setRejectModal] = useState(null)

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['admin-enrollments', statusFilter],
    queryFn: () => api.get(`/enrollments/admin/all?status=${statusFilter}`).then(r => r.data)
  })

  const approveMutation = useMutation({
    mutationFn: (id) => api.patch(`/enrollments/${id}/approve`),
    onSuccess: () => {
      toast.success('Enrollment approved! Student can now take the test.')
      queryClient.invalidateQueries(['admin-enrollments'])
      queryClient.invalidateQueries(['available-tests'])
    },
    onError: () => toast.error('Failed to approve enrollment')
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => api.patch(`/enrollments/${id}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Enrollment rejected')
      queryClient.invalidateQueries(['admin-enrollments'])
      setRejectModal(null)
    },
    onError: () => toast.error('Failed to reject enrollment')
  })

  const filteredEnrollments = enrollments?.filter(e => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return e.user?.name?.toLowerCase().includes(q) || e.user?.email?.toLowerCase().includes(q) || e.test?.title?.toLowerCase().includes(q) || e.trxId?.toLowerCase().includes(q)
  }) || []

  const pendingCount = enrollments?.filter(e => e.status === 'PENDING').length || 0
  const approvedCount = enrollments?.filter(e => e.status === 'APPROVED').length || 0
  const rejectedCount = enrollments?.filter(e => e.status === 'REJECTED').length || 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Enrollment Requests</h1>
          <p className="text-sm text-surface-500 mt-1">Approve or reject student enrollment requests</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="warning" className="text-base px-4 py-2">{pendingCount} pending</Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 cursor-pointer hover:shadow-card transition-all" onClick={() => setStatusFilter('PENDING')}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">{pendingCount}</p>
              <p className="text-xs text-surface-400">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-card transition-all" onClick={() => setStatusFilter('APPROVED')}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">{approvedCount}</p>
              <p className="text-xs text-surface-400">Approved</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-card transition-all" onClick={() => setStatusFilter('REJECTED')}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <X className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">{rejectedCount}</p>
              <p className="text-xs text-surface-400">Rejected</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name, email, test or TRX..."
            className="input pl-10" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-surface-400" />
          {['all', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                statusFilter === s ? 'bg-brand-500 text-white' : 'bg-surface-100 dark:bg-surface-700 text-surface-500 hover:text-surface-700 dark:hover:text-surface-200'
              )}>
              {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden" elevated>
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredEnrollments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 uppercase">Student</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 uppercase">Test</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 uppercase">TRX ID</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnrollments.map(e => (
                  <EnrollmentRow key={e.id} enrollment={e} onApprove={(en) => approveMutation.mutate(en.id)} onReject={setRejectModal} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-surface-300 mx-auto mb-3" />
            <p className="text-surface-500">No enrollments found</p>
          </div>
        )}
      </Card>

      {/* Reject Modal */}
      <ConfirmModal
        open={!!rejectModal}
        onClose={() => setRejectModal(null)}
        title="Reject Enrollment"
        description={`Are you sure you want to reject ${rejectModal?.user?.name}'s enrollment for "${rejectModal?.test?.title}"?`}
        confirmText="Reject"
        confirmVariant="danger"
        onConfirm={() => rejectMutation.mutate({ id: rejectModal.id, reason: 'Payment verification failed' })}
      />
    </div>
  )
}