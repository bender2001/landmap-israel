export default function Spinner({ className = 'w-8 h-8' }) {
  return (
    <div className="flex items-center justify-center">
      <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-gold" />
      </svg>
    </div>
  )
}
