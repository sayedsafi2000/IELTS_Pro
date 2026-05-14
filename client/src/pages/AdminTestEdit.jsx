import { useState, useRef, useEffect, useMemo } from 'react'
import { clsx } from 'clsx'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../services/api'
import toast from 'react-hot-toast'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Textarea from '../components/ui/Textarea'
import ConfirmModal from '../components/ui/ConfirmModal'
import AudioUploadSection from '../components/admin/AudioUploadSection'
import { MODULE_TYPES, ALLOWED_BY_MODULE, QUESTION_TYPE_META, getAllowedQuestionTypes } from '../constants/questionTypes'
import { X, Plus, Trash2, GripVertical, PenLine, Music, Grip, ChevronDown, Eye, Copy, ToggleLeft, ToggleRight, BookOpen, Headphones } from 'lucide-react'

const moduleColors = {
  LISTENING: 'from-blue-500 to-cyan-500',
  READING: 'from-purple-500 to-pink-500',
  WRITING: 'from-amber-500 to-orange-500',
  SPEAKING: 'from-green-500 to-emerald-500',
}

export default function AdminTestEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isNew = !id
  const [selectedModuleIdx, setSelectedModuleIdx] = useState(0)
  const [showDrawer, setShowDrawer] = useState(false)
  const [questionForm, setQuestionForm] = useState({ type: 'MULTIPLE_CHOICE', questionText: '', instructions: '', options: '', correctAnswer: '', marks: 1, section: 1 })
  const [newTestForm, setNewTestForm] = useState({ title: '', description: '', price: 0, isPaid: false, bkashNumber: '', bankName: '', bankAccount: '' })
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const { data: test, isLoading } = useQuery({
    queryKey: ['test', id],
    queryFn: () => api.get(`/tests/${id}`).then(r => r.data),
    enabled: !isNew
  })

  const createTest = useMutation({ mutationFn: data => api.post('/tests', data), onSuccess: (res) => { toast.success('Test created'); navigate(`/admin/tests/${res.data.id}`) } })
  const updateTest = useMutation({
    mutationFn: data => api.patch(`/tests/${id}`, data),
    onSuccess: () => {
      toast.success('Test updated')
      queryClient.invalidateQueries(['test', id])
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || 'Failed to update test')
    }
  })
  const createModule = useMutation({ mutationFn: data => api.post('/modules', data), onSuccess: () => { toast.success('Module added'); queryClient.invalidateQueries(['test', id]) } })
  const deleteModule = useMutation({ mutationFn: mid => api.delete(`/modules/${mid}`), onSuccess: () => { toast.success('Module deleted'); queryClient.invalidateQueries(['test', id]); setSelectedModuleIdx(0) } })
  const createQuestion = useMutation({
    mutationFn: data => api.post('/questions', data),
    onSuccess: () => {
      toast.success('Question added')
      queryClient.invalidateQueries(['test', id])
      setShowDrawer(false)
      setQuestionForm({ type: 'MULTIPLE_CHOICE', questionText: '', instructions: '', options: '', correctAnswer: '', marks: 1, section: 1 })
    },
    onError: (err) => {
      const msg = err.response?.data?.error
        || err.response?.data?.errors?.map(e => e.msg || e.message).filter(Boolean).join('; ')
        || err.message
        || 'Failed to add question'
      toast.error(msg)
    }
  })
  const deleteQuestion = useMutation({ mutationFn: qid => api.delete(`/questions/${qid}`), onSuccess: () => { toast.success('Question deleted'); queryClient.invalidateQueries(['test', id]) } })

  const modules = test?.modules || []
  const selectedModule = modules[selectedModuleIdx]

  const usedModuleTypes = useMemo(() => new Set(modules.map(m => m.type)), [modules])
  const availableModuleTypes = useMemo(() => MODULE_TYPES.filter(t => !usedModuleTypes.has(t)), [usedModuleTypes])
  const allowedQuestionTypes = useMemo(
    () => (selectedModule ? getAllowedQuestionTypes(selectedModule.type) : []),
    [selectedModule?.type]
  )

  useEffect(() => {
    if (!selectedModule) return
    if (!allowedQuestionTypes.includes(questionForm.type)) {
      setQuestionForm(f => ({ ...f, type: allowedQuestionTypes[0] || 'MULTIPLE_CHOICE' }))
    }
  }, [selectedModule?.id])

  const handleSaveTest = () => {
    if (isNew) {
      createTest.mutate({
        title: newTestForm.title.trim() || 'Untitled Test',
        description: newTestForm.description.trim() || '',
        type: 'FULL',
        duration: 165,
        isPublished: false,
        price: parseFloat(newTestForm.price) || 0,
        isPaid: newTestForm.isPaid,
        bkashNumber: newTestForm.bkashNumber.trim() || null,
        bankName: newTestForm.bankName.trim() || null,
        bankAccount: newTestForm.bankAccount.trim() || null
      })
    } else updateTest.mutate(test)
  }

  const handleAddModule = (type) => {
    if (!id) { toast.error('Save the test first'); return }
    if (usedModuleTypes.has(type)) {
      toast.error(`${type} module already added to this test`)
      return
    }
    createModule.mutate({ testId: id, type, title: `${type} Module`, durationMins: type === 'LISTENING' ? 30 : type === 'READING' ? 60 : type === 'WRITING' ? 60 : 15 })
  }

  const handleAddQuestion = () => {
    if (!selectedModule?.id) {
      toast.error('Select a module first')
      return
    }
    const qText = (questionForm.questionText || '').trim()
    if (!qText) {
      toast.error('Enter question text')
      return
    }
    const marksNum = Math.max(1, parseInt(String(questionForm.marks), 10) || 1)
    const sectionNum = Math.max(1, parseInt(String(questionForm.section), 10) || 1)

    const optionLines = (questionForm.options || '').split('\n').map(o => o.trim()).filter(Boolean)
    const needsOptions = ['MULTIPLE_CHOICE', 'MATCHING', 'MATCHING_HEADINGS'].includes(questionForm.type)
    if (needsOptions && optionLines.length === 0) {
      toast.error('Add at least one option (one per line) for this question type')
      return
    }

    const payload = {
      moduleId: selectedModule.id,
      type: questionForm.type,
      questionText: qText,
      instructions: (questionForm.instructions || '').trim() || undefined,
      marks: marksNum,
      section: sectionNum
    }

    if (needsOptions) {
      payload.options = optionLines
    }
    const ca = (questionForm.correctAnswer || '').trim()
    if (ca) {
      payload.correctAnswer = ca
    }

    createQuestion.mutate(payload)
  }

  if (isNew) {
    return (
      <div className="max-w-2xl">
        <Card className="p-8">
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-6">Create New Test</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Test Title</label>
              <input
                className="input"
                placeholder="e.g., IELTS Academic Test - January 2026"
                value={newTestForm.title}
                onChange={e => setNewTestForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Description</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Optional description..."
                value={newTestForm.description}
                onChange={e => setNewTestForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Payment Settings */}
            <div className="border-t border-surface-200 dark:border-surface-700 pt-4 mt-4">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-white mb-3">Payment Settings</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={newTestForm.isPaid} onChange={e => setNewTestForm(f => ({ ...f, isPaid: e.target.checked }))}
                    className="w-5 h-5 rounded border-surface-300 text-brand-500 focus:ring-brand-500" />
                  <span className="text-sm font-medium text-surface-700 dark:text-surface-300">This is a paid test</span>
                </label>

                {newTestForm.isPaid && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Price (৳)</label>
                      <input type="number" value={newTestForm.price} onChange={e => setNewTestForm(f => ({ ...f, price: e.target.value }))}
                        className="input" placeholder="0" min="0" step="0.01" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">bKash Number (for payments)</label>
                      <input type="text" value={newTestForm.bkashNumber} onChange={e => setNewTestForm(f => ({ ...f, bkashNumber: e.target.value }))}
                        className="input" placeholder="01XXXXXXXXX" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Bank Name</label>
                        <input type="text" value={newTestForm.bankName} onChange={e => setNewTestForm(f => ({ ...f, bankName: e.target.value }))}
                          className="input" placeholder="e.g., Dhaka Bank" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-surface-300 mb-1.5">Bank Account</label>
                        <input type="text" value={newTestForm.bankAccount} onChange={e => setNewTestForm(f => ({ ...f, bankAccount: e.target.value }))}
                          className="input" placeholder="Account number" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Button onClick={handleSaveTest} loading={createTest.isPending} className="w-full justify-center mt-4">Create Test</Button>
          </div>
        </Card>
      </div>
    )
  }

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <input
            className="text-2xl font-bold bg-transparent border-none outline-none text-surface-900 dark:text-white w-full focus:ring-0 placeholder-surface-300"
            value={test?.title || ''}
            onChange={e => queryClient.setQueryData(['test', id], (old) => ({ ...old, title: e.target.value }))}
            placeholder="Test title..."
          />
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${test?.isPublished ? 'badge-success' : 'badge-neutral'}`}>
              {test?.isPublished ? 'Published' : 'Draft'}
            </span>
            <span className="text-xs text-surface-400">{modules.length} modules • {test?.modules?.reduce((a, m) => a + (m.questions?.length || 0), 0)} questions</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => { queryClient.setQueryData(['test', id], (old) => ({ ...old, isPublished: !old.isPublished })); updateTest.mutate({ ...test, isPublished: !test.isPublished }) }}
            className="btn-ghost text-sm">
            {test?.isPublished ? <><ToggleRight className="w-4 h-4 text-green-500" /> Published</> : <><ToggleLeft className="w-4 h-4" /> Draft</>}
          </button>
          <button onClick={handleSaveTest} className="btn-primary text-sm" loading={updateTest.isPending}>Save Changes</button>
        </div>
      </div>

      {/* Module Tabs */}
      <div className="flex gap-2 p-1 bg-surface-100 dark:bg-surface-800 rounded-2xl w-fit">
        {modules.map((mod, i) => (
          <button key={mod.id} onClick={() => setSelectedModuleIdx(i)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
              i === selectedModuleIdx ? 'bg-white dark:bg-surface-700 shadow-soft text-surface-900 dark:text-white' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
            )}>
            {mod.type === 'LISTENING' && <Headphones className="w-3.5 h-3.5" />}
            {mod.type === 'READING' && <BookOpen className="w-3.5 h-3.5" />}
            {mod.type === 'WRITING' && <PenLine className="w-3.5 h-3.5" />}
            {mod.type === 'SPEAKING' && <Music className="w-3.5 h-3.5" />}
            {mod.type}
          </button>
        ))}
        {availableModuleTypes.length > 0 && (
          <div className="relative group">
            <button className="flex items-center gap-1 px-4 py-2.5 text-sm text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Module
            </button>
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-surface-800 rounded-xl shadow-modal border border-surface-200 dark:border-surface-700 p-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 min-w-[160px]">
              {availableModuleTypes.map(t => (
                <button key={t} onClick={() => handleAddModule(t)} className="w-full text-left px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 rounded-lg transition-colors">
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedModule && (
        <div className="space-y-6">
          {/* LISTENING: Audio Upload */}
          {selectedModule.type === 'LISTENING' && (
            <AudioUploadSection
              moduleId={selectedModule.id}
              existingAudioUrl={selectedModule.audioUrl}
              existingPublicId={selectedModule.cloudinaryPublicId}
              onUploadSuccess={(data) => queryClient.setQueryData(['test', id], (old) => ({
                ...old,
                modules: old.modules.map(m => m.id === selectedModule.id ? { ...m, audioUrl: data.url, cloudinaryPublicId: data.publicId } : m)
              }))}
              onDeleteSuccess={() => queryClient.setQueryData(['test', id], (old) => ({
                ...old,
                modules: old.modules.map(m => m.id === selectedModule.id ? { ...m, audioUrl: null, cloudinaryPublicId: null } : m)
              }))}
            />
          )}

          {/* Module Settings */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-surface-900 dark:text-white">{selectedModule.title}</h3>
                <p className="text-xs text-surface-400 mt-1">{selectedModule.type} • {selectedModule.durationMins} min • {selectedModule.questions?.length || 0} questions</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowDrawer(true)} className="btn-primary text-sm">
                  <Plus className="w-4 h-4" /> Add Question
                </button>
                <button onClick={() => setDeleteConfirm({ type: 'module', id: selectedModule.id })} className="btn-danger text-sm px-3 py-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {selectedModule.type === 'SPEAKING' && (
              <div className="mt-4 pt-4 border-t border-surface-100 dark:border-surface-700">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Speaking mode</label>
                <select
                  className="input max-w-xs"
                  value={selectedModule.speakingMode || 'RECORDED'}
                  onChange={async (e) => {
                    const mode = e.target.value
                    try {
                      await api.patch(`/modules/${selectedModule.id}`, { speakingMode: mode })
                      toast.success(`Speaking mode set to ${mode}`)
                      queryClient.invalidateQueries(['test', id])
                    } catch (err) {
                      toast.error(err.response?.data?.error || 'Failed to update speaking mode')
                    }
                  }}>
                  <option value="RECORDED">Recorded (per-question audio, async grading)</option>
                  <option value="LIVE">Live (Google Meet / Zoom interview)</option>
                </select>
                <p className="text-xs text-surface-400 mt-1.5">
                  {selectedModule.speakingMode === 'LIVE'
                    ? 'Students request a slot. Admin schedules with an examiner. No recorder shown to student.'
                    : 'Students record audio per question; admin grades async.'}
                </p>
              </div>
            )}
          </Card>

          {/* Questions */}
          {selectedModule.questions?.length > 0 ? (
            <div className="space-y-2">
              {selectedModule.questions.map((q, i) => (
                <Card key={q.id} className="p-4 flex items-center gap-4">
                  <GripVertical className="w-4 h-4 text-surface-300 cursor-grab shrink-0" />
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-surface-400">Q{i + 1}</span>
                    <Badge variant="info" dot={false}>{q.type.replace(/_/g, ' ')}</Badge>
                  </div>
                  <p className="flex-1 text-sm text-surface-600 dark:text-surface-300 truncate">{q.questionText}</p>
                  <button onClick={() => deleteQuestion.mutate(q.id)} className="p-1.5 text-surface-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <p className="text-surface-400 text-sm">No questions yet. Click "Add Question" to get started.</p>
            </Card>
          )}
        </div>
      )}

      {/* Question Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setShowDrawer(false)} />
            <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} transition={{ type: 'spring', damping: 25 }} className="fixed right-0 top-0 h-full w-[480px] bg-white dark:bg-surface-800 shadow-modal z-50 flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-surface-200 dark:border-surface-700">
                <h3 className="font-semibold text-lg text-surface-900 dark:text-white">Add Question</h3>
                <button onClick={() => setShowDrawer(false)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                  <X className="w-4 h-4 text-surface-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Type Selector */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Question Type
                    <span className="text-surface-400 font-normal ml-1">({selectedModule?.type})</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {allowedQuestionTypes.map(value => {
                      const meta = QUESTION_TYPE_META[value] || { label: value, icon: '?' }
                      return (
                        <button key={value} onClick={() => setQuestionForm(f => ({ ...f, type: value }))}
                          className={clsx(
                            'p-3 rounded-xl border text-left transition-all',
                            questionForm.type === value
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                              : 'border-surface-200 dark:border-surface-600 hover:border-brand-300 text-surface-600 dark:text-surface-400'
                          )}>
                          <div className="w-7 h-7 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center text-xs font-bold mb-1.5">{meta.icon}</div>
                          <span className="text-xs font-medium">{meta.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Question Text</label>
                  <textarea className="input" rows={3} placeholder="Enter the question..." value={questionForm.questionText} onChange={e => setQuestionForm(f => ({ ...f, questionText: e.target.value }))} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Instructions <span className="text-surface-400 font-normal">(optional)</span></label>
                  <textarea className="input" rows={2} placeholder="Extra instructions for the candidate..." value={questionForm.instructions} onChange={e => setQuestionForm(f => ({ ...f, instructions: e.target.value }))} />
                </div>

                {['MULTIPLE_CHOICE', 'MATCHING', 'MATCHING_HEADINGS'].includes(questionForm.type) && (
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Options (one per line)</label>
                    <textarea className="input" rows={4} placeholder="A. Option 1&#10;B. Option 2&#10;C. Option 3&#10;D. Option 4" value={questionForm.options} onChange={e => setQuestionForm(f => ({ ...f, options: e.target.value }))} />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Correct Answer</label>
                  <input className="input" placeholder="e.g., A or True" value={questionForm.correctAnswer} onChange={e => setQuestionForm(f => ({ ...f, correctAnswer: e.target.value }))} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Section</label>
                    <input type="number" className="input" min={1} value={questionForm.section} onChange={e => setQuestionForm(f => ({ ...f, section: e.target.value === '' ? '' : Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Marks</label>
                    <input type="number" className="input" min={1} value={questionForm.marks} onChange={e => setQuestionForm(f => ({ ...f, marks: e.target.value === '' ? '' : Number(e.target.value) }))} />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-surface-200 dark:border-surface-700 flex gap-3">
                <button onClick={() => setShowDrawer(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <Button className="flex-1 justify-center" onClick={handleAddQuestion} loading={createQuestion.isPending}>Add Question</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <ConfirmModal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete" description="Are you sure you want to delete this? This action cannot be undone."
        onConfirm={() => { if (deleteConfirm?.type === 'module') deleteModule.mutate(deleteConfirm.id); setDeleteConfirm(null) }} />
    </div>
  )
}