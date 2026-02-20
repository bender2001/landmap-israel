import { createGlobalStyle, keyframes } from 'styled-components'

// ── Design Tokens ──
export const t = {
  bg: '#0B1120', surface: '#111827', surfaceLight: '#1E293B', hover: '#1a2437',
  gold: '#D4A84B', goldBright: '#F0C75E', goldDim: 'rgba(212,168,75,0.12)', goldBorder: 'rgba(212,168,75,0.2)',
  text: '#F1F5F9', textSec: '#94A3B8', textDim: '#64748B',
  border: 'rgba(255,255,255,0.08)', glass: 'rgba(11,17,32,0.85)', glassBorder: 'rgba(255,255,255,0.06)',
  ok: '#10B981', warn: '#F59E0B', err: '#EF4444', info: '#3B82F6',
  white: '#FFFFFF', black: '#0F172A',
  // Light mode for public pages
  lBg: '#FAFBFC', lSurface: '#FFFFFF', lText: '#0F172A', lTextSec: '#475569', lBorder: '#E2E8F0',
  font: "'Heebo', sans-serif",
  r: { sm: '8px', md: '12px', lg: '16px', xl: '24px', full: '9999px' },
  sh: { sm: '0 1px 3px rgba(0,0,0,0.08)', md: '0 4px 12px rgba(0,0,0,0.12)', lg: '0 8px 32px rgba(0,0,0,0.18)', xl: '0 20px 60px rgba(0,0,0,0.25)', glow: '0 0 24px rgba(212,168,75,0.2)' },
  z: { map: 1, controls: 1000, filter: 30, sidebar: 50, modal: 70, toast: 80, nav: 90 },
  tr: '0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  status: { AVAILABLE: '#10B981', SOLD: '#EF4444', RESERVED: '#F59E0B', IN_PLANNING: '#8B5CF6' } as Record<string, string>,
} as const

export type Theme = typeof t
export const sm = '@media (min-width: 640px)'
export const md = '@media (min-width: 768px)'
export const lg = '@media (min-width: 1024px)'
export const mobile = '@media (max-width: 639px)'

// ── Keyframe Animations ──
export const fadeIn = keyframes`from{opacity:0}to{opacity:1}`
export const fadeInUp = keyframes`from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}`
export const fadeInScale = keyframes`from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}`
export const slideUp = keyframes`from{transform:translateY(100%)}to{transform:translateY(0)}`
export const slideRight = keyframes`from{transform:translateX(-100%)}to{transform:translateX(0)}`
export const popIn = keyframes`from{opacity:0;transform:scale(0.8)}50%{transform:scale(1.05)}to{opacity:1;transform:scale(1)}`
export const shimmer = keyframes`0%{background-position:-200% 0}100%{background-position:200% 0}`
export const pulse = keyframes`0%,100%{opacity:1}50%{opacity:0.6}`
export const breathe = keyframes`0%,100%{filter:drop-shadow(0 0 6px currentColor)}50%{filter:drop-shadow(0 0 14px currentColor)}`
export const float = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}`
export const countUp = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}`
export const gradientShift = keyframes`0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}`

// ── Global Styles ──
export const GlobalStyles = createGlobalStyle`
  :root{--vh:100vh}
  @supports(height:100dvh){:root{--vh:100dvh}}
  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
  html,body,#root{height:100%;width:100%;overflow:auto}
  body{font-family:${t.font};background:${t.lBg};color:${t.lText};-webkit-font-smoothing:antialiased;line-height:1.6}
  ::selection{background:rgba(212,168,75,0.25);color:${t.black}}
  a{color:${t.gold};text-decoration:none}&:hover{text-decoration:underline}
  ::-webkit-scrollbar{width:5px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px}
  :focus-visible{outline:2px solid ${t.gold};outline-offset:2px}
  :focus:not(:focus-visible){outline:none}
  @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;transition-duration:0.01ms!important}}

  /* Dark mode scope */
  .dark{background:${t.bg};color:${t.text}}
  .dark ::-webkit-scrollbar-thumb{background:${t.surfaceLight}}

  /* Leaflet */
  .leaflet-container{background:#E8E8E8!important;font-family:${t.font}!important}
  .dark .leaflet-container{background:#050D1A!important}
  .leaflet-popup-content-wrapper{background:rgba(255,255,255,0.97)!important;backdrop-filter:blur(16px)!important;border:1px solid ${t.lBorder}!important;border-radius:${t.r.lg}!important;box-shadow:${t.sh.xl}!important;color:${t.lText}!important;padding:0!important;overflow:hidden!important}
  .dark .leaflet-popup-content-wrapper{background:rgba(11,17,32,0.95)!important;border-color:${t.goldBorder}!important;color:${t.text}!important}
  .leaflet-popup-content{margin:0!important;font-family:${t.font}!important;direction:rtl!important;min-width:220px!important}
  .leaflet-popup-tip{background:rgba(255,255,255,0.97)!important;border:1px solid ${t.lBorder}!important}
  .dark .leaflet-popup-tip{background:rgba(11,17,32,0.95)!important;border-color:${t.goldBorder}!important}
  .leaflet-popup-close-button{color:${t.textDim}!important;font-size:20px!important;padding:8px!important}
  .leaflet-popup-close-button:hover{color:${t.gold}!important}
  .leaflet-control-zoom{border:1px solid ${t.lBorder}!important;border-radius:${t.r.md}!important;overflow:hidden!important;box-shadow:${t.sh.md}!important}
  .dark .leaflet-control-zoom{border-color:${t.goldBorder}!important}
  .leaflet-control-zoom a{background:#fff!important;color:#333!important;border-color:${t.lBorder}!important;width:36px!important;height:36px!important;line-height:36px!important;font-size:16px!important;transition:all ${t.tr}!important}
  .dark .leaflet-control-zoom a{background:rgba(11,17,32,0.9)!important;color:${t.gold}!important;border-color:${t.border}!important}
  .leaflet-control-zoom a:hover{background:#f3f4f6!important}
  .dark .leaflet-control-zoom a:hover{background:${t.surfaceLight}!important}
  .leaflet-control-attribution{background:rgba(255,255,255,0.8)!important;color:#999!important;font-size:9px!important}
  .dark .leaflet-control-attribution{background:rgba(11,17,32,0.7)!important;color:${t.textDim}!important}

  /* Polygon effects */
  .leaflet-overlay-pane path{filter:drop-shadow(0 0 4px currentColor);transition:fill-opacity 0.3s,filter 0.3s,stroke-width 0.3s;cursor:pointer!important}
  .leaflet-overlay-pane path:hover{filter:drop-shadow(0 0 12px currentColor) drop-shadow(0 0 24px currentColor);stroke-width:3.5!important}

  .map-vignette{position:absolute;inset:0;pointer-events:none;z-index:10;background:radial-gradient(ellipse 80% 75% at 50% 50%,transparent 60%,rgba(0,0,0,0.15) 100%)}

  /* Price tooltip */
  .leaflet-tooltip.price-tooltip{background:rgba(255,255,255,0.95)!important;border:1px solid ${t.lBorder}!important;border-radius:${t.r.sm}!important;padding:3px 8px!important;font-family:${t.font}!important;font-size:11px!important;font-weight:700!important;color:${t.black}!important;box-shadow:${t.sh.sm}!important;white-space:nowrap!important;pointer-events:none!important;z-index:15!important}
  .dark .leaflet-tooltip.price-tooltip{background:rgba(11,17,32,0.92)!important;border-color:rgba(212,168,75,0.3)!important;color:${t.goldBright}!important}
  .leaflet-tooltip.price-tooltip::before{display:none!important}

  /* Popup inner */
  .plot-popup{padding:16px}
  .plot-popup::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,${t.gold},${t.goldBright},${t.gold},transparent)}
  .plot-popup-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px}
  .plot-popup-title{font-size:14px;font-weight:700}
  .plot-popup-status{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;white-space:nowrap}
  .plot-popup-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:12px;border-bottom:1px solid rgba(0,0,0,0.06)}
  .dark .plot-popup-row{border-color:${t.border}}
  .plot-popup-row:last-child{border-bottom:none}
  .plot-popup-label{color:${t.lTextSec}}
  .dark .plot-popup-label{color:${t.textDim}}
  .plot-popup-value{font-weight:700}
  .plot-popup-value.gold{color:${t.gold}}
  .plot-popup-cta{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:12px;width:100%;padding:8px;background:linear-gradient(135deg,${t.gold},${t.goldBright});border:none;border-radius:${t.r.sm};color:${t.bg};font-weight:700;font-size:12px;cursor:pointer;font-family:${t.font};transition:all ${t.tr}}
  .plot-popup-cta:hover{transform:translateY(-1px);box-shadow:${t.sh.glow}}

  /* POI / Cluster markers */
  .poi-marker,.city-cluster-marker,.user-location-marker{background:none!important;border:none!important}
  .poi-marker-inner{display:flex;flex-direction:column;align-items:center;gap:2px}
  .poi-marker-emoji{font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))}
  .poi-marker-label{font-size:9px;font-weight:700;color:${t.lTextSec};text-shadow:0 1px 3px rgba(255,255,255,0.8);white-space:nowrap}
  .dark .poi-marker-label{color:rgba(212,168,75,0.7);text-shadow:0 1px 4px rgba(0,0,0,0.9)}
  .city-cluster-bubble{display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:50%;background:radial-gradient(circle at 30% 30%,rgba(212,168,75,0.9),rgba(212,168,75,0.7));border:2px solid rgba(240,199,94,0.5);box-shadow:0 4px 16px rgba(212,168,75,0.35);cursor:pointer;transition:transform ${t.tr}}
  .city-cluster-bubble:hover{transform:scale(1.1)}
  .city-cluster-count{font-size:12px;font-weight:800;color:#1a1a2e;line-height:1}
  .city-cluster-city{font-size:8px;font-weight:700;color:rgba(26,26,46,0.8);line-height:1}
  .user-dot-outer{width:22px;height:22px;border-radius:50%;background:rgba(59,130,246,0.2);display:flex;align-items:center;justify-content:center;animation:userPulse 2s ease-in-out infinite}
  .user-dot-inner{width:10px;height:10px;border-radius:50%;background:#3B82F6;border:2px solid #fff;box-shadow:0 0 8px rgba(59,130,246,0.5)}
  @keyframes userPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.3);opacity:0.7}}

  .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

  @media(max-width:639px){
    .leaflet-control-zoom{margin-bottom:100px!important}
    .leaflet-control-zoom a{width:42px!important;height:42px!important;line-height:42px!important;font-size:18px!important}
  }
`
