/**
 * SubscriptionBanner.jsx — Shows current tier and CTA to upgrade
 *
 * Displays the user's subscription status with a call-to-action
 * for upgrading to access more features.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Crown, Zap, X, ChevronLeft } from 'lucide-react'

const TIER_CONFIG = {
  free: {
    label: 'חינם',
    icon: '🆓',
    color: '#64748B',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    message: 'שדרגו לגישה מלאה — עסקאות, תכנון, התראות',
    cta: 'שדרג עכשיו',
    ctaLink: '/pricing',
  },
  basic: {
    label: 'בסיסי',
    icon: '⭐',
    color: '#C8942A',
    bg: 'bg-gold/10',
    border: 'border-gold/20',
    message: 'גישה מלאה לעסקאות ונתוני שוק',
    cta: 'שדרג למקצועי',
    ctaLink: '/pricing',
  },
  pro: {
    label: 'מקצועי',
    icon: '👑',
    color: '#A855F7',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    message: 'גישה מלאה + API + ניתוח מתקדם',
    cta: null,
    ctaLink: null,
  },
  enterprise: {
    label: 'ארגוני',
    icon: '🏢',
    color: '#3B82F6',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    message: 'חבילה ארגונית מותאמת אישית',
    cta: null,
    ctaLink: null,
  },
}

export default function SubscriptionBanner({
  tier = 'free',
  variant = 'banner', // 'banner' | 'badge' | 'card'
  className = '',
  onDismiss,
}) {
  const [dismissed, setDismissed] = useState(false)
  const config = TIER_CONFIG[tier] || TIER_CONFIG.free

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  // Compact badge variant
  if (variant === 'badge') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bg} ${config.border} border ${className}`}
        style={{ color: config.color }}
      >
        <span>{config.icon}</span>
        {config.label}
      </span>
    )
  }

  // Card variant (for pricing page)
  if (variant === 'card') {
    return (
      <div className={`${config.bg} ${config.border} border rounded-2xl p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: `${config.color}15` }}
          >
            {config.icon}
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-slate-200">תוכנית {config.label}</div>
            <div className="text-[11px] text-slate-400">{config.message}</div>
          </div>
          {config.cta && (
            <Link
              to={config.ctaLink}
              className="px-4 py-2 bg-gradient-to-r from-gold to-gold-bright rounded-xl text-navy text-xs font-bold hover:shadow-lg hover:shadow-gold/20 transition-all"
            >
              {config.cta}
            </Link>
          )}
        </div>
      </div>
    )
  }

  // Banner variant (default) — only show CTA for upgradable tiers
  if (!config.cta) return null

  return (
    <div className={`relative overflow-hidden ${config.bg} ${config.border} border rounded-xl ${className}`}>
      {/* Shimmer effect */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `linear-gradient(120deg, transparent 30%, ${config.color}22 50%, transparent 70%)`,
          animation: 'shimmer 3s infinite linear',
        }}
      />

      <div className="relative flex items-center gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Zap className="w-4 h-4 flex-shrink-0" style={{ color: config.color }} />
          <span className="text-[11px] text-slate-300 truncate">{config.message}</span>
        </div>

        <Link
          to={config.ctaLink}
          className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-gold to-gold-bright rounded-lg text-navy text-[10px] font-bold hover:shadow-md hover:shadow-gold/20 transition-all flex-shrink-0"
        >
          <Crown className="w-3 h-3" />
          {config.cta}
          <ChevronLeft className="w-3 h-3" />
        </Link>

        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <X className="w-3 h-3 text-slate-400" />
          </button>
        )}
      </div>
    </div>
  )
}
