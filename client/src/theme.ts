import { createGlobalStyle } from 'styled-components'

export const t = {
  colors: {
    bg: '#0B1120',
    surface: '#111827',
    surfaceLight: '#1E293B',
    surfaceHover: '#1a2437',
    gold: '#D4A84B',
    goldBright: '#F0C75E',
    goldDim: 'rgba(212,168,75,0.15)',
    goldBorder: 'rgba(212,168,75,0.2)',
    text: '#F1F5F9',
    textSec: '#94A3B8',
    textDim: '#64748B',
    border: 'rgba(255,255,255,0.08)',
    glass: 'rgba(11,17,32,0.85)',
    glassBorder: 'rgba(255,255,255,0.06)',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
    white: '#FFFFFF',
    status: { AVAILABLE: '#10B981', SOLD: '#EF4444', RESERVED: '#F59E0B', IN_PLANNING: '#8B5CF6' },
  },
  font: "'Heebo', sans-serif",
  radius: { sm: '8px', md: '12px', lg: '16px', xl: '20px', full: '9999px' },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.3)',
    md: '0 4px 12px rgba(0,0,0,0.25)',
    lg: '0 8px 32px rgba(0,0,0,0.35)',
    xl: '0 16px 48px rgba(0,0,0,0.4)',
    glow: '0 0 20px rgba(212,168,75,0.15)',
  },
  z: { map: 1, controls: 1000, filter: 30, sidebar: 50, modal: 70, toast: 80 },
  transition: '0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  breakpoints: { sm: '640px', md: '768px', lg: '1024px' },
} as const

export type Theme = typeof t

export const media = {
  sm: `@media (min-width: ${t.breakpoints.sm})`,
  md: `@media (min-width: ${t.breakpoints.md})`,
  lg: `@media (min-width: ${t.breakpoints.lg})`,
  mobile: `@media (max-width: 639px)`,
}

export const GlobalStyles = createGlobalStyle`
  :root { --vh: 100vh; }
  @supports (height: 100dvh) { :root { --vh: 100dvh; } }

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  html, body, #root { height: 100%; width: 100%; overflow: auto; }

  body {
    font-family: ${t.font};
    background: ${t.colors.bg};
    color: ${t.colors.text};
    -webkit-font-smoothing: antialiased;
    line-height: 1.5;
  }

  ::selection { background: rgba(212,168,75,0.3); color: ${t.colors.text}; }
  a { color: ${t.colors.gold}; text-decoration: none; }
  a:hover { text-decoration: underline; }

  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${t.colors.surfaceLight}; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: ${t.colors.textDim}; }

  :focus-visible { outline: 2px solid ${t.colors.gold}; outline-offset: 2px; }
  :focus:not(:focus-visible) { outline: none; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* ── Leaflet Dark Theme ── */
  .leaflet-container { background: #050D1A !important; font-family: ${t.font} !important; }

  .leaflet-popup-content-wrapper {
    background: rgba(11,17,32,0.95) !important;
    backdrop-filter: blur(20px) !important;
    border: 1px solid ${t.colors.goldBorder} !important;
    border-radius: ${t.radius.lg} !important;
    box-shadow: ${t.shadow.xl} !important;
    color: ${t.colors.text} !important;
    padding: 0 !important;
    overflow: hidden !important;
  }
  .leaflet-popup-content { margin: 0 !important; font-family: ${t.font} !important; direction: rtl !important; min-width: 220px !important; }
  .leaflet-popup-tip { background: rgba(11,17,32,0.95) !important; border: 1px solid ${t.colors.goldBorder} !important; }
  .leaflet-popup-close-button { color: ${t.colors.textDim} !important; font-size: 20px !important; padding: 8px !important; }
  .leaflet-popup-close-button:hover { color: ${t.colors.gold} !important; }

  .leaflet-control-zoom {
    border: 1px solid ${t.colors.goldBorder} !important;
    border-radius: ${t.radius.md} !important;
    overflow: hidden !important;
    box-shadow: ${t.shadow.lg} !important;
  }
  .leaflet-control-zoom a {
    background: rgba(11,17,32,0.9) !important;
    color: ${t.colors.gold} !important;
    border-color: ${t.colors.border} !important;
    width: 36px !important; height: 36px !important; line-height: 36px !important;
    font-size: 16px !important;
    transition: all ${t.transition} !important;
  }
  .leaflet-control-zoom a:hover { background: ${t.colors.surfaceLight} !important; color: ${t.colors.goldBright} !important; }

  .leaflet-control-attribution {
    background: rgba(11,17,32,0.7) !important;
    color: ${t.colors.textDim} !important;
    font-size: 9px !important;
    backdrop-filter: blur(8px) !important;
  }
  .leaflet-control-attribution a { color: ${t.colors.textDim} !important; }

  /* ── Polygon Effects ── */
  .leaflet-overlay-pane path {
    filter: drop-shadow(0 0 6px currentColor);
    transition: fill-opacity 0.3s, filter 0.3s, stroke-width 0.3s;
    cursor: pointer !important;
  }
  .leaflet-overlay-pane path:hover {
    filter: drop-shadow(0 0 14px currentColor) drop-shadow(0 0 28px currentColor);
    stroke-width: 3.5 !important;
  }

  /* ── Map Overlays ── */
  .map-vignette {
    position: absolute; inset: 0; pointer-events: none; z-index: 10;
    background: radial-gradient(ellipse 75% 70% at 50% 50%, transparent 55%, rgba(5,13,26,0.4) 100%);
  }

  /* ── Price Tooltip ── */
  .leaflet-tooltip.price-tooltip {
    background: rgba(11,17,32,0.92) !important;
    border: 1px solid rgba(212,168,75,0.3) !important;
    border-radius: ${t.radius.sm} !important;
    padding: 3px 8px !important;
    font-family: ${t.font} !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    color: ${t.colors.goldBright} !important;
    box-shadow: ${t.shadow.md} !important;
    white-space: nowrap !important;
    pointer-events: none !important;
    z-index: 15 !important;
  }
  .leaflet-tooltip.price-tooltip::before { display: none !important; }

  /* ── Glass Panel ── */
  .glass {
    background: ${t.colors.glass};
    backdrop-filter: blur(24px) saturate(1.3);
    -webkit-backdrop-filter: blur(24px) saturate(1.3);
    border: 1px solid ${t.colors.glassBorder};
    border-radius: ${t.radius.lg};
    box-shadow: ${t.shadow.lg};
  }

  /* ── Popup Inner ── */
  .plot-popup { padding: 16px; }
  .plot-popup::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, ${t.colors.gold}, ${t.colors.goldBright}, ${t.colors.gold}, transparent);
  }
  .plot-popup-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; gap: 8px; }
  .plot-popup-title { font-size: 14px; font-weight: 700; color: ${t.colors.text}; }
  .plot-popup-status { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; white-space: nowrap; }
  .plot-popup-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; font-size: 12px; color: ${t.colors.textSec}; border-bottom: 1px solid ${t.colors.border}; }
  .plot-popup-row:last-child { border-bottom: none; }
  .plot-popup-label { color: ${t.colors.textDim}; }
  .plot-popup-value { font-weight: 700; color: ${t.colors.text}; }
  .plot-popup-value.gold { color: ${t.colors.goldBright}; }
  .plot-popup-cta {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    margin-top: 12px; width: 100%; padding: 8px;
    background: linear-gradient(135deg, ${t.colors.gold}, ${t.colors.goldBright});
    border: none; border-radius: ${t.radius.sm}; color: ${t.colors.bg};
    font-weight: 700; font-size: 12px; cursor: pointer; font-family: ${t.font};
    transition: all ${t.transition};
  }
  .plot-popup-cta:hover { transform: translateY(-1px); box-shadow: ${t.shadow.glow}; }

  /* ── POI Markers ── */
  .poi-marker { background: none !important; border: none !important; }
  .poi-marker-inner { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .poi-marker-emoji { font-size: 22px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6)); }
  .poi-marker-label { font-size: 9px; font-weight: 700; color: rgba(212,168,75,0.7); text-shadow: 0 1px 4px rgba(0,0,0,0.9); white-space: nowrap; }

  /* ── City Clusters ── */
  .city-cluster-marker { background: none !important; border: none !important; }
  .city-cluster-bubble {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, rgba(212,168,75,0.9), rgba(212,168,75,0.7));
    border: 2px solid rgba(240,199,94,0.5);
    box-shadow: 0 4px 16px rgba(212,168,75,0.35);
    cursor: pointer; transition: transform ${t.transition};
  }
  .city-cluster-bubble:hover { transform: scale(1.1); }
  .city-cluster-count { font-size: 12px; font-weight: 800; color: #1a1a2e; line-height: 1; }
  .city-cluster-city { font-size: 8px; font-weight: 700; color: rgba(26,26,46,0.8); line-height: 1; }

  /* ── User Dot ── */
  .user-location-marker { background: none !important; border: none !important; }
  .user-dot-outer {
    width: 22px; height: 22px; border-radius: 50%;
    background: rgba(59,130,246,0.2);
    display: flex; align-items: center; justify-content: center;
    animation: userPulse 2s ease-in-out infinite;
  }
  .user-dot-inner { width: 10px; height: 10px; border-radius: 50%; background: #3B82F6; border: 2px solid #fff; box-shadow: 0 0 8px rgba(59,130,246,0.5); }
  @keyframes userPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.3); opacity: 0.7; } }

  /* ── Utility ── */
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

  @media (max-width: 639px) {
    .leaflet-control-zoom { margin-bottom: 160px !important; }
    .leaflet-control-zoom a { width: 42px !important; height: 42px !important; line-height: 42px !important; font-size: 18px !important; }
  }

  @supports not (backdrop-filter: blur(1px)) {
    .glass { background-color: rgba(11,17,32,0.97) !important; }
  }
`
