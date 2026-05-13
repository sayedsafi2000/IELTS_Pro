import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Pagination } from '../components/SharedComponents'

export default function AdminStudents() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data } = useQuery({ queryKey: ['admin-students', page, search], queryFn: () => api.get(`/users?page=${page}&limit=20&search=${search}`).then(r => r.data) })

  const toggleStatus = useMutation({ mutationFn: ({ id, isActive }) => api.patch(`/users/${id}/status`, { isActive }), onSuccess: () => queryClient.invalidateQueries(['admin-students']) })
  const deleteUser = useMutation({ mutationFn: id => api.delete(`/users/${id}`), onSuccess: () => queryClient.invalidateQueries(['admin-students']) })

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Students</h1>
      <div className="mb-4">
        <input type="search" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="px-4 py-2 border rounded-lg w-80" />
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Name</th><th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Email</th><th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Phone</th><th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Tests</th><th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Status</th><th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Actions</th></tr></thead>
          <tbody className="divide-y">
            {data?.users?.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{s.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{s.email}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{s.phone || '—'}</td>
                <td className="px-6 py-4 text-sm">{s._count?.sessions || 0}</td>
                <td className="px-6 py-4">
                  <button onClick={() => toggleStatus.mutate({ id: s.id, isActive: !s.isActive })} className={`text-xs px-3 py-1 rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.isActive ? 'Active' : 'Inactive'}</button>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => { if (confirm('Delete this student?')) deleteUser.mutate(s.id) }} className="text-red-600 hover:underline text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && data.totalPages > 1 && <div className="mt-4"><Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} /></div>}
    </div>
  )
}