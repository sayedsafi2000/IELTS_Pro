import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { clsx } from 'clsx'
import {
  Headphones, BookOpen, PenLine, Mic, Clock, HelpCircle,
  AlertTriangle, Play, RotateCcw, Smartphone, Building2,
  CheckCircle2, XCircle, CreditCard, Lock
} from 'lucide-react'

const moduleIcons = { LISTENING: Headphones, READING: BookOpen, WRITING: PenLine, SPEAKING: Mic }
const moduleColors = {
  LISTENING: 'from-blue-500 to-cyan-500',
  READING: 'from-purple-500 to-pink-500',
  WRITING: 'from-amber-500 to-orange-500',
  SPEAKING: 'from-green-500 to-emerald-500'
}

export default function TestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState('EXAM')
  const [paymentMethod, setPaymentMethod] = useState('bkash')
  const [trxId, setTrxId] = useState('')

  const { data: test, isLoading } = useQuery({
    queryKey: ['test', id],
    queryFn: () => api.get(`/tests/${id}`).then(r => r.data)
  })
  const { data: sessions } = useQuery({
    queryKey: ['my-sessions'],
    queryFn: () => api.get('/sessions/my').then(r => r.data)
  })
  const { data: enrollments } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: () => api.get('/enrollments/student/my').then(r => r.data)
  })

  const enrollment = enrollments?.find(e => e.testId === id) || null
  const isApproved = enrollment?.status === 'APPROVED'
  const isPending = enrollment?.status === 'PENDING'
  const isRejected = enrollment?.status === 'REJECTED'
  const isPaid = test?.isPaid && test?.price > 0

  const existingSession = sessions?.find(s => s.testId === id && s.status === 'IN_PROGRESS')
  const completedSession = sessions?.find(s => s.testId === id && s.status === 'SUBMITTED')

  const startMutation = useMutation({
    mutationFn: () => api.post('/sessions/start', { testId: id, mode }),
    onSuccess: (res) => navigate(`/test/${res.data.id}`),
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to start test')
  })

  const enrollMutation = useMutation({
    mutationFn: (payload) => api.post('/enrollments', payload),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Enrolled successfully')
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] })
      queryClient.invalidateQueries({ queryKey: ['available-tests'] })
      setTrxId('')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to enroll')
  })

  const handleEnrollFree = () => enrollMutation.mutate({ testId: id })
  const handleEnrollPaid = (e) => {
    e.preventDefault()
    if (!trxId.trim()) return toast.error('Please enter your Transaction ID')
    enrollMutation.mutate({ testId: id, trxId: trxId.trim() })
  }

  if (isLoading) return (
    <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
  )
  if (!test) return <div className="text-center py-20 text-surface-500">Test not found</div>

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{test.title}</h1>
          <p className="text-sm text-surface-500 mt-1">{test.description || 'No description'}</p>
        </div>
        <div className="flex flex-col gap-2 items-end shrink-0">
          {isPaid ? <Badge variant="warning">৳{test.price}</Badge> : <Badge variant="success">Free</Badge>}
          {isApproved && <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Enrolled</Badge>}
          {isPending && <Badge variant="warning" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</Badge>}
          {isRejected && <Badge variant="danger" className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>}
        </div>
      </div>

      {/* Modules */}
      <Card className="p-6" elevated>
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-surface-400" />
          Test Modules
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {test.modules?.map((mod, i) => {
            const Icon = moduleIcons[mod.type] || HelpCircle
            return (
              <div key={mod.id} className="flex items-center gap-4 p-4 bg-surface-50 dark:bg-surface-800/50 rounded-xl">
                <div className={clsx('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg shrink-0', moduleColors[mod.type] || 'from-surface-400 to-surface-500')}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-surface-900 dark:text-white">Module {i + 1}: {mod.title}</p>
                  <p className="text-xs text-surface-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {mod.durationMins} min • {mod.questions?.length || 0} questions
                  </p>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-surface-100 dark:border-surface-700 flex items-center justify-between text-sm text-surface-500">
          <span>{test.duration} min total</span>
          <span>{test.modules?.length || 0} modules • {test.modules?.reduce((sum, m) => sum + (m.questions?.length || 0), 0) || 0} questions</span>
        </div>
      </Card>

      {/* ── Enrollment gate ── */}
      {!isApproved && (
        <>
          {isPending && (
            <Card className="p-6 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800" elevated>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-300">Waiting for approval</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-200 mt-1">
                    Your payment has been submitted. Once an admin verifies your transaction, you'll be able to start the test.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {isRejected && (
            <Card className="p-6 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800" elevated>
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-800 dark:text-red-300">Enrollment rejected</h3>
                  <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                    Please contact support if you believe this is an error.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {!enrollment && !isPaid && (
            <Card className="p-6" elevated>
              <div className="flex items-center gap-3 mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-400">This test is free</p>
                  <p className="text-sm text-green-600 dark:text-green-300">Enroll once to start practicing.</p>
                </div>
              </div>
              <Button
                onClick={handleEnrollFree}
                loading={enrollMutation.isPending}
                className="btn-primary w-full justify-center py-3 text-base"
              >
                <CheckCircle2 className="w-4 h-4" />
                Enroll Free
              </Button>
            </Card>
          )}

          {!enrollment && isPaid && (
            <Card className="p-6" elevated>
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-1 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-brand-500" />
                Enroll with Payment
              </h2>
              <p className="text-sm text-surface-500 mb-4">
                Pay <strong>৳{test.price}</strong> via bKash, Nagad, or Bank, then submit the Transaction ID below for verification.
              </p>

              {/* Payment method selector */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { id: 'bkash', label: 'bKash', icon: Smartphone, color: 'bg-pink-500' },
                  { id: 'nagad', label: 'Nagad', icon: Smartphone, color: 'bg-orange-500' },
                  { id: 'bank',  label: 'Bank',  icon: Building2,  color: 'bg-blue-500'  }
                ].map(pm => (
                  <button
                    type="button"
                    key={pm.id}
                    onClick={() => setPaymentMethod(pm.id)}
                    className={clsx(
                      'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
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

              {/* Payment instructions */}
              <div className="bg-surface-50 dark:bg-surface-800 rounded-xl p-4 mb-4 text-sm">
                {paymentMethod === 'bank' ? (
                  <div className="space-y-1 text-surface-600 dark:text-surface-300">
                    <p><strong>Bank:</strong> {test.bankName || 'Not configured'}</p>
                    <p><strong>Account:</strong> {test.bankAccount || 'Not configured'}</p>
                    <p>Send <strong>৳{test.price}</strong> and use the bank reference as TRX ID.</p>
                  </div>
                ) : (
                  <div className="space-y-1 text-surface-600 dark:text-surface-300">
                    <p>Send <strong>৳{test.price}</strong> to <strong>{test.bkashNumber || 'Not configured'}</strong></p>
                    <p>Use {paymentMethod === 'bkash' ? 'bKash' : 'Nagad'} Personal/Send Money, then copy the TRX from the SMS.</p>
                  </div>
                )}
              </div>

              <form onSubmit={handleEnrollPaid} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                    Transaction ID (TRX)
                  </label>
                  <input
                    type="text"
                    value={trxId}
                    onChange={e => setTrxId(e.target.value)}
                    placeholder="e.g. AB12CD34EF"
                    className="input"
                    maxLength={30}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  loading={enrollMutation.isPending}
                  className="btn-primary w-full justify-center py-3 text-base"
                >
                  Submit Payment
                </Button>
              </form>
            </Card>
          )}
        </>
      )}

      {/* ── Approved → start the test ── */}
      {isApproved && (
        <>
          {/* Important Rules */}
          <Card className="p-6 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800" elevated>
            <h3 className="font-semibold text-amber-800 dark:text-amber-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Important Rules
            </h3>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1.5">
              <li>• The listening audio can only be played once during the test</li>
              <li>• Each module has a separate timer — it will auto-submit when time expires</li>
              <li>• You cannot return to a previous module after submission</li>
              <li>• Tab switching is monitored — excessive switching will auto-submit your test</li>
              <li>• Ensure you have a stable internet connection</li>
            </ul>
          </Card>

          {/* Mode Selection */}
          <Card className="p-6" elevated>
            <h2 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-4">Test Mode</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className={clsx(
                'flex-1 p-4 border-2 rounded-xl cursor-pointer transition-all',
                mode === 'EXAM' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-surface-200 dark:border-surface-700 hover:border-brand-300'
              )}>
                <input type="radio" name="mode" value="EXAM" checked={mode === 'EXAM'} onChange={e => setMode(e.target.value)} className="sr-only" />
                <span className="font-medium text-surface-900 dark:text-white block mb-1">Exam Mode</span>
                <span className="text-xs text-surface-500">Timed, monitored, official results</span>
              </label>
              <label className={clsx(
                'flex-1 p-4 border-2 rounded-xl cursor-pointer transition-all',
                mode === 'PRACTICE' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-surface-200 dark:border-surface-700 hover:border-brand-300'
              )}>
                <input type="radio" name="mode" value="PRACTICE" checked={mode === 'PRACTICE'} onChange={e => setMode(e.target.value)} className="sr-only" />
                <span className="font-medium text-surface-900 dark:text-white block mb-1">Practice Mode</span>
                <span className="text-xs text-surface-500">No timer, instant answers, immediate results</span>
              </label>
            </div>
          </Card>

          {/* Action button */}
          {completedSession ? (
            <div className="space-y-3">
              <Button onClick={() => navigate(`/results/${completedSession.id}`)} variant="secondary" className="w-full justify-center py-4 text-base">
                <RotateCcw className="w-4 h-4" />
                View Previous Results
              </Button>
              <Button onClick={() => startMutation.mutate()} loading={startMutation.isPending} className="btn-primary w-full justify-center py-4 text-base">
                Retake Test
              </Button>
            </div>
          ) : existingSession ? (
            <Button onClick={() => navigate(`/test/${existingSession.id}`)} className="btn-primary w-full justify-center py-4 text-base">
              <Play className="w-4 h-4" />
              Resume Test
            </Button>
          ) : (
            <Button onClick={() => startMutation.mutate()} loading={startMutation.isPending} className="btn-primary w-full justify-center py-4 text-base">
              <Play className="w-4 h-4" />
              Start Test
            </Button>
          )}
        </>
      )}

      {/* Locked-state hint when not approved */}
      {!isApproved && !enrollment && (
        <p className="text-xs text-surface-400 flex items-center gap-1.5 justify-center">
          <Lock className="w-3 h-3" />
          You need to enroll before you can start the test.
        </p>
      )}
    </div>
  )
}
