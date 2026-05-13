import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function AdminEnroll() {
  const queryClient = useQueryClient()
  const [testIds, setTestIds] = useState([])
  const [userIds, setUserIds] = useState([])

  const { data: tests } = useQuery({ queryKey: ['admin-tests'], queryFn: () => api.get('/tests').then(r => r.data) })
  const { data: students } = useQuery({ queryKey: ['admin-students-search'], queryFn: () => api.get('/users?limit=100').then(r => r.data) })

  const enrollMutation = useMutation({
    mutationFn: data => api.post('/enrollments', data),
    onSuccess: (res) => { toast.success(`Enrolled ${res.data.count} students`); queryClient.invalidateQueries(['enrollments']); setTestIds([]); setUserIds([]) }
  })

  const handleEnroll = () => {
    if (testIds.length === 0 || userIds.length === 0) { toast.error('Select at least one test and one student'); return }
    enrollMutation.mutate({ testIds, userIds })
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Assign Tests to Students</h1>
      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-bold mb-4">Select Tests</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {tests?.map(t => (
              <label key={t.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={testIds.includes(t.id)} onChange={e => setTestIds(prev => e.target.checked ? [...prev, t.id] : prev.filter(id => id !== t.id))} />
                <span className="font-medium">{t.title}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-bold mb-4">Select Students</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {students?.users?.filter(u => u.role === 'STUDENT').map(s => (
              <label key={s.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={userIds.includes(s.id)} onChange={e => setUserIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))} />
                <div><span className="font-medium">{s.name}</span><p className="text-xs text-gray-500">{s.email}</p></div>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6">
        <button onClick={handleEnroll} disabled={enrollMutation.isPending} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {enrollMutation.isPending ? 'Enrolling...' : `Enroll ${userIds.length} students in ${testIds.length} tests`}
        </button>
      </div>
    </div>
  )
}