import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../services/api'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import BandGauge from '../components/ui/BandGauge'
import EmptyState from '../components/ui/EmptyState'
import { BarChart2 } from 'lucide-react'
import { clsx } from 'clsx'

const moduleConfig = {
  listening: { label: 'Listening', color: '#22c55e' },
  reading: { label: 'Reading', color: '#f97316' },
  writing: { label: 'Writing', color: '#a855f7' },
  speaking: { label: 'Speaking', color: '#ec4899' },
}

function ResultCard({ result }) {
  const bands = [
    { key: 'listeningBand', ...moduleConfig.listening },
    { key: 'readingBand', ...moduleConfig.reading },
    { key: 'writingBand', ...moduleConfig.writing },
    { key: 'speakingBand', ...moduleConfig.speaking },
  ]
  const overall = result.overallBand

  return (
    <Link to={`/results/${result.sessionId}`} className="block card p-6 hover:shadow-card transition-all duration-200">
      <div className="flex items-center gap-6">
        {/* Band Gauge */}
        <div className="shrink-0">
          <BandGauge score={overall} size={100} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-surface-900 dark:text-white truncate">{result.session?.test?.title || 'Test Result'}</h3>
            <Badge variant={result.isReleased ? 'success' : 'warning'} dot={false}>
              {result.isReleased ? 'Released' : 'Pending'}
            </Badge>
          </div>
          <p className="text-xs text-surface-400 mb-3">{new Date(result.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          {/* Module Scores */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {bands.map(b => {
              const score = result[b.key]
              const pct = score ? (score / 9) * 100 : 0
              return (
                <div key={b.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-surface-500">{b.label}</span>
                    <span className="text-sm font-semibold" style={{ color: b.color }}>{score || '—'}</span>
                  </div>
                  <div className="h-1.5 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: b.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Overall */}
        <div className="hidden sm:block text-right shrink-0">
          <p className="text-xs text-surface-400 mb-1">Overall</p>
          <p className="text-3xl font-bold" style={{ color: overall >= 7 ? '#22c55e' : overall >= 5.5 ? '#f59e0b' : '#ef4444' }}>
            {overall || '—'}
          </p>
        </div>
      </div>
    </Link>
  )
}

export default function Results() {
  const { data: results, isLoading } = useQuery({ queryKey: ['my-results'], queryFn: () => api.get('/results/student/my').then(r => r.data) })

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-1">My Results</h1>
        <p className="text-sm text-surface-500">View your test performance and detailed feedback</p>
      </div>

      {results?.length > 0 ? (
        <div className="space-y-4">
          {results.map(result => <ResultCard key={result.id} result={result} />)}
        </div>
      ) : (
        <Card className="p-0">
          <EmptyState icon={BarChart2} title="No results yet" description="Complete a test to see your scores and detailed feedback." />
        </Card>
      )}
    </div>
  )
}