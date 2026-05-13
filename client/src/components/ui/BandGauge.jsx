export default function BandGauge({ score, size = 160 }) {
  const pct   = (score || 0) / 9;
  const r     = 54;
  const circ  = 2 * Math.PI * r;
  const dash  = circ * pct;
  const color = score >= 7 ? '#22c55e' : score >= 5.5 ? '#f59e0b' : '#ef4444';
  const label = score >= 7 ? 'Good' : score >= 5.5 ? 'Competent' : 'Developing';
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-100 dark:text-surface-700" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dasharray 1s ease' }} />
        <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="700" fill={color}>{score?.toFixed(1) || '–'}</text>
        <text x="60" y="72" textAnchor="middle" fontSize="9" fill="#94a3b8">BAND SCORE</text>
      </svg>
      <span className="text-sm font-medium mt-1" style={{ color }}>{score ? label : 'Pending'}</span>
    </div>
  );
}