import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { formatLocal } from '../utils/datetime'
import { Plug, CheckCircle } from 'lucide-react'

const PROVIDERS = [
  { id: 'GOOGLE_MEET', label: 'Google Meet', authPath: '/integrations/google/authorize-url' },
  { id: 'ZOOM', label: 'Zoom', authPath: '/integrations/zoom/authorize-url' },
]

export default function ExaminerIntegrations() {
  const [params] = useSearchParams()
  const queryClient = useQueryClient()

  useEffect(() => {
    const connected = params.get('connected')
    if (connected) {
      toast.success(`${connected} connected`)
    }
  }, [params])

  const { data } = useQuery({
    queryKey: ['my-integrations'],
    queryFn: () => api.get('/integrations').then(r => r.data)
  })

  const disconnect = useMutation({
    mutationFn: (provider) => api.delete(`/integrations/${provider === 'GOOGLE_MEET' ? 'GOOGLE' : provider}`),
    onSuccess: () => {
      toast.success('Disconnected')
      queryClient.invalidateQueries({ queryKey: ['my-integrations'] })
    }
  })

  const connectedMap = (data || []).reduce((m, r) => { m[r.provider] = r; return m }, {})

  const connect = async (path) => {
    try {
      const { data } = await api.get(path)
      window.location.href = data.url
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start OAuth flow')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-1">Meeting Integrations</h1>
        <p className="text-sm text-surface-500">Connect Google Meet or Zoom so the platform can schedule meetings on your behalf.</p>
      </div>

      <div className="space-y-3">
        {PROVIDERS.map(p => {
          const row = connectedMap[p.id]
          return (
            <Card key={p.id} className="p-5" elevated>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center">
                    <Plug className="w-5 h-5 text-surface-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-surface-900 dark:text-white">{p.label}</h3>
                      {row && <Badge variant="success"><CheckCircle className="w-3 h-3" /> Connected</Badge>}
                    </div>
                    {row ? (
                      <p className="text-xs text-surface-500 mt-0.5">
                        {row.externalAccountEmail} · linked {formatLocal(row.createdAt, 'MMM D, YYYY')}
                      </p>
                    ) : (
                      <p className="text-xs text-surface-400 mt-0.5">Not connected</p>
                    )}
                  </div>
                </div>
                {row ? (
                  <button onClick={() => disconnect.mutate(p.id)} className="btn-danger text-sm">Disconnect</button>
                ) : (
                  <button onClick={() => connect(p.authPath)} className="btn-primary text-sm">Connect</button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="p-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          <strong>Heads up:</strong> these connections use your personal Google / Zoom account.
          Meetings will appear on your calendar and you will host them.
        </p>
      </Card>
    </div>
  )
}
