import { useState, useRef, useEffect } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { Mic, Square, Upload, Play, Trash2 } from 'lucide-react'

function pad(n) { return String(n).padStart(2, '0') }
function fmtSec(s) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}` }

function SingleQuestion({ question, existing, moduleSessionId, readOnly, onUploaded }) {
  const [recording, setRecording] = useState(false)
  const [blob, setBlob] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [uploading, setUploading] = useState(false)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: 'audio/webm' })
        setBlob(b)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      mediaRef.current = mr
      setRecording(true)
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } catch (err) {
      toast.error('Microphone access denied')
    }
  }

  const stop = () => {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop()
    if (timerRef.current) clearInterval(timerRef.current)
    setRecording(false)
  }

  const upload = async () => {
    if (!blob) return
    setUploading(true)
    const fd = new FormData()
    fd.append('audio', blob, `q-${question.id}.webm`)
    fd.append('moduleSessionId', moduleSessionId)
    fd.append('questionId', question.id)
    fd.append('duration', String(elapsed))
    try {
      await api.post('/speaking/response', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Recording saved')
      setBlob(null)
      onUploaded?.()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const discard = () => { setBlob(null); setElapsed(0) }

  return (
    <Card className="p-5">
      <div className="mb-3">
        <p className="text-xs section-label mb-1">{question.type.replace(/_/g, ' ')}</p>
        <p className="text-sm text-surface-700 dark:text-surface-300">{question.questionText}</p>
        {question.instructions && <p className="text-xs text-surface-400 mt-1">{question.instructions}</p>}
      </div>

      {existing?.audioUrl ? (
        <div className="space-y-2">
          <audio src={existing.audioUrl} controls className="w-full" />
          {!readOnly && (
            <p className="text-xs text-surface-400">Recorded {existing.duration ? `(${fmtSec(existing.duration)})` : ''}. Record again to replace.</p>
          )}
        </div>
      ) : null}

      {!readOnly && (
        <div className="mt-3 flex items-center gap-2">
          {!recording && !blob && (
            <Button onClick={start} className="text-sm">
              <Mic className="w-4 h-4" /> {existing ? 'Re-record' : 'Record'}
            </Button>
          )}
          {recording && (
            <button onClick={stop} className="btn-danger text-sm">
              <Square className="w-4 h-4" /> Stop ({fmtSec(elapsed)})
            </button>
          )}
          {blob && (
            <>
              <audio src={URL.createObjectURL(blob)} controls className="flex-1" />
              <Button onClick={upload} loading={uploading} className="text-sm">
                <Upload className="w-4 h-4" /> Save
              </Button>
              <button onClick={discard} className="btn-ghost text-sm">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}
    </Card>
  )
}

export default function SpeakingRecorderPerQuestion({ moduleSession, module, onChange, readOnly }) {
  const questions = (module.questions || []).filter(q => ['SPEAKING_PART1', 'SPEAKING_PART2', 'SPEAKING_PART3'].includes(q.type))
  const responsesByQ = ((moduleSession.speakingSubmission?.responses) || []).reduce((m, r) => { m[r.questionId] = r; return m }, {})

  return (
    <div className="space-y-3">
      {questions.map(q => (
        <SingleQuestion
          key={q.id}
          question={q}
          existing={responsesByQ[q.id]}
          moduleSessionId={moduleSession.id}
          readOnly={readOnly}
          onUploaded={onChange}
        />
      ))}
    </div>
  )
}
