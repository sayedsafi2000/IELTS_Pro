export function PageLoader() {
  return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
}

export function LoadingSpinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'
  return <div className={`${s} border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin`}></div>
}

export function EmptyState({ icon = '📭', title = 'Nothing here', message = '' }) {
  return <div className="text-center py-12"><div className="text-5xl mb-4">{icon}</div><h3 className="text-xl font-semibold text-gray-700">{title}</h3>{message && <p className="text-gray-500 mt-2">{message}</p>}</div>
}

export function BandGauge({ score }) {
  const pct = ((score || 0) / 9) * 100
  const color = score >= 7 ? 'text-green-500' : score >= 5.5 ? 'text-yellow-500' : 'text-red-500'
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={score >= 7 ? '#22c55e' : score >= 5.5 ? '#eab308' : '#ef4444'} strokeWidth="8" strokeDasharray={`${pct * 2.51} 251`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-3xl font-bold ${color}`}>{score || '—'}</span>
        </div>
      </div>
      <span className="text-sm text-gray-500 mt-2">Band Score</span>
    </div>
  )
}

export function Timer({ seconds, onExpire }) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const isLow = seconds < 300
  return (
    <div className={`px-4 py-2 rounded-lg font-mono text-lg ${isLow ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-800'}`}>
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </div>
  )
}

export function ConfirmModal({ isOpen, onConfirm, onCancel, title = 'Confirm', message = 'Are you sure?' }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-bold mb-2">{title}</h3><p className="text-gray-600 mb-4">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Confirm</button>
        </div>
      </div>
    </div>
  )
}

export function Pagination({ page, totalPages, onPageChange }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50">Prev</button>
      <span className="px-3 py-1">{page} / {totalPages}</span>
      <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50">Next</button>
    </div>
  )
}