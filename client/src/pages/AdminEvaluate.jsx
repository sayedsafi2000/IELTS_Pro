import { useState, useEffect, useMemo } from 'react'
import { clsx } from 'clsx'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import Card from '../components/ui/Card'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import { PenLine, Mic, ChevronRight, ChevronLeft } from 'lucide-react'

const criteria = {
  writing: [
    { key: 'taskAchievement',   label: 'Task Achievement',     desc: 'How well the response addresses the task' },
    { key: 'coherenceCohesion', label: 'Coherence & Cohesion', desc: 'Organization and linking of ideas' },
    { key: 'lexicalResource',   label: 'Lexical Resource',     desc: 'Range and accuracy of vocabulary' },
    { key: 'grammaticalRange',  label: 'Grammatical Range',    desc: 'Range and accuracy of grammar' },
  ],
  speaking: [
    { key: 'fluencyCoherence',  label: 'Fluency & Coherence',  desc: 'Smoothness and clarity of speech' },
    { key: 'lexicalResource',   label: 'Lexical Resource',     desc: 'Range and accuracy of vocabulary' },
    { key: 'grammaticalRange',  label: 'Grammatical Range',    desc: 'Range and accuracy of grammar' },
    { key: 'pronunciation',     label: 'Pronunciation',        desc: 'Clarity and intonation' },
  ]
}

const bandOptions = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9]

const DEFAULT_WRITING = { taskAchievement: 6, coherenceCohesion: 6, lexicalResource: 6, grammaticalRange: 6, feedback: '' }
const DEFAULT_SPEAKING = { fluencyCoherence: 6, lexicalResource: 6, grammaticalRange: 6, pronunciation: 6, feedback: '' }

function AudioPlayer({ src, label }) {
  return (
    <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl space-y-2">
      {label && <p className="text-xs text-surface-500">{label}</p>}
      <audio src={src} controls preload="metadata" className="w-full" />
    </div>
  )
}

export default function AdminEvaluate() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('writing')
  const [cursor, setCursor] = useState(0)
  const [scores, setScores] = useState(DEFAULT_WRITING)

  const { data: writingPending = [], isLoading: wLoading } = useQuery({
    queryKey: ['writing-pending'],
    queryFn: () => api.get('/writing/pending').then(r => r.data)
  })
  const { data: speakingPending = [], isLoading: sLoading } = useQuery({
    queryKey: ['speaking-pending'],
    queryFn: () => api.get('/speaking/pending').then(r => r.data)
  })

  const list = activeTab === 'writing' ? writingPending : speakingPending
  const isLoading = activeTab === 'writing' ? wLoading : sLoading
  const c = criteria[activeTab]
  const current = list[cursor] || null

  // Reset cursor + score state when tab changes or current item changes
  useEffect(() => {
    setCursor(0)
  }, [activeTab])

  useEffect(() => {
    setScores(activeTab === 'writing' ? { ...DEFAULT_WRITING } : { ...DEFAULT_SPEAKING })
  }, [activeTab, current?.id])

  // Clamp cursor when the list shrinks (e.g. after evaluating an item)
  useEffect(() => {
    if (cursor >= list.length && list.length > 0) {
      setCursor(list.length - 1)
    } else if (list.length === 0 && cursor !== 0) {
      setCursor(0)
    }
  }, [list.length])

  const calcBand = useMemo(() => {
    const keys = activeTab === 'writing'
      ? ['taskAchievement', 'coherenceCohesion', 'lexicalResource', 'grammaticalRange']
      : ['fluencyCoherence', 'lexicalResource', 'grammaticalRange', 'pronunciation']
    const sum = keys.reduce((acc, k) => acc + (parseFloat(scores[k]) || 0), 0)
    return (sum / 4).toFixed(1)
  }, [scores, activeTab])

  const evaluateWriting = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/writing/${id}/evaluate`, data),
    onSuccess: async () => {
      toast.success('Evaluation saved')
      await queryClient.invalidateQueries({ queryKey: ['writing-pending'] })
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save evaluation')
  })

  const evaluateSpeaking = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/speaking/${id}/evaluate`, data),
    onSuccess: async () => {
      toast.success('Evaluation saved')
      await queryClient.invalidateQueries({ queryKey: ['speaking-pending'] })
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save evaluation')
  })

  const handleSave = () => {
    if (!current) return
    if (activeTab === 'writing') {
      evaluateWriting.mutate({
        id: current.id,
        data: {
          taskAchievement: parseFloat(scores.taskAchievement),
          coherenceCohesion: parseFloat(scores.coherenceCohesion),
          lexicalResource: parseFloat(scores.lexicalResource),
          grammaticalRange: parseFloat(scores.grammaticalRange),
          feedback: scores.feedback
        }
      })
    } else {
      evaluateSpeaking.mutate({
        id: current.id,
        data: {
          fluencyCoherence: parseFloat(scores.fluencyCoherence),
          lexicalResource: parseFloat(scores.lexicalResource),
          grammaticalRange: parseFloat(scores.grammaticalRange),
          pronunciation: parseFloat(scores.pronunciation),
          feedback: scores.feedback
        }
      })
    }
    // After saving, the evaluated item drops out of the pending list,
    // so the next item naturally moves into the same cursor index.
  }

  const totalPending = list.length
  const isSaving = evaluateWriting.isPending || evaluateSpeaking.isPending

  return (
    <div className="h-[calc(100vh-7rem)] flex gap-6 animate-fade-in">
      {/* Left Panel: submission preview */}
      <div className="w-[55%] bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-surface-100 dark:border-surface-700 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-surface-700 dark:text-surface-200">
              {activeTab === 'writing' ? 'Writing' : 'Speaking'} submissions
            </p>
            <p className="text-xs text-surface-400">
              {totalPending === 0 ? 'Nothing to evaluate' : `${cursor + 1} of ${totalPending} pending`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={cursor === 0 || totalPending === 0}
              onClick={() => setCursor(c => Math.max(0, c - 1))}
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={cursor >= totalPending - 1 || totalPending === 0}
              onClick={() => setCursor(c => Math.min(totalPending - 1, c + 1))}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {current && (
          <div className="px-6 py-4 border-b border-surface-100 dark:border-surface-700 flex items-center gap-3">
            <Avatar name={current.moduleSession?.session?.user?.name || ''} size="md" />
            <div>
              <p className="font-medium text-surface-900 dark:text-white">
                {current.moduleSession?.session?.user?.name}
              </p>
              <p className="text-xs text-surface-400">
                {current.moduleSession?.session?.test?.title}
                {current.taskNumber ? ` • Task ${current.taskNumber}` : ''}
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}
            </div>
          ) : !current ? (
            <div className="text-center py-16 text-surface-400">
              <p>No {activeTab} submissions pending</p>
            </div>
          ) : activeTab === 'writing' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800">
                <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mb-1">Task Prompt</p>
                <p className="text-sm text-surface-700 dark:text-surface-300">
                  {current.moduleSession?.module?.questions?.find(q => q.type === `WRITING_TASK${current.taskNumber}`)?.questionText
                    || 'Prompt not found'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-surface-400">Student Response</span>
                  <span className="text-xs text-surface-400">{current.wordCount || 0} words</span>
                </div>
                <p className="text-sm text-surface-700 dark:text-surface-300 leading-relaxed whitespace-pre-wrap">
                  {current.content?.replace(/<[^>]*>/g, '')}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {current.moduleSession?.liveSpeakingSession && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Live session</p>
                  <p className="text-sm text-surface-700 dark:text-surface-300">
                    {current.moduleSession.liveSpeakingSession.examiner?.name || 'No examiner'} ·{' '}
                    {new Date(current.moduleSession.liveSpeakingSession.scheduledAt).toLocaleString()}
                  </p>
                  {current.moduleSession.liveSpeakingSession.recordingUrl && (
                    <AudioPlayer src={current.moduleSession.liveSpeakingSession.recordingUrl} label="Live recording" />
                  )}
                </div>
              )}

              {current.responses?.length > 0 ? (
                current.responses.map(r => (
                  <div key={r.id} className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
                    <p className="text-xs text-surface-400 mb-1">{r.question?.type?.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-surface-700 dark:text-surface-300 mb-2">{r.question?.questionText}</p>
                    <AudioPlayer src={r.audioUrl} />
                  </div>
                ))
              ) : current.audioUrl ? (
                <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 space-y-2">
                  <p className="text-xs text-surface-400">Speaking Audio (single recording)</p>
                  <AudioPlayer src={current.audioUrl} />
                  <p className="text-sm text-surface-700 dark:text-surface-300 mt-2">
                    {current.moduleSession?.module?.questions?.[0]?.questionText || ''}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900 text-sm text-surface-400">
                  No recording attached yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: scoring */}
      <div className="w-[45%] bg-surface-50 dark:bg-surface-900/50 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="text-center p-4 bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700">
            <p className="text-xs text-surface-500 mb-1 uppercase tracking-wide">Projected Band</p>
            <p className="text-4xl font-bold text-brand-500">{calcBand}</p>
          </div>

          {c.map(crit => (
            <div key={crit.key} className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-700 dark:text-surface-200">{crit.label}</p>
                  <p className="text-xs text-surface-400">{crit.desc}</p>
                </div>
                <span className="text-xl font-bold text-brand-500">{scores[crit.key]}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {bandOptions.map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setScores(s => ({ ...s, [crit.key]: b }))}
                    className={clsx(
                      'w-10 h-8 rounded-lg text-xs font-semibold border transition-all',
                      parseFloat(scores[crit.key]) === b
                        ? 'bg-brand-500 text-white border-brand-500 shadow-glow'
                        : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:border-brand-300'
                    )}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Feedback</label>
            <textarea
              className="input"
              rows={5}
              placeholder="Write detailed feedback for the student..."
              value={scores.feedback}
              onChange={e => setScores(s => ({ ...s, feedback: e.target.value }))}
            />
            <p className="text-xs text-surface-400 text-right">{scores.feedback.length} characters</p>
          </div>
        </div>

        <div className="p-4 border-t border-surface-200 dark:border-surface-700 flex gap-3 bg-white dark:bg-surface-800">
          <Button
            variant="ghost"
            disabled={!current || cursor >= totalPending - 1}
            onClick={() => setCursor(c => Math.min(totalPending - 1, c + 1))}
            className="flex-1 justify-center"
          >
            Skip
          </Button>
          <Button
            className="flex-1 justify-center"
            disabled={!current}
            loading={isSaving}
            onClick={handleSave}
          >
            Save & Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-surface-800 rounded-2xl shadow-modal border border-surface-200 dark:border-surface-700 p-1 flex gap-1 z-20">
        <button
          onClick={() => setActiveTab('writing')}
          className={clsx(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
            activeTab === 'writing' ? 'bg-brand-500 text-white' : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700'
          )}
        >
          <PenLine className="w-4 h-4" /> Writing ({writingPending.length})
        </button>
        <button
          onClick={() => setActiveTab('speaking')}
          className={clsx(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
            activeTab === 'speaking' ? 'bg-brand-500 text-white' : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700'
          )}
        >
          <Mic className="w-4 h-4" /> Speaking ({speakingPending.length})
        </button>
      </div>
    </div>
  )
}
