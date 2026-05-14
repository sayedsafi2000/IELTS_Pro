import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import BandGauge from '../components/ui/BandGauge'
import Spinner from '../components/ui/Spinner'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'
import * as Tabs from '@radix-ui/react-tabs'
import { CheckCircle, XCircle, Lock } from 'lucide-react'

export default function ResultDetail() {
  const { sessionId } = useParams()
  const { user } = useAuth()
  const location = useLocation()
  const isAdminView = user?.role === 'ADMIN' && location.pathname.startsWith('/admin/sessions')
  const { data: result, isLoading } = useQuery({ queryKey: ['result', sessionId], queryFn: () => api.get(`/results/session/${sessionId}`).then(r => r.data) })
  const { data: session } = useQuery({ queryKey: ['session', sessionId], queryFn: () => api.get(`/sessions/${sessionId}`).then(r => r.data) })

  if (isLoading) return <div className="min-h-[50vh] flex items-center justify-center"><Spinner size="lg" className="text-brand-500" /></div>
  if (!result) return <div className="text-center py-20"><p className="text-surface-400">Result not found or not released yet.</p></div>

  const showFullBreakdown = result.isReleased || isAdminView

  const modules = session?.modulesSessions || []
  const getModule = (type) => session?.test?.modules?.find(m => m.type === type)

  const radarData = [
    { module: 'Listening', score: result.listeningBand || 0 },
    { module: 'Reading', score: result.readingBand || 0 },
    { module: 'Writing', score: result.writingBand || 0 },
    { module: 'Speaking', score: result.speakingBand || 0 },
  ]

  const strengths = radarData.filter(r => r.score >= 7).map(r => r.module)
  const improve = radarData.filter(r => r.score < 6).map(r => r.module)

  const bands = [
    { key: 'listeningBand', label: 'Listening', color: '#22c55e' },
    { key: 'readingBand', label: 'Reading', color: '#f97316' },
    { key: 'writingBand', label: 'Writing', color: '#a855f7' },
    { key: 'speakingBand', label: 'Speaking', color: '#ec4899' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {isAdminView && (
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/admin/sessions" className="text-sm font-medium text-brand-500 hover:text-brand-600">
            ← All sessions
          </Link>
          <span className="text-surface-300 dark:text-surface-600">|</span>
          <Link to="/admin/evaluate" className="text-sm font-medium text-surface-500 hover:text-brand-500">
            Evaluate writing & speaking
          </Link>
        </div>
      )}
      {/* Hero */}
      <Card className="p-8" elevated>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <BandGauge score={result.overallBand} size={180} />
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-1">{session?.test?.title || 'Test Result'}</h1>
            {isAdminView && session?.user && (
              <p className="text-sm text-surface-500 dark:text-surface-400 mb-2">
                Student: <span className="font-medium text-surface-700 dark:text-surface-300">{session.user.name}</span>
                {session.user.email ? ` · ${session.user.email}` : ''}
              </p>
            )}
            <p className="text-sm text-surface-400 mb-4">Completed on {new Date(session?.submittedAt || session?.startedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <Badge variant={result.isReleased ? 'success' : 'warning'}>
              {result.isReleased ? 'Released' : isAdminView ? 'Not released to student' : 'Pending Evaluation'}
            </Badge>
          </div>
        </div>
      </Card>

      {!showFullBreakdown ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-2">Results Not Yet Released</h2>
          <p className="text-sm text-surface-500 max-w-sm mx-auto">Your results are being evaluated by our examiners. Please check back soon.</p>
        </Card>
      ) : (
        <>
          {/* Module Score Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {bands.map(b => {
              const score = result[b.key]
              const pct = score ? (score / 9) * 100 : 0
              return (
                <Card key={b.key} className="p-5" elevated>
                  <p className="section-label mb-2">{b.label}</p>
                  <p className="text-3xl font-bold mb-3" style={{ color: b.color }}>{score || '—'}</p>
                  <div className="h-1.5 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: b.color }} />
                  </div>
                  <p className="text-xs text-surface-400 mt-2">
                    {score >= 7 ? 'Good' : score >= 5.5 ? 'Competent' : score >= 4.5 ? 'Modest' : 'Developing'}
                  </p>
                </Card>
              )
            })}
          </div>

          {/* Tabs */}
          <Tabs.Root defaultValue="overview">
            <Tabs.List className="flex gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-2xl w-fit mb-6">
              {['overview', 'listening', 'reading', 'writing', 'speaking'].map(tab => (
                <Tabs.Trigger key={tab} value={tab}
                  className={clsx('px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition-all',
                    'data-[state=active]:bg-white dark:data-[state=active]:bg-surface-700 data-[state=active]:shadow-soft data-[state=active]:text-surface-900 dark:data-[state=active]:text-white',
                    'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                  )}>
                  {tab}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <Tabs.Content value="overview">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="p-6" elevated>
                  <h3 className="font-semibold text-surface-900 dark:text-white mb-4">Performance Radar</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="module" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </Card>
                <Card className="p-6" elevated>
                  <h3 className="font-semibold text-surface-900 dark:text-white mb-4">Analysis</h3>
                  <div className="space-y-4">
                    {strengths.length > 0 && (
                      <div>
                        <p className="section-label mb-2">Strengths</p>
                        <div className="flex flex-wrap gap-2">
                          {strengths.map(s => <span key={s} className="badge-success">{s}</span>)}
                        </div>
                      </div>
                    )}
                    {improve.length > 0 && (
                      <div>
                        <p className="section-label mb-2">Needs Improvement</p>
                        <div className="flex flex-wrap gap-2">
                          {improve.map(s => <span key={s} className="badge-warning">{s}</span>)}
                        </div>
                      </div>
                    )}
                    {strengths.length === 0 && improve.length === 0 && (
                      <p className="text-sm text-surface-400">Complete all modules to see analysis.</p>
                    )}
                  </div>
                </Card>
              </div>
            </Tabs.Content>

            {['listening', 'reading'].map(modType => (
              <Tabs.Content key={modType} value={modType}>
                {modules.map(ms => {
                  const mod = getModule(modType.toUpperCase())
                  if (mod?.type !== modType.toUpperCase()) return null
                  return (
                    <Card key={ms.id} className="p-6" elevated>
                      <h3 className="font-semibold text-surface-900 dark:text-white mb-4">{mod?.title}</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-surface-100 dark:border-surface-700">
                              <th className="text-left section-label pb-3 pr-4">#</th>
                              <th className="text-left section-label pb-3 pr-4">Question</th>
                              <th className="text-left section-label pb-3 pr-4">{isAdminView ? 'Student answer' : 'Your Answer'}</th>
                              <th className="text-left section-label pb-3 pr-4">Correct</th>
                              <th className="text-left section-label pb-3">Result</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ms.answers?.map((a, i) => {
                              const q = mod.questions?.find(q => q.id === a.questionId)
                              return (
                                <tr key={a.id} className={clsx('border-b border-surface-50 dark:border-surface-800 last:border-0', a.isCorrect === false && 'bg-red-50/50 dark:bg-red-900/5')}>
                                  <td className="py-3 pr-4 text-surface-400">{i + 1}</td>
                                  <td className="py-3 pr-4 text-surface-600 dark:text-surface-400 max-w-xs truncate">{q?.questionText}</td>
                                  <td className="py-3 pr-4 text-surface-700 dark:text-surface-300">{a.studentAnswer || '—'}</td>
                                  <td className="py-3 pr-4 text-surface-500">{q?.correctAnswer || '—'}</td>
                                  <td className="py-3">
                                    {a.isCorrect ? (
                                      <span className="flex items-center gap-1 text-green-500"><CheckCircle className="w-4 h-4" /> Correct</span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-red-500"><XCircle className="w-4 h-4" /> Wrong</span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )
                })}
              </Tabs.Content>
            ))}

            <Tabs.Content value="writing">
              {modules.map(ms => {
                const mod = getModule('WRITING')
                if (mod?.type !== 'WRITING') return null
                return (
                  <div key={ms.id} className="space-y-4">
                    {ms.writingSubmissions?.map(sub => (
                      <Card key={sub.id} className="p-6" elevated>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-surface-900 dark:text-white">Task {sub.taskNumber}</h3>
                          {sub.bandScore !== null ? (
                            <span className="text-2xl font-bold text-brand-500">{sub.bandScore}</span>
                          ) : <span className="badge-warning">Pending evaluation</span>}
                        </div>
                        {sub.bandScore !== null && (
                          <div className="space-y-3 mb-4">
                            {[
                              { key: 'taskAchievement', label: 'Task Achievement' },
                              { key: 'coherenceCohesion', label: 'Coherence & Cohesion' },
                              { key: 'lexicalResource', label: 'Lexical Resource' },
                              { key: 'grammaticalRange', label: 'Grammatical Range' },
                            ].map(c => (
                              <div key={c.key} className="flex items-center gap-3">
                                <span className="text-xs text-surface-500 w-44 text-right">{c.label}</span>
                                <div className="flex-1 h-1.5 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(sub[c.key] / 9) * 100}%` }} />
                                </div>
                                <span className="text-xs font-semibold text-surface-700 dark:text-surface-300 w-8">{sub[c.key]}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="p-4 bg-surface-50 dark:bg-surface-900 rounded-xl font-serif leading-relaxed max-h-64 overflow-y-auto text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap mb-4">
                          {sub.content.replace(/<[^>]*>/g, '')}
                        </div>
                        {sub.feedback && (
                          <div className="border-l-4 border-brand-400 bg-brand-50 dark:bg-brand-900/10 p-4 rounded-r-xl">
                            <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mb-1">Feedback</p>
                            <p className="text-sm text-surface-700 dark:text-surface-300">{sub.feedback}</p>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )
              })}
            </Tabs.Content>

            <Tabs.Content value="speaking">
              {modules.map(ms => {
                const mod = getModule('SPEAKING')
                if (mod?.type !== 'SPEAKING') return null
                const sp = ms.speakingSubmission
                const live = ms.liveSpeakingSession
                const isLive = mod.speakingMode === 'LIVE'
                if (!sp && !live) return null
                return (
                  <Card key={ms.id} className="p-6" elevated>
                    <h3 className="font-semibold text-surface-900 dark:text-white mb-4">
                      {mod?.title}
                      <span className="ml-2 text-xs font-normal text-surface-400">({mod.speakingMode || 'RECORDED'})</span>
                    </h3>

                    {isLive && live && (
                      <div className="mb-6 p-4 bg-surface-50 dark:bg-surface-900 rounded-xl text-sm space-y-1">
                        <p><span className="text-surface-400">Scheduled:</span> {new Date(live.scheduledAt).toLocaleString()}</p>
                        {live.examiner && <p><span className="text-surface-400">Examiner:</span> {live.examiner.name}</p>}
                        <p><span className="text-surface-400">Platform:</span> {live.meetingProvider?.replace('_', ' ')}</p>
                        <p><span className="text-surface-400">Status:</span> {live.status}</p>
                        {live.recordingUrl && (
                          <audio src={live.recordingUrl} controls className="w-full mt-2" />
                        )}
                      </div>
                    )}

                    {!isLive && sp?.responses?.length > 0 && (
                      <div className="space-y-3 mb-6">
                        {sp.responses.map(r => (
                          <div key={r.id} className="p-3 bg-surface-50 dark:bg-surface-900 rounded-xl">
                            <p className="text-xs section-label mb-1">{r.question?.type?.replace(/_/g, ' ')}</p>
                            <p className="text-sm text-surface-700 dark:text-surface-300 mb-2">{r.question?.questionText}</p>
                            <audio src={r.audioUrl} controls className="w-full" />
                          </div>
                        ))}
                      </div>
                    )}

                    {!isLive && !sp?.responses?.length && sp?.audioUrl && (
                      <audio src={sp.audioUrl} controls className="w-full mb-6" />
                    )}

                    {sp?.bandScore != null ? (
                      <>
                        <div className="text-center mb-6">
                          <p className="section-label mb-1">Overall Band</p>
                          <p className="text-4xl font-bold text-brand-500">{sp.bandScore}</p>
                        </div>
                        <div className="space-y-3 mb-4">
                          {[
                            { key: 'fluencyCoherence', label: 'Fluency & Coherence' },
                            { key: 'lexicalResource', label: 'Lexical Resource' },
                            { key: 'grammaticalRange', label: 'Grammatical Range' },
                            { key: 'pronunciation', label: 'Pronunciation' },
                          ].map(c => (
                            <div key={c.key} className="flex items-center gap-3">
                              <span className="text-xs text-surface-500 w-44 text-right">{c.label}</span>
                              <div className="flex-1 h-1.5 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-500 rounded-full" style={{ width: `${((sp[c.key] || 0) / 9) * 100}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-surface-700 dark:text-surface-300 w-8">{sp[c.key]}</span>
                            </div>
                          ))}
                        </div>
                        {sp.feedback && (
                          <div className="border-l-4 border-brand-400 bg-brand-50 dark:bg-brand-900/10 p-4 rounded-r-xl">
                            <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mb-1">Feedback</p>
                            <p className="text-sm text-surface-700 dark:text-surface-300">{sp.feedback}</p>
                          </div>
                        )}
                      </>
                    ) : <p className="text-surface-400 text-sm">Pending evaluation</p>}
                  </Card>
                )
              })}
            </Tabs.Content>
          </Tabs.Root>
        </>
      )}
    </div>
  )
}