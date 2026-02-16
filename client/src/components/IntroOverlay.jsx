import { useState, useEffect } from 'react'

export default function IntroOverlay({ onComplete }) {
  const [phase, setPhase] = useState(0) // 0=grid, 1=brand, 2=subtitle, 3=exit

  const skip = () => { setPhase(3); setTimeout(onComplete, 400) }

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400)
    const t2 = setTimeout(() => setPhase(2), 1200)
    const t3 = setTimeout(() => setPhase(3), 2800)
    const t4 = setTimeout(() => onComplete(), 3600)
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip() }
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); window.removeEventListener('keydown', onKey) }
  }, [onComplete])

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-700 ${
        phase >= 3 ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ background: '#050D1A' }}
    >
      {/* Animated perspective grid */}
      <div className="intro-grid-container">
        <div className={`intro-grid ${phase >= 1 ? 'intro-grid-zoomed' : ''}`} />
      </div>

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(200,148,42,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Scan line */}
      <div className={`intro-scanline ${phase >= 1 ? 'intro-scanline-active' : ''}`} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-8">
        {/* Orbital ring */}
        <div className={`intro-ring ${phase >= 1 ? 'intro-ring-active' : ''}`}>
          <div className="intro-ring-dot" />
        </div>

        {/* Brand */}
        <h1
          className={`font-heebo font-black text-6xl md:text-7xl tracking-tight transition-all duration-1000 ease-out ${
            phase >= 1
              ? 'opacity-100 translate-y-0 blur-0'
              : 'opacity-0 translate-y-8 blur-sm'
          }`}
          style={{
            background: 'linear-gradient(135deg, #C8942A 0%, #E5B94E 30%, #F0D078 50%, #E5B94E 70%, #C8942A 100%)',
            backgroundSize: '200% 200%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: phase >= 1 ? 'shimmer-text 3s ease-in-out infinite' : 'none',
          }}
        >
          LandMap Israel
        </h1>

        {/* Subtitle */}
        <p
          className={`mt-4 font-heebo text-lg md:text-xl text-slate-400 tracking-widest uppercase transition-all duration-700 delay-200 ${
            phase >= 2
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
          style={{ letterSpacing: '0.35em' }}
        >
          מפת קרקעות להשקעה
        </p>

        {/* Coordinate readout */}
        <div
          className={`mt-8 flex items-center gap-6 transition-all duration-500 delay-500 ${
            phase >= 2 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span className="intro-coord">32.4500°N</span>
          <span className="w-1 h-1 rounded-full bg-gold/60" />
          <span className="intro-coord">34.8700°E</span>
          <span className="w-1 h-1 rounded-full bg-gold/60" />
          <span className="intro-coord">ALT 12,000m</span>
        </div>

        {/* Descending indicator */}
        <div
          className={`mt-10 flex flex-col items-center gap-2 transition-all duration-500 delay-700 ${
            phase >= 2 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="intro-descent-bar" />
          <span className="text-[10px] text-gold/50 font-mono tracking-[0.3em] uppercase">
            descending
          </span>
        </div>
      </div>

      {/* Corner markers */}
      <div className="intro-corner intro-corner-tl" />
      <div className="intro-corner intro-corner-tr" />
      <div className="intro-corner intro-corner-bl" />
      <div className="intro-corner intro-corner-br" />

      {/* Skip button */}
      {phase < 3 && (
        <button
          onClick={skip}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 text-xs text-slate-500 hover:text-gold/70 transition-colors tracking-widest uppercase font-mono cursor-pointer"
          style={{ letterSpacing: '0.2em' }}
        >
          דלג ›
        </button>
      )}

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 40%, #050D1A 100%)',
        }}
      />
    </div>
  )
}
