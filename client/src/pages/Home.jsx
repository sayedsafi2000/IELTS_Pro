import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Headphones, BookOpen, PenLine, Mic, CheckCircle, Users, Target, Award, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const stats = [
  { value: '2,400+', label: 'Students', icon: Users },
  { value: '50+', label: 'Tests', icon: BookOpen },
  { value: '6.8', label: 'Avg Band', icon: Target },
  { value: '94%', label: 'Success', icon: TrendingUp },
]

const modules = [
  { type: 'LISTENING', name: 'Listening', duration: '30 min • 40 questions', desc: '4 sections of increasing difficulty. Audio plays once under exam conditions.', icon: Headphones, color: 'from-blue-500 to-cyan-500' },
  { type: 'READING', name: 'Reading', duration: '60 min • 40 questions', desc: '3 passages with True/False, MCQ, matching and gap fill questions.', icon: BookOpen, color: 'from-purple-500 to-pink-500' },
  { type: 'WRITING', name: 'Writing', duration: '60 min • 2 tasks', desc: 'Task 1 (charts/graphs) + Task 2 (essay). Expert examiner feedback.', icon: PenLine, color: 'from-amber-500 to-orange-500' },
  { type: 'SPEAKING', name: 'Speaking', duration: '15 min • 3 parts', desc: 'Recorded audio submission. Examiner scores all 4 criteria.', icon: Mic, color: 'from-green-500 to-emerald-500' },
]

const testimonials = [
  { name: 'Priya Sharma', location: 'Dhaka', band: '7.5', quote: 'The platform helped me identify my weak areas. The detailed feedback on writing was invaluable for my preparation.' },
  { name: 'Ahmed Hassan', location: 'Chittagong', band: '8.0', quote: 'Excellent simulation of the actual test. The speaking module recordings felt very authentic and realistic.' },
  { name: 'Lisa Chen', location: 'Sylhet', band: '6.5', quote: 'Great practice platform. The band score tracking helped me monitor my progress over time consistently.' },
]

const steps = [
  { n: 1, title: 'Register', desc: 'Create your free account in 60 seconds' },
  { n: 2, title: 'Enroll', desc: 'Admin assigns you a mock test' },
  { n: 3, title: 'Sit the Test', desc: 'Real CBT conditions with timer' },
  { n: 4, title: 'Get Results', desc: 'Instant auto-score + expert feedback' },
]

function StatCard({ value, label, icon: Icon }) {
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-white mb-2">{value}</div>
      <div className="text-sm text-surface-400">{label}</div>
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()
  return (
    <div>
      {/* Hero */}
      <section className="min-h-[85vh] flex items-center bg-gradient-to-br from-brand-600 via-brand-700 to-purple-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm font-medium mb-6">
              <Award className="w-4 h-4 text-amber-400" /> Trusted by 2,400+ students
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
              Achieve Your Target<br />
              <span className="bg-gradient-to-r from-amber-300 to-yellow-300 bg-clip-text text-transparent">Band Score</span>
            </h1>
            <p className="text-lg text-brand-100 mb-8 max-w-lg">
              Bangladesh's most advanced computer-based IELTS mock test platform. Real exam conditions, instant results, expert feedback.
            </p>
            <div className="flex flex-wrap gap-3">
              {user ? (
                <Link to="/dashboard" className="btn-primary bg-white text-brand-600 hover:bg-brand-50 text-base px-6 py-3">
                  Go to Dashboard <span aria-hidden="true">→</span>
                </Link>
              ) : (
                <Link to="/register" className="btn-primary bg-white text-brand-600 hover:bg-brand-50 text-base px-6 py-3">
                  Start Free Practice <span aria-hidden="true">→</span>
                </Link>
              )}
              <Link to="/tests" className="btn-ghost bg-white/10 border border-white/20 text-white hover:bg-white/20 text-base px-6 py-3">
                {user ? 'My Tests' : 'Browse Tests'}
              </Link>
            </div>
            <div className="flex items-center gap-3 mt-8">
              <div className="flex -space-x-2">
                {['P', 'A', 'L'].map((l, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-xs font-semibold border-2 border-white">{l}</div>
                ))}
              </div>
              <p className="text-sm text-brand-100">Join 2,400+ students improving their band score</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="hidden md:block">
            <div className="bg-white rounded-3xl shadow-modal p-8 animate-float">
              <div className="flex items-center gap-2 mb-6">
                <Target className="w-5 h-5 text-brand-500" />
                <span className="font-semibold text-surface-700">Your Mock Test Result</span>
              </div>
              <div className="text-center mb-6">
                <div className="text-sm text-surface-400 mb-1">Overall Band Score</div>
                <div className="text-5xl font-bold bg-gradient-to-r from-brand-600 to-purple-600 bg-clip-text text-transparent">7.5</div>
              </div>
              {[
                { label: 'Listening', score: 8.0 },
                { label: 'Reading', score: 7.5 },
                { label: 'Writing', score: 7.0 },
                { label: 'Speaking', score: 7.5 },
              ].map(mod => (
                <div key={mod.label} className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-surface-600 w-20">{mod.label}</span>
                  <span className="text-sm font-semibold text-surface-700 w-10">{mod.score}</span>
                  <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(mod.score / 9) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-surface-900 py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-surface-900 dark:text-white mb-4">How It Works</h2>
          <p className="text-center text-surface-500 mb-16 max-w-md mx-auto">Simple four-step process to start your IELTS preparation journey</p>
          <div className="grid md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-px border-t-2 border-dashed border-surface-200 dark:border-surface-700" />
            {steps.map(step => (
              <div key={step.n} className="text-center relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg mx-auto mb-4 relative z-10 shadow-lg">
                  {step.n}
                </div>
                <h3 className="font-semibold text-surface-900 dark:text-white mb-1">{step.title}</h3>
                <p className="text-sm text-surface-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="py-24 px-6 bg-surface-50 dark:bg-surface-800/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-surface-900 dark:text-white mb-4">All 4 IELTS Modules</h2>
          <p className="text-center text-surface-500 mb-12 max-w-md mx-auto">Comprehensive coverage of all test components</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map(mod => (
              <motion.div key={mod.type} whileHover={{ y: -4 }} className="card p-6 group cursor-pointer">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mod.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <mod.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-semibold text-lg text-surface-900 dark:text-white mb-1">{mod.name}</h3>
                <p className="text-xs text-surface-400 mb-3">{mod.duration}</p>
                <p className="text-sm text-surface-500 leading-relaxed">{mod.desc}</p>
                <p className="text-xs font-medium text-brand-500 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">Included in mock test →</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-surface-900 dark:text-white mb-4">Student Results</h2>
          <p className="text-center text-surface-500 mb-12">Real results from real students</p>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="card p-6 border-l-4 border-l-brand-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">{t.name[0]}</div>
                  <div>
                    <p className="font-medium text-surface-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-surface-400">{t.location}</p>
                  </div>
                  <span className="ml-auto badge-success">Band {t.band}</span>
                </div>
                <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">"{t.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-brand-600 to-purple-700 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to find your IELTS band?</h2>
          <p className="text-brand-100 mb-8">Start your preparation journey today. Free to register, no credit card required.</p>
          <Link to={user ? "/enroll" : "/register"} className="inline-flex items-center gap-2 bg-white text-brand-600 font-semibold text-base px-8 py-3.5 rounded-xl hover:bg-brand-50 transition-colors shadow-lg">
            {user ? 'Browse Available Tests' : 'Create Free Account'} <span>→</span>
          </Link>
        </div>
      </section>
    </div>
  )
}