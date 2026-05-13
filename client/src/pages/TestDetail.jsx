import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { clsx } from 'clsx'
import { Headphones, BookOpen, PenLine, Mic, Clock, HelpCircle, AlertTriangle, Play, RotateCcw } from 'lucide-react'

const moduleIcons = {
  LISTENING: Headphones,
  READING: BookOpen,
  WRITING: PenLine,
  SPEAKING: Mic,
}
const moduleColors = {
  LISTENING: 'from-blue-500 to-cyan-500',
  READING: 'from-purple-500 to-pink-500',
  WRITING: 'from-amber-500 to-orange-500',
  SPEAKING: 'from-green-500 to-emerald-500',
}

export default function TestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState('EXAM')

  const { data: test, isLoading } = useQuery({
    queryKey: ['test', id],
    queryFn: () => api.get(`/tests/${id}`).then(r => r.data)
  })
  const { data: sessions } = useQuery({
    queryKey: ['my-sessions'],
    queryFn: () => api.get('/sessions/my').then(r => r.data)
  })

  const existingSession = sessions?.find(s => s.testId === id && s.status === 'IN_PROGRESS')
  const completedSession = sessions?.find(s => s.testId === id && s.status === 'SUBMITTED')

  const startMutation = useMutation({
    mutationFn: () => api.post('/sessions/start', { testId: id, mode }),
    onSuccess: (res) => navigate(`/test/${res.data.id}`),
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to start test')
  })

  if (isLoading) return (
    <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
  )

  if (!test) return (
    <div className="text-center py-20 text-surface-500">Test not found</div>
  )

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{test.title}</h1>
            <p className="text-sm text-surface-500 mt-1">{test.description || 'No description'}</p>
          </div>
          <Badge variant={test.isPublished ? 'success' : 'neutral'}>{test.isPublished ? 'Published' : 'Draft'}</Badge>
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

      {/* Action Button */}
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
    </div>
  )
}