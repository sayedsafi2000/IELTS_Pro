import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { clsx } from 'clsx'
import { FileText, Check, Clock, X, CreditCard, Smartphone, Building2, ArrowRight, RefreshCcw } from 'lucide-react'

function PaymentModal({ test, onClose, isResubmit }) {
  const queryClient = useQueryClient()
  const availableMethods = [
    { id: 'BKASH', label: 'bKash', icon: Smartphone, color: 'bg-pink-500', show: !!test.bkashNumber },
    { id: 'NAGAD', label: 'Nagad', icon: Smartphone, color: 'bg-orange-500', show: !!test.bkashNumber },
    { id: 'BANK',  label: 'Bank',  icon: Building2,  color: 'bg-blue-500', show: !!test.bankAccount }
  ].filter(m => m.show)

  const [trxId, setTrxId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState(availableMethods[0]?.id || 'BKASH')

  const enrollMutation = useMutation({
    mutationFn: () => api.post('/enrollments', { testId: test.id, trxId: trxId.trim(), paymentMethod }),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Enrollment submitted')
      queryClient.invalidateQueries({ queryKey: ['available-tests'] })
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] })
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to submit enrollment')
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!trxId.trim()) return toast.error('Please enter the Transaction ID')
    if (availableMethods.length === 0) return toast.error('No payment method configured for this test')
    enrollMutation.mutate()
  }

  return (
    <Modal open={true} onClose={onClose} title={(isResubmit ? 'Resubmit Payment — ' : 'Enroll in ') + test.title}>
      <div className="space-y-5">
        {/* Price Info */}
        <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-4 border border-brand-200 dark:border-brand-800">
          <div className="flex items-center justify-between">
            <span className="text-surface-600 dark:text-surface-400">Test Fee</span>
            <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">৳{test.price}</span>
          </div>
        </div>

        {/* Payment Methods */}
        {availableMethods.length === 0 ? (
          <div className="text-sm text-red-600 dark:text-red-400 p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
            No payment method configured for this test. Please contact support.
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Payment Method</label>
              <div className="grid grid-cols-3 gap-3">
                {availableMethods.map(pm => (
                  <button
                    type="button"
                    key={pm.id}
                    onClick={() => setPaymentMethod(pm.id)}
                    className={clsx('p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
                      paymentMethod === pm.id
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-surface-200 dark:border-surface-700 hover:border-brand-300'
                    )}
                  >
                    <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center text-white', pm.color)}>
                      <pm.icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium">{pm.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Instructions */}
            <div className="bg-surface-50 dark:bg-surface-800 rounded-xl p-4">
              <h4 className="font-medium text-surface-700 dark:text-surface-300 mb-2">Payment Instructions</h4>
              {paymentMethod === 'BANK' ? (
                <div className="text-sm text-surface-500 space-y-1">
                  <p><strong>Bank:</strong> {test.bankName || 'N/A'}</p>
                  <p><strong>Account:</strong> {test.bankAccount || 'N/A'}</p>
                </div>
              ) : (
                <div className="text-sm text-surface-500 space-y-1">
                  <p>Send <strong>৳{test.price}</strong> to <strong>{test.bkashNumber || 'N/A'}</strong></p>
                  <p>Use {paymentMethod === 'BKASH' ? 'bKash' : 'Nagad'} Personal/Send Money</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* TRX ID Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Transaction ID (TRX)
            </label>
            <input
              type="text"
              value={trxId}
              onChange={e => setTrxId(e.target.value)}
              placeholder="Enter TRX ID"
              className="input text-base"
              maxLength={30}
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">Cancel</Button>
            <Button type="submit" loading={enrollMutation.isPending} className="btn-primary flex-1 justify-center">
              {isResubmit ? 'Resubmit Payment' : 'Submit Payment'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

function FreeEnrollModal({ test, onClose, isResubmit }) {
  const queryClient = useQueryClient()
  const enrollMutation = useMutation({
    mutationFn: () => api.post('/enrollments', { testId: test.id }),
    onSuccess: () => {
      toast.success('Successfully enrolled')
      queryClient.invalidateQueries({ queryKey: ['available-tests'] })
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] })
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to enroll')
  })

  return (
    <Modal open={true} onClose={onClose} title={`Enroll in ${test.title}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <Check className="w-8 h-8 text-green-500" />
          <div>
            <p className="font-medium text-green-700 dark:text-green-400">This is a FREE test</p>
            <p className="text-sm text-green-600 dark:text-green-300">No payment required</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => enrollMutation.mutate()} loading={enrollMutation.isPending} className="btn-primary flex-1 justify-center">
            {isResubmit ? 'Try again' : 'Enroll Now'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function TestCard({ test, onEnroll }) {
  const isPaid = test.price > 0
  const status = test.enrollmentStatus

  return (
    <Card className="p-6 hover:shadow-card transition-all" elevated>
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center shrink-0">
          <FileText className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-surface-900 dark:text-white truncate">{test.title}</h3>
            {isPaid ? <Badge variant="warning">৳{test.price}</Badge> : <Badge variant="success">Free</Badge>}
          </div>
          <p className="text-sm text-surface-500 mb-3 line-clamp-2">{test.description || 'No description'}</p>
          <div className="flex items-center gap-4 text-xs text-surface-400 mb-4">
            <span>{test.modules?.length || 0} modules</span>
            <span>•</span>
            <span>{test.duration} min</span>
          </div>

          {status === 'APPROVED' ? (
            <div className="flex items-center gap-2">
              <Badge variant="success" className="flex items-center gap-1"><Check className="w-3 h-3" /> Enrolled</Badge>
              <Link to={`/tests/${test.id}`} className="btn-primary text-sm ml-auto">
                Start Test <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : status === 'PENDING' ? (
            <div className="flex items-center gap-2">
              <Badge variant="warning" className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Awaiting approval
              </Badge>
              <Link to={`/tests/${test.id}`} className="text-xs text-brand-500 hover:underline ml-auto">
                View details
              </Link>
            </div>
          ) : status === 'REJECTED' ? (
            <div className="space-y-2">
              <Badge variant="danger" className="flex items-center gap-1">
                <X className="w-3 h-3" /> Rejected
              </Badge>
              {test.rejectionReason && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Reason: {test.rejectionReason}
                </p>
              )}
              <Button onClick={() => onEnroll(test, true)} variant="secondary" className="w-full justify-center text-sm">
                <RefreshCcw className="w-4 h-4" />
                {isPaid ? 'Resubmit payment' : 'Try again'}
              </Button>
            </div>
          ) : (
            <Button onClick={() => onEnroll(test, false)} className="btn-primary text-sm w-full justify-center">
              {isPaid ? (
                <><CreditCard className="w-4 h-4" /> Enroll with Payment</>
              ) : (
                <><Check className="w-4 h-4" /> Enroll Free</>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function EnrollTests() {
  const [selectedTest, setSelectedTest] = useState(null)
  const [isResubmit, setIsResubmit] = useState(false)

  const { data: tests, isLoading } = useQuery({
    queryKey: ['available-tests'],
    queryFn: () => api.get('/enrollments/student/available').then(r => r.data)
  })

  const pendingCount = tests?.filter(t => t.enrollmentStatus === 'PENDING').length || 0
  const enrolledCount = tests?.filter(t => t.enrollmentStatus === 'APPROVED').length || 0
  const rejectedCount = tests?.filter(t => t.enrollmentStatus === 'REJECTED').length || 0

  const handleEnrollClick = (test, resubmit = false) => {
    setSelectedTest(test)
    setIsResubmit(resubmit)
  }
  const closeModal = () => {
    setSelectedTest(null)
    setIsResubmit(false)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Available Tests</h1>
        <p className="text-sm text-surface-500 mt-1">Enroll in mock tests to start practicing</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4" elevated>
          <p className="text-2xl font-bold text-brand-500">{tests?.length || 0}</p>
          <p className="text-xs text-surface-400">Available Tests</p>
        </Card>
        <Card className="p-4" elevated>
          <p className="text-2xl font-bold text-green-500">{enrolledCount}</p>
          <p className="text-xs text-surface-400">Enrolled</p>
        </Card>
        <Card className="p-4" elevated>
          <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
          <p className="text-xs text-surface-400">Pending Approval</p>
        </Card>
        <Card className="p-4" elevated>
          <p className="text-2xl font-bold text-red-500">{rejectedCount}</p>
          <p className="text-xs text-surface-400">Rejected</p>
        </Card>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : tests?.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {tests.map(test => (
            <TestCard key={test.id} test={test} onEnroll={handleEnrollClick} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 text-surface-300 mx-auto mb-3" />
          <p className="text-surface-500">No tests available at the moment</p>
        </Card>
      )}

      {selectedTest && selectedTest.price > 0 && (
        <PaymentModal test={selectedTest} onClose={closeModal} isResubmit={isResubmit} />
      )}
      {selectedTest && !(selectedTest.price > 0) && (
        <FreeEnrollModal test={selectedTest} onClose={closeModal} isResubmit={isResubmit} />
      )}
    </div>
  )
}
