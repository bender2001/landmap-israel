import { keyframes, css } from 'styled-components'

/* ── Core keyframes ─────────────────────────────────────────── */

export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`

export const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`

export const fadeInDown = keyframes`
  from { opacity: 0; transform: translateY(-16px); }
  to   { opacity: 1; transform: translateY(0); }
`

export const slideUp = keyframes`
  from { opacity: 0; transform: translateY(100%); }
  to   { opacity: 1; transform: translateY(0); }
`

export const slideInRight = keyframes`
  from { opacity: 0; transform: translateX(24px); }
  to   { opacity: 1; transform: translateX(0); }
`

export const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.9); }
  to   { opacity: 1; transform: scale(1); }
`

export const bounceIn = keyframes`
  0%   { opacity: 0; transform: scale(0.3); }
  50%  { transform: scale(1.05); }
  70%  { transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
`

export const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.6; }
`

export const pulseGold = keyframes`
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(200,148,42,0.4); }
  50%      { opacity: 0.8; box-shadow: 0 0 8px 4px rgba(200,148,42,0); }
`

export const spin = keyframes`
  to { transform: rotate(360deg); }
`

export const shimmer = keyframes`
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

export const typingDot = keyframes`
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
`

export const drawCheck = keyframes`
  to { stroke-dashoffset: 0; }
`

export const bellRing = keyframes`
  0%, 100% { transform: rotate(0deg); }
  10%, 30% { transform: rotate(14deg); }
  20%, 40% { transform: rotate(-14deg); }
  50% { transform: rotate(0deg); }
`

export const tickerIn = keyframes`
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
`

export const dropIn = keyframes`
  from { opacity: 0; transform: translateY(-12px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`

/* ── Stagger helper ─────────────────────────────────────────── */

export const staggerFadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`

/** Use on children: animation: ${staggerChild(index)} */
export const staggerChild = (index: number, base = 0.06) => css`
  animation: ${staggerFadeIn} 0.4s ease both;
  animation-delay: ${index * base}s;
`

/* ── Transition presets (as css) ────────────────────────────── */

export const transition = {
  fast: css`transition: all 0.15s ease;`,
  normal: css`transition: all 0.2s ease;`,
  smooth: css`transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);`,
  spring: css`transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);`,
} as const

/* ── Card lift hover effect ─────────────────────────────────── */

export const cardLift = css`
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }
`

/* ── Shimmer loading effect (mixin) ─────────────────────────── */

export const shimmerBg = css`
  background: linear-gradient(90deg,
    rgba(255,255,255,0.03) 25%,
    rgba(255,255,255,0.06) 50%,
    rgba(255,255,255,0.03) 75%
  );
  background-size: 400% 100%;
  animation: ${shimmer} 1.5s ease infinite;
`
