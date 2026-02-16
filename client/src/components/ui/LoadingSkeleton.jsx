export default function LoadingSkeleton({ className = '', count = 1 }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="h-4 rounded-lg animate-pulse"
          style={{
            background: 'linear-gradient(90deg, rgba(200,148,42,0.05) 25%, rgba(200,148,42,0.12) 50%, rgba(200,148,42,0.05) 75%)',
            backgroundSize: '200% 100%',
            animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
            width: `${60 + Math.random() * 40}%`,
          }}
        />
      ))}
    </div>
  )
}
