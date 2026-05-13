import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'

const moduleIcons = { LISTENING: '🎧', READING: '📖', WRITING: '✍️', SPEAKING: '🎤' }

export default function TestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [mode, setMode] = useState('EXAM')

  const { data: test, isLoading } = useQuery({ queryKey: ['test', id], queryFn: () => api.get(`/tests/${id}`).then(r => r.data) })
  const { data: sessions } = useQuery({ queryKey: ['my-sessions'], queryFn: () => api.get('/sessions/my').then(r => r.data) })

  const existingSession = sessions?.find(s => s.testId === id && s.status === 'IN_PROGRESS')

  const startTest = async () => {
    try {
      const res = await api.post('/sessions/start', { testId: id, mode })
      navigate(`/test/${res.data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start test')
    }
  }

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">{test?.title}</h1>
      <p className="text-gray-500 mb-6">{test?.description}</p>

      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <h2 className="font-bold mb-4">Test Modules</h2>
        <div className="space-y-3">
          {test?.modules?.map((mod, i) => (
            <div key={mod.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <span className="text-2xl">{moduleIcons[mod.type]}</span>
              <div className="flex-1">
                <p className="font-medium">Module {i + 1}: {mod.title}</p>
                <p className="text-sm text-gray-500">{mod.durationMins} min • {mod.questions?.length || 0} questions</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
        <h3 className="font-bold text-yellow-800 mb-3">⚠️ Important Rules</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• The listening audio can only be played once during the test</li>
          <li>• Each module has a separate timer — it will auto-submit when time expires</li>
          <li>• You cannot return to a previous module after submission</li>
          <li>• Tab switching is monitored — excessive switching will auto-submit your test</li>
          <li>• Ensure you have a stable internet connection</li>
        </ul>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Test Mode</label>
        <div className="flex gap-4">
          <label className={`flex-1 p-4 border rounded-lg cursor-pointer ${mode === 'EXAM' ? 'border-blue-500 bg-blue-50' : ''}`}>
            <input type="radio" name="mode" value="EXAM" checked={mode === 'EXAM'} onChange={e => setMode(e.target.value)} className="mr-2" />
            <span className="font-medium">Exam Mode</span>
            <p className="text-xs text-gray-500 mt-1">Timed, monitored, official results</p>
          </label>
          <label className={`flex-1 p-4 border rounded-lg cursor-pointer ${mode === 'PRACTICE' ? 'border-blue-500 bg-blue-50' : ''}`}>
            <input type="radio" name="mode" value="PRACTICE" checked={mode === 'PRACTICE'} onChange={e => setMode(e.target.value)} className="mr-2" />
            <span className="font-medium">Practice Mode</span>
            <p className="text-xs text-gray-500 mt-1">No timer, instant answers, immediate results</p>
          </label>
        </div>
      </div>

      <button onClick={startTest} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 text-lg">
        {existingSession ? 'Resume Test' : 'Start Test'}
      </button>
    </div>
  )
}