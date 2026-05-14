import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import toast from 'react-hot-toast'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { formatLocal, fromNow, toInputValue } from '../../utils/datetime'
import { Calendar, Video, ExternalLink, Clock } from 'lucide-react'

const STATUS_VARIANT = {
  REQUESTED: 'warning',
  SCHEDULED: 'success',
  RESCHEDULED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  NO_SHOW: 'danger',
}

export default function LiveSpeakingPanel({ moduleSession }) {
  const queryClient = useQueryClient()
  const [preferredAt, setPreferredAt] = useState('')
  const [notes, setNotes] = useState('')

  const live = moduleSession?.liveSpeakingSession

  const request = useMutation({
    mutationFn: (payload) => api.post('/live-speaking/request', payload),
    onSuccess: () => {
      toast.success('Request sent. An admin will confirm shortly.')
      queryClient.invalidateQueries({ queryKey: ['session'] })
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Request failed')
  })

  if (!live || ['CANCELLED', 'NO_SHOW'].includes(live.status)) {
    return (
      <Card className="p-8" elevated>
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-3">
            <Video className="w-6 h-6 text-emerald-500" />
          </div>
          <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-1">Request your live speaking slot</h2>
          <p className="text-sm text-surface-500">An examiner will join you on Google Meet or Zoom at the scheduled time.</p>
        </div>
        <div className="max-w-md mx-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Preferred date and time</label>
            <input type="datetime-local" className="input" value={preferredAt} onChange={e => setPreferredAt(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Notes (optional)</label>
            <textarea className="input" rows="3" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything the examiner should know…" />
          </div>
          <Button
            className="w-full justify-center"
            loading={request.isPending}
            onClick={() => {
              if (!preferredAt) { toast.error('Pick a preferred time'); return }
              request.mutate({
                moduleSessionId: moduleSession.id,
                preferredAt: new Date(preferredAt).toISOString(),
                notes: notes || undefined,
              })
            }}
          >
            Request slot
          </Button>
        </div>
      </Card>
    )
  }

  if (live.status === 'REQUESTED') {
    return (
      <Card className="p-8 text-center" elevated>
        <Badge variant="warning" className="mb-3">Awaiting confirmation</Badge>
        <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-2">We have your request</h2>
        <p className="text-sm text-surface-500 mb-2">Preferred: {formatLocal(live.studentPreferredAt || live.scheduledAt)}</p>
        <p className="text-xs text-surface-400">An admin will confirm your examiner + meeting link. You'll see an updated card here once scheduled.</p>
      </Card>
    )
  }

  // SCHEDULED / RESCHEDULED
  return (
    <Card className="p-8" elevated>
      <div className="flex items-center gap-3 mb-4">
        <Badge variant={STATUS_VARIANT[live.status] || 'success'}>{live.status}</Badge>
        <span className="text-xs text-surface-400">{fromNow(live.scheduledAt)}</span>
      </div>
      <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-3">Your speaking interview is scheduled</h2>
      <div className="space-y-2 text-sm text-surface-600 dark:text-surface-300 mb-6">
        <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-surface-400" /> {formatLocal(live.scheduledAt)}</div>
        <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-surface-400" /> {live.durationMins} minutes</div>
        {live.examiner && <div>Examiner: <strong>{live.examiner.name}</strong></div>}
        <div>Platform: {live.meetingProvider?.replace('_', ' ')}</div>
      </div>
      {live.meetingUrl ? (
        <a href={live.meetingUrl} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center gap-2">
          <Video className="w-4 h-4" /> Join meeting <ExternalLink className="w-3.5 h-3.5" />
        </a>
      ) : (
        <p className="text-sm text-surface-400">Meeting link will appear here once generated.</p>
      )}
      {live.notes && (
        <div className="mt-4 p-3 bg-surface-50 dark:bg-surface-900 rounded-lg text-xs text-surface-500">{live.notes}</div>
      )}
    </Card>
  )
}
