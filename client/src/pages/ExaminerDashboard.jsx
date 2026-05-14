import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { formatLocal, fromNow } from '../utils/datetime'
import { Calendar, Video, ExternalLink, Upload, CheckCircle } from 'lucide-react'

const STATUS_VARIANT = {
  REQUESTED: 'warning',
  SCHEDULED: 'success',
  RESCHEDULED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  NO_SHOW: 'danger',
}

export default function ExaminerDashboard() {
  const queryClient = useQueryClient()
  const [recordingFor, setRecordingFor] = useState(null)
  const [statusFor, setStatusFor] = useState(null)
  const [pickedStatus, setPickedStatus] = useState('COMPLETED')

  const { data, isLoading } = useQuery({
    queryKey: ['examiner-sessions'],
    queryFn: () => api.get('/live-speaking/examiner').then(r => r.data)
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/live-speaking/${id}`, { status }),
    onSuccess: () => {
      toast.success('Updated')
      queryClient.invalidateQueries({ queryKey: ['examiner-sessions'] })
      setStatusFor(null)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  const uploadRec = useMutation({
    mutationFn: ({ id, file }) => {
      const fd = new FormData()
      fd.append('recording', file)
      return api.post(`/live-speaking/${id}/recording`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => {
      toast.success('Recording uploaded')
      queryClient.invalidateQueries({ queryKey: ['examiner-sessions'] })
      setRecordingFor(null)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Upload failed')
  })

  if (isLoading) return <div className="flex items-center justify-center min-h-[40vh]"><Spinner size="lg" /></div>

  const upcoming = (data || []).filter(s => ['SCHEDULED', 'RESCHEDULED'].includes(s.status))
  const completed = (data || []).filter(s => s.status === 'COMPLETED')
  const other = (data || []).filter(s => !['SCHEDULED', 'RESCHEDULED', 'COMPLETED'].includes(s.status))

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-1">My Speaking Sessions</h1>
        <p className="text-sm text-surface-500">Conduct and grade your assigned live speaking interviews</p>
      </div>

      <Section title="Upcoming" rows={upcoming}>
        {(s) => (
          <div className="flex items-center gap-2">
            {s.meetingUrl && (
              <a href={s.meetingUrl} target="_blank" rel="noreferrer" className="btn-primary text-sm">
                <Video className="w-4 h-4" /> Join <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button onClick={() => { setStatusFor(s); setPickedStatus('COMPLETED') }} className="btn-secondary text-sm">
              <CheckCircle className="w-4 h-4" /> Mark
            </button>
          </div>
        )}
      </Section>

      <Section title="Completed (pending evaluation)" rows={completed}>
        {(s) => (
          <div className="flex items-center gap-2">
            <button onClick={() => setRecordingFor(s)} className="btn-secondary text-sm">
              <Upload className="w-4 h-4" /> {s.recordingUrl ? 'Replace recording' : 'Upload recording'}
            </button>
            <a href="/examiner/evaluate" className="btn-primary text-sm">Evaluate</a>
          </div>
        )}
      </Section>

      {other.length > 0 && <Section title="Other" rows={other} />}

      {statusFor && (
        <Modal title="Mark session" onClose={() => setStatusFor(null)}>
          <p className="text-sm text-surface-500 mb-4">Set the outcome for {statusFor.moduleSession?.session?.user?.name}.</p>
          <select className="input mb-4" value={pickedStatus} onChange={e => setPickedStatus(e.target.value)}>
            <option value="COMPLETED">Completed</option>
            <option value="NO_SHOW">No-show</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <div className="flex justify-end gap-3">
            <button onClick={() => setStatusFor(null)} className="btn-secondary">Cancel</button>
            <Button onClick={() => statusMut.mutate({ id: statusFor.id, status: pickedStatus })} loading={statusMut.isPending}>Save</Button>
          </div>
        </Modal>
      )}

      {recordingFor && (
        <Modal title="Upload recording" onClose={() => setRecordingFor(null)}>
          <input type="file" accept="audio/*,video/webm" className="block w-full text-sm mb-4"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) uploadRec.mutate({ id: recordingFor.id, file })
            }} />
          <p className="text-xs text-surface-400">Audio formats: mp3, wav, webm, ogg, m4a</p>
        </Modal>
      )}
    </div>
  )
}

function Section({ title, rows, children }) {
  return (
    <section>
      <h2 className="section-label mb-3">{title}</h2>
      {rows.length === 0 ? (
        <Card className="p-6 text-center"><p className="text-sm text-surface-400">No sessions in this list.</p></Card>
      ) : (
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
                    <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {formatLocal(s.scheduledAt)} · {fromNow(s.scheduledAt)}</div>
                    <div>Test: {s.moduleSession?.session?.test?.title}</div>
                    <div>{s.meetingProvider?.replace('_', ' ')} · {s.durationMins} min</div>
                  </div>
                </div>
                {children && children(s)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6" elevated>
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">{title}</h3>
        {children}
      </Card>
    </div>
  )
}
