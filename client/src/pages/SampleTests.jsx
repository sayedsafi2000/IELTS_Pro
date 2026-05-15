import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { FileText, Clock, BookOpen, ArrowRight, Sparkles } from 'lucide-react'

export default function SampleTests() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: tests, isLoading } = useQuery({
    queryKey: ['public-tests'],
    queryFn: () => api.get('/tests/public').then(r => r.data)
  })

  const handleEnroll = (test) => {
    if (!user) {
      // Persist intent so post-login we land on the test detail page
      sessionStorage.setItem('postLoginRedirect', `/tests/${test.id}`)
      navigate('/login')
      return
    }
    navigate(`/tests/${test.id}`)
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          Available Mock Tests
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-surface-900 dark:text-white mb-3">
          Practice with real IELTS mock tests
        </h1>
        <p className="text-surface-500 dark:text-surface-400">
          Browse the tests our admins have published. Enroll, sit the test, and get instant feedback.
        </p>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-64 rounded-2xl" />)}
        </div>
      ) : tests && tests.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map(test => {
            const isPaid = test.price > 0
            return (
              <Card key={test.id} className="p-6 flex flex-col" elevated>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  {isPaid ? (
                    <Badge variant="warning">৳{test.price}</Badge>
                  ) : (
                    <Badge variant="success">Free</Badge>
                  )}
                </div>

                <h3 className="font-semibold text-lg text-surface-900 dark:text-white mb-1.5 line-clamp-2">
                  {test.title}
                </h3>
                <p className="text-sm text-surface-500 mb-4 line-clamp-2 flex-1">
                  {test.description || 'A complete IELTS mock test under exam conditions.'}
                </p>

                <div className="flex items-center gap-3 text-xs text-surface-400 mb-5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {test.duration} min
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {test.modulesCount || test.modules?.length || 0} modules
                  </span>
                </div>

                <Button
                  onClick={() => handleEnroll(test)}
                  className="btn-primary w-full justify-center"
                >
                  {isPaid ? `Enroll for ৳${test.price}` : 'Enroll Free'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="p-0">
          <EmptyState
            icon={FileText}
            title="No tests available yet"
            description="The admins haven't published any tests. Please check back soon."
            action={
              <Link to="/" className="btn-secondary">Back to home</Link>
            }
          />
        </Card>
      )}

      {!user && tests && tests.length > 0 && (
        <p className="text-center text-sm text-surface-400 mt-10">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-600 hover:underline font-medium">
            Register here
          </Link>{' '}
          to enroll in tests.
        </p>
      )}
    </div>
  )
}
