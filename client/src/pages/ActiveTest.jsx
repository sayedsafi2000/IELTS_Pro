import { useState, useEffect, useRef, useCallback } from 'react'
import { clsx } from 'clsx'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Bookmark, Play, Pause, ChevronLeft, ChevronRight, Flag, Send, Mic, Square, Upload } from 'lucide-react'

function TimerDisplay({ seconds }) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const isLow = seconds < 300
  const isMid = seconds >= 300 && seconds < 600
  return (
    <div className={clsx(
      'px-4 py-2 rounded-xl font-mono text-base font-semibold',
      isLow  ? 'bg-red-900/50 text-red-300 animate-pulse-soft' :
      isMid  ? 'bg-amber-900/50 text-amber-300' :
              'bg-surface-700 text-surface-100'
    )}>
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </div>
  )
}

function ListeningAudioBar({ src, listenOnce }) {
  const [played, setPlayed] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => { if (audioRef.current) audioRef.current.src = src }, [src])

  const handlePlay = () => {
    if (listenOnce && played) return
    audioRef.current?.play()
    setPlaying(true)
  }

  const handleTimeUpdate = () => {
    const t = audioRef.current?.currentTime || 0
    setCurrentTime(t)
    if (t > 0 && !played) setPlayed(true)
    if (audioRef.current?.ended) setPlaying(false)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const canSeek = !listenOnce || !played

  return (
    <div className="bg-surface-900 border-b border-surface-700">
      <div className="max-w-3xl mx-auto p-4 flex items-center gap-4">
        <button onClick={handlePlay} disabled={listenOnce && played}
          className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all',
            listenOnce && played ? 'bg-surface-700 text-surface-500 cursor-not-allowed' : 'bg-brand-500 text-white hover:bg-brand-600'
          )}>
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <div className="flex-1">
          <div className={clsx('h-1.5 bg-surface-700 rounded-full cursor-pointer', !canSeek && 'opacity-50')}
            onClick={canSeek ? (e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const pct = (e.clientX - rect.left) / rect.width
              if (audioRef.current) audioRef.current.currentTime = pct * duration
            } : undefined}>
            <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-surface-400 mt-1 font-mono">
            <span>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}</span>
            <span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
          </div>
        </div>
        <span className="text-xs font-medium text-surface-400 shrink-0">LISTENING</span>
        <audio ref={audioRef} onLoadedMetadata={() => setDuration(audioRef.current.duration)} onTimeUpdate={handleTimeUpdate} onEnded={() => { setPlaying(false); setPlayed(true) }} />
      </div>
      {listenOnce && played && (
        <div className="bg-amber-500/10 border-t border-amber-500/20 py-2 text-center">
          <p className="text-xs text-amber-500 font-medium">This audio plays once only. You cannot rewind or replay.</p>
        </div>
      )}
    </div>
  )
}

function QuestionRenderer({ question, answer, onChange, readOnly, showAnswer }) {
  const value = answer?.studentAnswer || ''
  const correct = question.correctAnswer

  const renderResult = () => {
    if (!showAnswer || !correct) return null
    const isCorrect = value.trim().toLowerCase() === correct.toString().trim().toLowerCase()
    return <span className="ml-2 text-sm font-bold text-green-500">{isCorrect ? 'Correct' : `Answer: ${correct}`}</span>
  }

  switch (question.type) {
    case 'MULTIPLE_CHOICE': {
      const options = typeof question.options === 'string' ? JSON.parse(question.options) : question.options || []
      return (
        <div className="space-y-2">
          {options.map((opt, i) => {
            const isSelected = value === opt[0]
            const isCorrectOpt = showAnswer && correct === opt[0]
            return (
              <label key={i} className={clsx(
                'flex items-center gap-3 p-4 border-2 border-surface-200 dark:border-surface-600 rounded-xl cursor-pointer transition-all min-h-[52px]',
                isSelected && !showAnswer ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-glow' : '',
                showAnswer && isCorrectOpt ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : '',
                showAnswer && isSelected && !isCorrectOpt ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : '',
                !isSelected ? 'hover:border-brand-300 hover:bg-brand-50/30 dark:hover:bg-brand-900/10' : ''
              )}>
                <span className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium shrink-0"
                  style={{ borderColor: isSelected ? '#6366f1' : undefined, background: isSelected ? '#6366f1' : undefined, color: isSelected ? 'white' : undefined }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-surface-700 dark:text-surface-300">{opt}</span>
                {showAnswer && isCorrectOpt && <span className="ml-auto text-green-500 font-bold text-lg">✓</span>}
              </label>
            )
          })}
        </div>
      )
    }
    case 'TRUE_FALSE_NG':
      return (
        <div className="flex gap-3">
          {['True', 'False', 'Not Given'].map(opt => (
            <label key={opt} className={clsx(
              'flex-1 p-4 border-2 border-surface-200 dark:border-surface-600 rounded-xl cursor-pointer text-center font-medium transition-all min-h-[52px] flex items-center justify-center',
              value === opt ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700' : 'hover:border-brand-300'
            )}>
              <input type="radio" checked={value === opt} onChange={() => onChange(opt)} disabled={readOnly} className="sr-only" />
              {opt}
            </label>
          ))}
        </div>
      )
    case 'FILL_BLANK':
    case 'SHORT_ANSWER':
    case 'SENTENCE_COMPLETION':
      return (
        <div>
          <input type="text" value={value} onChange={e => onChange(e.target.value)} disabled={readOnly} placeholder="Type your answer..." className="input" />
          {renderResult()}
        </div>
      )
    case 'MATCHING':
    case 'MATCHING_HEADINGS': {
      const items = typeof question.options === 'string' ? JSON.parse(question.options) : question.options || []
      return (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-surface-50 dark:bg-surface-800/50 rounded-xl">
              <span className="font-medium w-6 shrink-0 text-surface-400">{i + 1}.</span>
              <span className="text-surface-700 dark:text-surface-300 text-sm flex-1">{item}</span>
              <select value={(() => { try { return JSON.parse(value || '{}')[i] || '' } catch { return '' } })()}
                onChange={e => {
                  const v = JSON.parse(value || '{}')
                  v[i] = e.target.value
                  onChange(JSON.stringify(v))
                }}
                disabled={readOnly} className="input w-auto min-w-[80px]">
                <option value="">—</option>
                {['A', 'B', 'C', 'D', 'E', 'F'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
      )
    }
    default:
      return <p className="text-surface-400 text-sm">Question type: {question.type}</p>
  }
}

function WritingEditor({ taskNumber, content, onChange, readOnly }) {
  const editor = useEditor({ extensions: [StarterKit], content, editable: !readOnly, onUpdate: e => onChange(e.editor.getHTML()) })
  const wordCount = editor?.getText().split(/\s+/).filter(w => w).length || 0
  const minWords = taskNumber === 1 ? 150 : 250
  const pct = Math.min((wordCount / minWords) * 100, 100)
  const barColor = pct < 60 ? 'bg-red-500' : pct < 100 ? 'bg-amber-500' : 'bg-green-500'
  useEffect(() => { if (editor && content) editor.commands.setContent(content) }, [content])
  return (
    <div className="space-y-3">
      <div className="border border-surface-200 dark:border-surface-600 rounded-xl overflow-hidden">
        <div className="bg-surface-50 dark:bg-surface-800 px-4 py-2 border-b border-surface-200 dark:border-surface-600 flex justify-between items-center">
          <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Task {taskNumber}</span>
          <span className={clsx('text-sm font-medium', pct < 60 ? 'text-red-500' : pct < 100 ? 'text-amber-500' : 'text-green-500')}>{wordCount} / {minWords} words</span>
        </div>
        <EditorContent editor={editor} className="p-4 min-h-[280px] prose prose-sm max-w-none dark:prose-invert" />
      </div>
      <div className="h-1.5 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function SpeakingRecorder({ moduleSessionId, existingUrl, readOnly }) {
  const [recording, setRecording] = useState(false)
  const [blob, setBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(existingUrl)
  const [count, setCount] = useState(0)
  const [timer, setTimer] = useState(0)
  const mediaRef = useRef(null)
  const timerRef = useRef(null)

  const startRecording = async () => {
    if (count >= 2) { toast.error('Maximum 2 recordings'); return }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mediaRecorder = new MediaRecorder(stream)
    const chunks = []
    mediaRecorder.ondataavailable = e => chunks.push(e.data)
    mediaRecorder.onstop = () => {
      const b = new Blob(chunks, { type: 'audio/webm' })
      setBlob(b)
      setAudioUrl(URL.createObjectURL(b))
      stream.getTracks().forEach(t => t.stop())
      clearInterval(timerRef.current)
      setTimer(0)
    }
    mediaRef.current = mediaRecorder
    mediaRecorder.start()
    setRecording(true)
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
  }

  const stopRecording = () => { mediaRef.current?.stop(); setRecording(false); setCount(c => c + 1) }

  return (
    <div className="text-center space-y-4">
      {audioUrl && !blob && <audio src={audioUrl} controls className="mx-auto w-full max-w-md" />}
      {blob && <audio src={URL.createObjectURL(blob)} controls className="mx-auto w-full max-w-md" />}
      {recording && (
        <div className="flex items-center justify-center gap-4">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-500 font-bold text-lg">Recording... {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</span>
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        </div>
      )}
      {!readOnly && (
        <div className="flex gap-3 justify-center">
          {!recording ? (
            <button onClick={startRecording} className="btn-danger">
              <Mic className="w-4 h-4" /> {blob ? 'Re-record' : 'Record'} ({count}/2)
            </button>
          ) : (
            <button onClick={stopRecording} className="btn-primary">
              <Square className="w-4 h-4" /> Stop
            </button>
          )}
          {blob && (
            <button onClick={async () => {
              const formData = new FormData()
              formData.append('audio', blob, 'recording.webm')
              formData.append('moduleSessionId', moduleSessionId)
              toast.loading('Uploading...', { id: 'upload' })
              await api.post('/speaking/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
              toast.success('Recording uploaded!', { id: 'upload' })
            }} className="btn-primary">
              <Upload className="w-4 h-4" /> Upload
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ActiveTest() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}`).then(r => r.data),
    refetchInterval: 30000
  })

  const [currentModuleIdx, setCurrentModuleIdx] = useState(0)
  const [currentQIdx, setCurrentQIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timer, setTimer] = useState(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [writingContents, setWritingContents] = useState({})
  const [activeTask, setActiveTask] = useState(1)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const saveTimerRef = useRef(null)

  const modules = session?.modulesSessions || []
  const currentModule = modules[currentModuleIdx]
  const moduleDef = session?.test?.modules?.find(m => m.id === currentModule?.moduleId)
  const questions = moduleDef?.questions || []
  const isPractice = session?.mode === 'PRACTICE'
  const isListening = moduleDef?.type === 'LISTENING'
  const isWriting = moduleDef?.type === 'WRITING'

  useEffect(() => {
    if (currentModule && currentModule.status === 'NOT_STARTED') {
      api.post(`/sessions/${sessionId}/module/${currentModule.moduleId}/submit`).catch(() => {})
    }
    if (moduleDef) {
      const elapsed = currentModule?.startedAt ? Math.floor((Date.now() - new Date(currentModule.startedAt).getTime()) / 1000) : 0
      setTimer(moduleDef.durationMins * 60 - elapsed)
    }
  }, [currentModuleIdx])

  useEffect(() => {
    if (!timer || timer <= 0) return
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(interval); handleSubmitModule(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timer])

  useEffect(() => { if (isPractice) setShowAnswer(true) }, [isPractice])

  useEffect(() => {
    if (currentModule?.answers) {
      const a = {}
      currentModule.answers.forEach(ans => { a[ans.questionId] = ans })
      setAnswers(a)
    }
    if (currentModule?.writingSubmissions) {
      const w = {}
      currentModule.writingSubmissions.forEach(s => { w[s.taskNumber] = s.content })
      setWritingContents(w)
    }
  }, [currentModule])

  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(saveAllAnswers, 2000)
    }
  }, [answers])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && session?.mode === 'EXAM') {
        api.patch(`/sessions/${sessionId}/tab-switch`).then(res => {
          if (res.data.autoSubmit) {
            api.post(`/sessions/${sessionId}/submit`).then(() => navigate('/results'))
            toast.error('Test auto-submitted due to excessive tab switching.')
          } else {
            toast.error(`Warning: Tab switching detected (${res.data.count}/5)`)
          }
        }).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [session])

  const saveAllAnswers = useCallback(async () => {
    if (!currentModule) return
    setSaving(true)
    const toSave = Object.entries(answers).map(([questionId, ans]) => ({
      moduleSessionId: currentModule.id, questionId, answer: ans.studentAnswer
    }))
    if (toSave.length > 0) await api.post('/answers/bulk-save', { answers: toSave }).catch(() => {})
    setSaving(false)
    setSavedAt(new Date())
  }, [answers, currentModule])

  const handleAnswerChange = (questionId, val) => {
    setAnswers(prev => ({ ...prev, [questionId]: { ...prev[questionId], studentAnswer: val } }))
  }

  const handleFlag = (questionId) => {
    setAnswers(prev => ({ ...prev, [questionId]: { ...prev[questionId], isFlagged: !prev[questionId]?.isFlagged } }))
  }

  const submitModuleMutation = useMutation({
    mutationFn: async () => {
      if (Object.keys(answers).length > 0) await saveAllAnswers()
      await api.post(`/sessions/${sessionId}/module/${currentModule.moduleId}/submit`)
    },
    onSuccess: () => {
      if (currentModuleIdx < modules.length - 1) {
        setCurrentModuleIdx(i => i + 1)
        setCurrentQIdx(0)
        queryClient.invalidateQueries(['session', sessionId])
        toast.success('Module submitted!')
      } else {
        api.post(`/sessions/${sessionId}/submit`).then(() => { queryClient.invalidateQueries(['session', sessionId]); navigate('/results') })
      }
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to submit')
  })

  const handleSubmitModule = () => submitModuleMutation.mutate()

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-surface-900"><div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!session) return <div className="text-center py-20">Session not found</div>

  return (
    <div className="fixed inset-0 bg-surface-50 dark:bg-surface-900 flex flex-col">
      {/* Top Bar */}
      <div className="h-14 bg-surface-900 text-white flex items-center justify-between px-5 shrink-0 z-10">
        <span className="text-sm font-medium truncate max-w-[200px]">{session.test?.title}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{moduleDef?.type}</span>
          <span className="text-surface-400 text-sm">·</span>
          <span className="text-sm text-surface-400">Question {currentQIdx + 1} of {questions.length}</span>
        </div>
        {!isPractice && <TimerDisplay seconds={timer || 0} />}
      </div>

      {/* Listening Audio Bar */}
      {isListening && moduleDef.audioUrl && <ListeningAudioBar src={moduleDef.audioUrl} listenOnce={!isPractice} />}

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="w-72 bg-surface-50 dark:bg-surface-800 border-r border-surface-200 dark:border-surface-700 overflow-y-auto p-4 shrink-0">
          <p className="section-label mb-3">Questions</p>
          {(isListening || isWriting) ? (
            <div className="grid grid-cols-6 gap-1.5">
              {questions.map((q, i) => {
                const answered = !!answers[q.id]?.studentAnswer
                const flagged = !!answers[q.id]?.isFlagged
                const isCurrent = i === currentQIdx
                return (
                  <button key={q.id} onClick={() => setCurrentQIdx(i)}
                    className={clsx(
                      'w-9 h-9 rounded-lg text-xs font-medium transition-all flex items-center justify-center',
                      isCurrent ? 'ring-2 ring-brand-500 ring-offset-2' : '',
                      answered ? 'bg-brand-500 text-white' : flagged ? 'bg-amber-400 text-white' : 'bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400'
                    )}>
                    {i + 1}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {modules.map((ms, i) => (
                <button key={i} onClick={() => ms.status !== 'SUBMITTED' ? setCurrentModuleIdx(i) : null}
                  disabled={ms.status === 'SUBMITTED'}
                  className={clsx(
                    'p-2 rounded-xl text-xs font-medium text-center transition-all',
                    i === currentModuleIdx ? 'bg-brand-500 text-white' :
                    ms.status === 'SUBMITTED' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                    'bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400'
                  )}>
                  {session?.test?.modules?.find(m => m.id === ms.moduleId)?.type?.slice(0, 3)}
                  {ms.status === 'SUBMITTED' && ' ✓'}
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-col gap-1.5 text-xs text-surface-400">
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-brand-500" /> Answered</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-400" /> Flagged</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded border border-surface-300 dark:border-surface-600" /> Unanswered</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 relative">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Writing Task Tabs */}
            {isWriting && (
              <div className="flex gap-2">
                {[1, 2].map(t => (
                  <button key={t} onClick={() => setActiveTask(t)}
                    className={clsx('px-4 py-2 rounded-xl text-sm font-medium transition-all',
                      activeTask === t ? 'bg-brand-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-500'
                    )}>
                    Task {t}
                  </button>
                ))}
              </div>
            )}

            {/* Question */}
            {(isListening || moduleDef?.type === 'READING') && questions[currentQIdx] && (
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="badge-info">{questions[currentQIdx].section > 1 ? `Section ${questions[currentQIdx].section}` : 'Section 1'}</span>
                  <span className="text-sm text-surface-400">Q{currentQIdx + 1}</span>
                  {answers[questions[currentQIdx].id]?.isFlagged && <Flag className="w-4 h-4 text-amber-500" />}
                </div>
                <p className="text-lg text-surface-900 dark:text-surface-100 leading-relaxed mb-6">{questions[currentQIdx].questionText}</p>
                <QuestionRenderer question={questions[currentQIdx]} answer={answers[questions[currentQIdx]?.id]} onChange={val => handleAnswerChange(questions[currentQIdx].id, val)} readOnly={currentModule?.status === 'SUBMITTED'} showAnswer={showAnswer} />
                {!currentModule?.status === 'SUBMITTED' && (
                  <button onClick={() => handleFlag(questions[currentQIdx].id)} className="mt-4 text-sm text-surface-500 hover:text-amber-500 flex items-center gap-1">
                    <Flag className="w-3.5 h-3.5" /> {answers[questions[currentQIdx].id]?.isFlagged ? 'Unflag' : 'Flag for review'}
                  </button>
                )}
              </div>
            )}

            {isWriting && questions.filter(q => q.type === `WRITING_TASK${activeTask}`).map(q => (
              <div key={q.id} className="space-y-4">
                <div className="card p-5 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">Task {activeTask} Prompt</p>
                  <p className="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{q.questionText}</p>
                </div>
                <WritingEditor taskNumber={activeTask} content={writingContents[activeTask] || ''} onChange={val => setWritingContents(prev => ({ ...prev, [activeTask]: val }))} readOnly={currentModule?.status === 'SUBMITTED'} />
              </div>
            ))}

            {moduleDef?.type === 'SPEAKING' && (
              <div className="space-y-4">
                {questions.map(q => (
                  <div key={q.id} className="card p-6">
                    <span className={clsx('badge-info mb-3')}>{q.type.replace(/_/g, ' ')}</span>
                    <p className="text-lg text-surface-900 dark:text-surface-100 mb-4">{q.questionText}</p>
                    {q.instructions && <p className="text-sm text-surface-500 mb-4">{q.instructions}</p>}
                    <SpeakingRecorder moduleSessionId={currentModule?.id} existingUrl={currentModule?.speakingSubmission?.audioUrl} readOnly={currentModule?.status === 'SUBMITTED'} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Auto-save indicator */}
          <div className="fixed bottom-4 left-80 text-xs text-surface-400">
            {saving ? '● Saving...' : savedAt ? `✓ Saved ${Math.round((Date.now() - savedAt.getTime()) / 1000)}s ago` : ''}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="h-16 bg-white dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700 flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-2">
          {!currentModule?.status === 'SUBMITTED' && (
            <button onClick={() => handleFlag(questions[currentQIdx]?.id)} className="btn-ghost text-sm">
              <Flag className={clsx('w-4 h-4', answers[questions[currentQIdx]?.id]?.isFlagged && 'text-amber-500 fill-amber-500')} />
              {answers[questions[currentQIdx]?.id]?.isFlagged ? 'Flagged' : 'Flag'}
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {currentQIdx > 0 && (isListening || moduleDef?.type === 'READING') && (
            <button onClick={() => setCurrentQIdx(i => i - 1)} className="btn-secondary text-sm">
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
          )}
          {currentQIdx < questions.length - 1 && (isListening || moduleDef?.type === 'READING') && (
            <button onClick={() => setCurrentQIdx(i => i + 1)} className="btn-secondary text-sm">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
          <button onClick={handleSubmitModule} disabled={submitModuleMutation.isPending} className="btn-primary text-sm">
            {submitModuleMutation.isPending ? 'Submitting...' : currentModuleIdx < modules.length - 1 ? 'Submit Module' : 'Submit Test'}
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}