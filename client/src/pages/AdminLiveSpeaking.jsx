import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import * as Tabs from '@radix-ui/react-tabs'
import { clsx } from 'clsx'
import { formatLocal, toInputValue } from '../utils/datetime'
import { Calendar, Video, Trash2, ExternalLink, CheckCircle, X } from 'lucide-react'

const STATUS_VARIANT = {
  REQUESTED: 'warning',
  SCHEDULED: 'success',
  RESCHEDULED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  NO_SHOW: 'danger',
}

export default function AdminLiveSpeaking() {
  const queryClient = useQueryClient()
  const [confirmRow, setConfirmRow] = useState(null)
  const [confirmForm, setConfirmForm] = useState({ examinerId: '', scheduledAt: '', durationMins: 15, meetingProvider: 'GOOGLE_MEET', notes: '' })

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['live-speaking-all'],
    queryFn: () => api.get('/live-speaking').then(r => r.data)
  })
  const { data: examiners } = useQuery({
    queryKey: ['examiners'],
    queryFn: () => api.get('/users/examiners').then(r => r.data)
  })

  const confirmMut = useMutation({
    mutationFn: (payload) => api.post('/live-speaking', payload),
    onSuccess: () => {
      toast.success('Session scheduled')
      queryClient.invalidateQueries({ queryKey: ['live-speaking-all'] })
      setConfirmRow(null)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to schedule')
  })

  const cancelMut = useMutation({
    mutationFn: (id) => api.delete(`/live-speaking/${id}`),
    onSuccess: () => {
      toast.success('Session cancelled')
      queryClient.invalidateQueries({ queryKey: ['live-speaking-all'] })
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to cancel')
  })

  if (isLoading) return <div className="flex items-center justify-center min-h-[40vh]"><Spinner size="lg" /></div>

  const requested = (sessions || []).filter(s => s.status === 'REQUESTED')
  const scheduled = (sessions || []).filter(s => ['SCHEDULED', 'RESCHEDULED'].includes(s.status))
  const past = (sessions || []).filter(s => ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(s.status))

  const openConfirm = (row) => {
    setConfirmForm({
      examinerId: '',
      scheduledAt: toInputValue(row.studentPreferredAt || row.scheduledAt),
      durationMins: row.durationMins || 15,
      meetingProvider: 'GOOGLE_MEET',
      notes: row.notes || ''
    })
    setConfirmRow(row)
  }

  const submitConfirm = () => {
    if (!confirmForm.examinerId || !confirmForm.scheduledAt) {
      toast.error('Examiner and time required')
      return
    }
    confirmMut.mutate({
      moduleSessionId: confirmRow.moduleSessionId,
      examinerId: confirmForm.examinerId,
      scheduledAt: new Date(confirmForm.scheduledAt).toISOString(),
      durationMins: parseInt(confirmForm.durationMins, 10),
      meetingProvider: confirmForm.meetingProvider,
      notes: confirmForm.notes || undefined,
    })
  }

  const availableExaminers = (examiners || []).filter(e =>
    confirmForm.meetingProvider === 'OTHER' ||
    (e.integrations || []).some(i => i.provider === confirmForm.meetingProvider)
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs.Root defaultValue="requested">
        <Tabs.List className="flex gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-2xl w-fit mb-6">
          {[
            { val: 'requested', label: `Requests (${requested.length})` },
            { val: 'scheduled', label: `Scheduled (${scheduled.length})` },
            { val: 'past', label: `Past (${past.length})` },
          ].map(t => (
            <Tabs.Trigger key={t.val} value={t.val}
              className={clsx('px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                'data-[state=active]:bg-white dark:data-[state=active]:bg-surface-700 data-[state=active]:shadow-soft',
                'text-surface-500 hover:text-surface-700'
              )}>
              {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="requested">
          <SessionsList rows={requested} examiners={examiners || []} actions={(row) => (
            <Button onClick={() => openConfirm(row)} className="text-sm">
              <CheckCircle className="w-4 h-4" /> Confirm
            </Button>
          )} />
        </Tabs.Content>
        <Tabs.Content value="scheduled">
          <SessionsList rows={scheduled} examiners={examiners || []} actions={(row) => (
            <div className="flex items-center gap-2">
              {row.meetingUrl && (
                <a href={row.meetingUrl} target="_blank" rel="noreferrer" className="btn-secondary text-sm">
                  <Video className="w-4 h-4" /> <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button onClick={() => cancelMut.mutate(row.id)} className="btn-danger text-sm">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )} />
        </Tabs.Content>
        <Tabs.Content value="past">
          <SessionsList rows={past} examiners={examiners || []} />
        </Tabs.Content>
      </Tabs.Root>

      {confirmRow && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6" elevated>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white">Confirm session</h3>
              <button onClick={() => setConfirmRow(null)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700">
                <X className="w-4 h-4 text-surface-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Meeting Provider</label>
                <select className="input" value={confirmForm.meetingProvider}
                  onChange={e => setConfirmForm(f => ({ ...f, meetingProvider: e.target.value, examinerId: '' }))}>
                  <option value="GOOGLE_MEET">Google Meet</option>
                  <option value="ZOOM">Zoom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  Examiner <span className="text-surface-400 font-normal">({availableExaminers.length} connected to {confirmForm.meetingProvider})</span>
                </label>
                <select className="input" value={confirmForm.examinerId}
                  onChange={e => setConfirmForm(f => ({ ...f, examinerId: e.target.value }))}>
                  <option value="">Select examiner…</option>
                  {availableExaminers.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.email})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Scheduled at</label>
                  <input type="datetime-local" className="input" value={confirmForm.scheduledAt}
                    onChange={e => setConfirmForm(f => ({ ...f, scheduledAt: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Duration (min)</label>
                  <input type="number" min="5" className="input" value={confirmForm.durationMins}
                    onChange={e => setConfirmForm(f => ({ ...f, durationMins: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Notes (optional)</label>
                <textarea className="input" rows="2" value={confirmForm.notes}
                  onChange={e => setConfirmForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setConfirmRow(null)} className="btn-secondary">Cancel</button>
              <Button onClick={submitConfirm} loading={confirmMut.isPending}>Create meeting</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function SessionsList({ rows, actions }) {
  if (!rows.length) return <Card className="p-8 text-center"><p className="text-sm text-surface-400">No sessions in this tab.</p></Card>
  return (
    <div className="space-y-3">
      {rows.map(s => (
        <Card key={s.id} className="p-5" elevated>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-surface-900 dark:text-white">{s.moduleSession?.session?.user?.name}</h3>
                <Badge variant={STATUS_VARIANT[s.status] || 'neutral'}>{s.status}</Badge>
              </div>
              <div className="text-sm text-surface-500 space-y-1">
                <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {formatLocal(s.scheduledAt)} ({s.durationMins} min)</div>
                <div>Test: {s.moduleSession?.session?.test?.title}</div>
                {s.examiner && <div>Examiner: {s.examiner.name}</div>}
                {s.meetingProvider && <div>Platform: {s.meetingProvider.replace('_', ' ')}</div>}
              </div>
            </div>
            {actions && actions(s)}
          </div>
        </Card>
      ))}
    </div>
  )
}
