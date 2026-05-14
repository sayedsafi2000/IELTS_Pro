import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import { formatLocal, fromNow } from '../utils/datetime'
import { Video, Calendar, Clock, ExternalLink } from 'lucide-react'

const STATUS_VARIANT = {
  REQUESTED: 'warning',
  SCHEDULED: 'success',
  RESCHEDULED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  NO_SHOW: 'danger',
}

export default function MyLiveSpeaking() {
  const { data, isLoading } = useQuery({
    queryKey: ['live-speaking-mine'],
    queryFn: () => api.get('/live-speaking/mine').then(r => r.data)
  })

  if (isLoading) return <div className="flex items-center justify-center min-h-[40vh]"><Spinner size="lg" className="text-brand-500" /></div>

  const upcoming = (data || []).filter(s => ['REQUESTED', 'SCHEDULED', 'RESCHEDULED'].includes(s.status))
  const past = (data || []).filter(s => ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(s.status))

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-1">My Speaking Sessions</h1>
        <p className="text-sm text-surface-500">Live speaking interview schedule</p>
      </div>

      <section>
        <h2 className="section-label mb-3">Upcoming</h2>
        {upcoming.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-surface-400">No upcoming sessions. Start a test with a live speaking module to request a slot.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map(s => (
              <Card key={s.id} className="p-5" elevated>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-surface-900 dark:text-white">{s.moduleSession?.session?.test?.title}</h3>
                      <Badge variant={STATUS_VARIANT[s.status] || 'neutral'}>{s.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-surface-500">
                      <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {formatLocal(s.scheduledAt)}</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {fromNow(s.scheduledAt)} ({s.durationMins} min)</span>
                      {s.examiner && <span>Examiner: {s.examiner.name}</span>}
                      {s.meetingProvider && <span>Platform: {s.meetingProvider.replace('_', ' ')}</span>}
                    </div>
                  </div>
                  {s.meetingUrl && ['SCHEDULED', 'RESCHEDULED'].includes(s.status) && (
                    <a href={s.meetingUrl} target="_blank" rel="noreferrer"
                      className="btn-primary text-sm shrink-0">
                      <Video className="w-4 h-4" /> Join
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                {s.notes && (
                  <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-700 text-xs text-surface-500">
                    {s.notes}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="section-label mb-3">Past</h2>
          <div className="space-y-3">
            {past.map(s => (
              <Card key={s.id} className="p-5 opacity-80">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-surface-700 dark:text-surface-300">{s.moduleSession?.session?.test?.title}</h3>
                    <p className="text-xs text-surface-400 mt-1">{formatLocal(s.scheduledAt)} · {s.examiner?.name || 'No examiner'}</p>
                  </div>
                  <Badge variant={STATUS_VARIANT[s.status] || 'neutral'}>{s.status}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
