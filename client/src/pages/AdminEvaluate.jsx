import { useState } from 'react'
import { clsx } from 'clsx'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Textarea from '../components/ui/Textarea'
import Spinner from '../components/ui/Spinner'
import ConfirmModal from '../components/ui/ConfirmModal'
import * as Tabs from '@radix-ui/react-tabs'
import { PenLine, Mic, ChevronRight, Play, Pause, SkipForward } from 'lucide-react'

const criteria = {
  writing: [
    { key: 'taskAchievement', label: 'Task Achievement', desc: 'How well the response addresses the task' },
    { key: 'coherenceCohesion', label: 'Coherence & Cohesion', desc: 'Organization and linking of ideas' },
    { key: 'lexicalResource', label: 'Lexical Resource', desc: 'Range and accuracy of vocabulary' },
    { key: 'grammaticalRange', label: 'Grammatical Range', desc: 'Range and accuracy of grammar' },
  ],
  speaking: [
    { key: 'fluencyCoherence', label: 'Fluency & Coherence', desc: 'Smoothness and clarity of speech' },
    { key: 'lexicalResource', label: 'Lexical Resource', desc: 'Range and accuracy of vocabulary' },
    { key: 'grammaticalRange', label: 'Grammatical Range', desc: 'Range and accuracy of grammar' },
    { key: 'pronunciation', label: 'Pronunciation', desc: 'Clarity and intonation' },
  ]
}

const bandOptions = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9]

function AudioPlayer({ src }) {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const audioRef = { current: null }
  return (
    <div className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
      <button onClick={() => setPlaying(!playing)} className="w-9 h-9 rounded-lg bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition-colors">
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full">
        <div className="h-full w-1/3 bg-brand-500 rounded-full" />
      </div>
      <div className="flex gap-1">
        {[0.75, 1, 1.25, 1.5].map(s => (
          <button key={s} onClick={() => setSpeed(s)} className={clsx('text-xs px-2 py-1 rounded-lg transition-colors', speed === s ? 'bg-brand-500 text-white' : 'bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-300')}>{s}x</button>
        ))}
      </div>
    </div>
  )
}

export default function AdminEvaluate() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('writing')
  const [selectedId, setSelectedId] = useState(null)
  const [scores, setScores] = useState({ taskAchievement: 6, coherenceCohesion: 6, lexicalResource: 6, grammaticalRange: 6, feedback: '' })
  const [speakingScores, setSpeakingScores] = useState({ fluencyCoherence: 6, lexicalResource: 6, grammaticalRange: 6, pronunciation: 6, feedback: '' })

  const { data: writingPending, isLoading: wLoading } = useQuery({ queryKey: ['writing-pending'], queryFn: () => api.get('/writing/pending').then(r => r.data), enabled: activeTab === 'writing' })
  const { data: speakingPending, isLoading: sLoading } = useQuery({ queryKey: ['speaking-pending'], queryFn: () => api.get('/speaking/pending').then(r => r.data), enabled: activeTab === 'speaking' })

  const evaluateWriting = useMutation({ mutationFn: ({ id, data }) => api.patch(`/writing/${id}/evaluate`, data), onSuccess: () => { toast.success('Evaluation saved'); setSelectedId(null); queryClient.invalidateQueries(['writing-pending']) } })
  const evaluateSpeaking = useMutation({ mutationFn: ({ id, data }) => api.patch(`/speaking/${id}/evaluate`, data), onSuccess: () => { toast.success('Evaluation saved'); setSelectedId(null); queryClient.invalidateQueries(['speaking-pending']) } })

  const calcBand = (s, type) => {
    const keys = type === 'writing' ? ['taskAchievement', 'coherenceCohesion', 'lexicalResource', 'grammaticalRange'] : ['fluencyCoherence', 'lexicalResource', 'grammaticalRange', 'pronunciation']
    const sum = keys.reduce((acc, k) => acc + (parseFloat(s[k]) || 0), 0)
    return (sum / 4).toFixed(1)
  }

  const list = activeTab === 'writing' ? writingPending : speakingPending
  const current = selectedId ? list?.find(i => i.id === selectedId) : list?.[0]
  const total = list?.length || 0
  const evaluated = total - (list?.filter(i => !current || i.id === current.id).length)
  const curScores = activeTab === 'writing' ? scores : speakingScores
  const setCurScores = activeTab === 'writing' ? setScores : setSpeakingScores
  const c = criteria[activeTab]

  return (
    <div className="h-[calc(100vh-7rem)] flex gap-6 animate-fade-in">
      {/* Left Panel */}
      <div className="w-[55%] bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden flex flex-col">
        {/* Progress */}
        <div className="px-6 py-4 border-b border-surface-100 dark:border-surface-700 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-surface-700 dark:text-surface-200">Progress</p>
            <p className="text-xs text-surface-400">{evaluated} / {total} evaluated</p>
          </div>
          <div className="w-32 h-2 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: total ? `${(evaluated / total) * 100}%` : '0%' }} />
          </div>
        </div>

        {/* Student Header */}
        {current && (
          <div className="px-6 py-4 border-b border-surface-100 dark:border-surface-700 flex items-center gap-3">
            <Avatar name={current.moduleSession?.session?.user?.name || ''} size="md" />
            <div>
              <p className="font-medium text-surface-900 dark:text-white">{current.moduleSession?.session?.user?.name}</p>
              <p className="text-xs text-surface-400">{current.moduleSession?.session?.test?.title} {current.taskNumber && `• Task ${current.taskNumber}`}</p>
            </div>
            <span className="ml-auto text-xs text-surface-400">{new Date(current.createdAt || Date.now()).toLocaleDateString()}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!current ? (
            <div className="text-center py-16 text-surface-400">
              <p>No {activeTab} submissions pending</p>
            </div>
          ) : activeTab === 'writing' ? (
            <div className="space-y-4">
              {/* Prompt Card */}
              <div className="p-4 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800">
                <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mb-1">Task Prompt</p>
                <p className="text-sm text-surface-700 dark:text-surface-300">{current.moduleSession?.module?.questions?.find(q => q.type === `WRITING_TASK${current.taskNumber}`)?.questionText || 'Prompt not found'}</p>
              </div>
              {/* Response */}
              <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-surface-400">Student Response</span>
                  <span className="text-xs text-surface-400">{current.wordCount || 0} words</span>
                </div>
                <p className="text-sm text-surface-700 dark:text-surface-300 leading-relaxed whitespace-pre-wrap">{current.content?.replace(/<[^>]*>/g, '')}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {current.audioUrl && <AudioPlayer src={current.audioUrl} />}
              <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
                <p className="text-xs text-surface-400 mb-2">Speaking Part</p>
                <p className="text-sm text-surface-700 dark:text-surface-300">{current.moduleSession?.module?.questions?.[0]?.questionText || 'Question not found'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-[45%] bg-surface-50 dark:bg-surface-900/50 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Band Preview */}
          <div className="text-center p-4 bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700">
            <p className="section-label mb-1">Projected Band</p>
            <p className="text-4xl font-bold text-brand-500">{calcBand(curScores, activeTab)}</p>
          </div>

          {/* Criteria */}
          {c.map(crit => (
            <div key={crit.key} className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-700 dark:text-surface-200">{crit.label}</p>
                  <p className="text-xs text-surface-400">{crit.desc}</p>
                </div>
                <span className="text-xl font-bold text-brand-500">{curScores[crit.key]}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {bandOptions.map(b => (
                  <button key={b} onClick={() => setCurScores(s => ({ ...s, [crit.key]: b }))}
                    className={clsx(
                      'w-10 h-8 rounded-lg text-xs font-semibold border transition-all',
                      parseFloat(curScores[crit.key]) === b
                        ? 'bg-brand-500 text-white border-brand-500 shadow-glow'
                        : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:border-brand-300'
                    )}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Feedback */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Feedback</label>
            <textarea className="input" rows={5} placeholder="Write detailed feedback for the student..." value={curScores.feedback} onChange={e => setCurScores(s => ({ ...s, feedback: e.target.value }))} />
            <p className="text-xs text-surface-400 text-right">{curScores.feedback.length} characters</p>
          </div>
        </div>

        {/* Sticky Bottom */}
        <div className="p-4 border-t border-surface-200 dark:border-surface-700 flex gap-3 bg-white dark:bg-surface-800">
          <button onClick={() => { const idx = list?.findIndex(i => i.id === (current?.id || list?.[0]?.id)); if (idx < list.length - 1) setSelectedId(list[idx + 1]?.id) }} className="btn-ghost text-sm flex-1 justify-center">Skip</button>
          <Button className="flex-1 justify-center" loading={evaluateWriting.isPending || evaluateSpeaking.isPending}
            onClick={() => {
              if (activeTab === 'writing') evaluateWriting.mutate({ id: current.id, data: { taskAchievement: parseFloat(scores.taskAchievement), coherenceCohesion: parseFloat(scores.coherenceCohesion), lexicalResource: parseFloat(scores.lexicalResource), grammaticalRange: parseFloat(scores.grammaticalRange), feedback: scores.feedback } })
              else evaluateSpeaking.mutate({ id: current.id, data: { fluencyCoherence: parseFloat(speakingScores.fluencyCoherence), lexicalResource: parseFloat(speakingScores.lexicalResource), grammaticalRange: parseFloat(speakingScores.grammaticalRange), pronunciation: parseFloat(speakingScores.pronunciation), feedback: speakingScores.feedback } })
            }}>
            Save & Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-surface-800 rounded-2xl shadow-modal border border-surface-200 dark:border-surface-700 p-1 flex gap-1 z-20">
        <button onClick={() => { setActiveTab('writing'); setSelectedId(null) }} className={clsx('flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all', activeTab === 'writing' ? 'bg-brand-500 text-white' : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700')}>
          <PenLine className="w-4 h-4" /> Writing ({writingPending?.length || 0})
        </button>
        <button onClick={() => { setActiveTab('speaking'); setSelectedId(null) }} className={clsx('flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all', activeTab === 'speaking' ? 'bg-brand-500 text-white' : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700')}>
          <Mic className="w-4 h-4" /> Speaking ({speakingPending?.length || 0})
        </button>
      </div>
    </div>
  )
}