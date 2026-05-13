import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

export default function Notifications() {
  const queryClient = useQueryClient()
  const { data: notifications } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/notifications').then(r => r.data) })

  const markRead = useMutation({ mutationFn: id => api.patch(`/notifications/${id}/read`), onSuccess: () => queryClient.invalidateQueries(['notifications']) })
  const markAllRead = useMutation({ mutationFn: () => api.patch('/notifications/read-all'), onSuccess: () => queryClient.invalidateQueries(['notifications']) })

  return (
    <div className="max-w-3xl">
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold">Notifications</h1>
        {notifications?.some(n => !n.isRead) && <button onClick={() => markAllRead.mutate()} className="text-sm text-blue-600 hover:underline">Mark all read</button>}
      </div>
      <div className="space-y-3">
        {notifications?.map(n => (
          <div key={n.id} className={`bg-white rounded-xl p-4 shadow-sm ${!n.isRead ? 'border-l-4 border-blue-500' : ''}`}>
            <div className="flex justify-between"><h3 className="font-medium">{n.title}</h3><button onClick={() => !n.isRead && markRead.mutate(n.id)} className="text-xs text-gray-400">{n.isRead ? '' : 'Mark read'}</button></div>
            <p className="text-gray-600 text-sm mt-1">{n.message}</p>
            <p className="text-xs text-gray-400 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
      {(!notifications || notifications.length === 0) && <div className="text-center py-12 text-gray-400">No notifications</div>}
    </div>
  )
}