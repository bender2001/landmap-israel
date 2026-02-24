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
  z: { map: 1, controls: 12, filter: 30, sidebar: 50, modal: 70, toast: 80, nav: 90 },
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
  html{scroll-behavior:smooth;scroll-padding-top:80px;text-size-adjust:100%;-webkit-text-size-adjust:100%;}
  html,body,#root{min-height:100%;width:100%}
  body{font-family:${t.font};background:${t.lBg};color:${t.lText};-webkit-font-smoothing:antialiased;line-height:1.6}
  ::selection{background:rgba(212,168,75,0.25);color:${t.black}}
  a{color:${t.gold};text-decoration:none;}
  a:hover{text-decoration:none;}
  ::-webkit-scrollbar{width:5px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px}
  :focus-visible{outline:2px solid ${t.gold};outline-offset:2px}
  :focus:not(:focus-visible){outline:none}
  @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;transition-duration:0.01ms!important}}
  @media(prefers-contrast:more){
    :root{--high-contrast:1;}
    body{font-weight:500!important;}
    button,a,[role="button"]{outline:2px solid transparent!important;outline-offset:2px!important;}
    button:focus-visible,a:focus-visible,[role="button"]:focus-visible{outline:3px solid ${t.gold}!important;outline-offset:3px!important;}
    .leaflet-popup-content-wrapper{border-width:2px!important;}
  }

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
  /* Hovered polygon glow */
  .leaflet-overlay-pane path.plot-hovered{filter:drop-shadow(0 0 10px currentColor) drop-shadow(0 0 20px rgba(240,199,94,0.25))!important;stroke-width:3!important;cursor:pointer!important}
  /* Selected polygon pulsing glow */
  .leaflet-overlay-pane path.plot-selected{animation:plotSelectedPulse 2s ease-in-out infinite;stroke-width:3.5!important}
  @keyframes plotSelectedPulse{0%,100%{filter:drop-shadow(0 0 8px currentColor) drop-shadow(0 0 16px rgba(212,168,75,0.3))}50%{filter:drop-shadow(0 0 18px currentColor) drop-shadow(0 0 36px rgba(212,168,75,0.5))}}

  .map-vignette{position:absolute;inset:0;pointer-events:none;z-index:10;background:radial-gradient(ellipse 80% 75% at 50% 50%,transparent 60%,rgba(0,0,0,0.15) 100%)}

  /* Price tooltip */
  .leaflet-tooltip.price-tooltip{background:rgba(255,255,255,0.95)!important;border:1px solid ${t.lBorder}!important;border-radius:${t.r.sm}!important;padding:3px 8px!important;font-family:${t.font}!important;font-size:11px!important;font-weight:700!important;color:${t.black}!important;box-shadow:${t.sh.sm}!important;white-space:nowrap!important;pointer-events:none!important;z-index:15!important}
  .dark .leaflet-tooltip.price-tooltip{background:rgba(11,17,32,0.92)!important;border-color:rgba(212,168,75,0.3)!important;color:${t.goldBright}!important}
  .leaflet-tooltip.price-tooltip::before{display:none!important}
  .leaflet-tooltip.plot-tooltip-rich{padding:4px 10px!important;border-radius:${t.r.md}!important}

  /* Plot price labels (permanent at high zoom) */
  .plot-price-label{background:none!important;border:none!important;pointer-events:none!important}
  .ppl-inner{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;
    background:rgba(11,17,32,0.88);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
    border:1px solid rgba(212,168,75,0.3);border-radius:6px;
    box-shadow:0 2px 8px rgba(0,0,0,0.35);white-space:nowrap;line-height:1;
    transform:translateZ(0);}
  .ppl-price{font-size:11px;font-weight:800;color:${t.goldBright};font-family:${t.font}}
  .ppl-sep{font-size:8px;color:${t.textDim};opacity:0.4}
  .ppl-grade{font-size:10px;font-weight:800;font-family:${t.font}}
  /* New listing badge */
  .plot-new-badge{background:none!important;border:none!important;pointer-events:none!important}
  .pnb-inner{display:inline-flex;align-items:center;gap:2px;padding:2px 8px;
    background:linear-gradient(135deg,#10B981,#059669);border-radius:9999px;
    font-size:9px;font-weight:800;color:#fff;font-family:${t.font};
    box-shadow:0 2px 8px rgba(16,185,129,0.4);white-space:nowrap;
    animation:newBadgePulse 2.5s ease-in-out infinite;}
  @keyframes newBadgePulse{0%,100%{transform:scale(1);box-shadow:0 2px 8px rgba(16,185,129,0.4)}50%{transform:scale(1.08);box-shadow:0 4px 16px rgba(16,185,129,0.6)}}
  .pnb-hot{background:linear-gradient(135deg,#F59E0B,#EF4444)!important;box-shadow:0 2px 8px rgba(239,68,68,0.4)!important;
    animation:hotBadgePulse 2s ease-in-out infinite!important;}
  @keyframes hotBadgePulse{0%,100%{transform:scale(1);box-shadow:0 2px 8px rgba(239,68,68,0.4)}50%{transform:scale(1.1);box-shadow:0 4px 16px rgba(239,68,68,0.6)}}

  /* Popup inner */
  .plot-popup{padding:16px}
  .plot-popup::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,${t.gold},${t.goldBright},${t.gold},transparent);border-radius:${t.r.lg} ${t.r.lg} 0 0}
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

  /* WhatsApp quick contact button in popup */
  .plot-popup-wa{display:flex;align-items:center;justify-content:center;width:36px;height:36px;
    border-radius:${t.r.sm};background:#25D366;border:none;cursor:pointer;
    font-size:16px;line-height:1;transition:all ${t.tr};text-decoration:none!important;
    box-shadow:0 2px 8px rgba(37,211,102,0.25);}
  .plot-popup-wa:hover{background:#20bd5a;transform:translateY(-1px);box-shadow:0 4px 16px rgba(37,211,102,0.4);}

  /* Dark-mode-aware popup score breakdown */
  .popup-score-breakdown{display:flex;flex-direction:column;gap:3px;margin-top:6px;padding:6px 10px;
    background:rgba(0,0,0,0.03);border-radius:${t.r.sm};direction:rtl;}
  .dark .popup-score-breakdown{background:rgba(255,255,255,0.04);}
  .popup-score-row{display:flex;align-items:center;gap:6px;}
  .popup-score-icon{font-size:10px;flex-shrink:0;}
  .popup-score-label{font-size:9px;font-weight:600;color:${t.lTextSec};min-width:48px;flex-shrink:0;}
  .dark .popup-score-label{color:${t.textDim};}
  .popup-score-track{flex:1;height:4px;border-radius:2px;background:rgba(0,0,0,0.06);overflow:hidden;}
  .dark .popup-score-track{background:rgba(255,255,255,0.08);}
  .popup-score-fill{height:100%;border-radius:2px;transition:width 0.4s;}
  .popup-score-val{font-size:9px;font-weight:800;min-width:20px;text-align:left;}

  /* Dark-mode popup demand badge */
  .popup-demand{display:flex;align-items:center;gap:6px;margin-top:6px;padding:4px 10px;
    border-radius:${t.r.full};font-size:10px;font-weight:700;direction:rtl;}
  .popup-reco{display:flex;align-items:center;gap:6px;margin-top:6px;padding:5px 10px;
    border-radius:${t.r.full};font-size:10px;font-weight:800;direction:rtl;}

  /* Best Value diamond marker */
  .plot-best-value-badge{background:none!important;border:none!important;pointer-events:none!important}
  .pbv-inner{display:inline-flex;align-items:center;gap:3px;padding:2px 10px;
    background:linear-gradient(135deg,${t.gold},${t.goldBright});border-radius:9999px;
    font-size:9px;font-weight:900;color:#0B1120;font-family:${t.font};
    box-shadow:0 2px 12px rgba(212,168,75,0.5),0 0 20px rgba(212,168,75,0.2);
    white-space:nowrap;letter-spacing:0.5px;
    animation:bestValueMarkerPulse 3s ease-in-out infinite;}
  @keyframes bestValueMarkerPulse{0%,100%{transform:scale(1);box-shadow:0 2px 12px rgba(212,168,75,0.5),0 0 20px rgba(212,168,75,0.2)}50%{transform:scale(1.06);box-shadow:0 4px 20px rgba(212,168,75,0.7),0 0 32px rgba(212,168,75,0.35)}}

  /* Ruler / Distance measurement markers */
  .ruler-point-marker,.ruler-dist-label,.ruler-total-label{background:none!important;border:none!important;pointer-events:none!important}

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

  /* Map popup navigation link pills */
  .popup-nav-row{display:flex;align-items:center;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid ${t.border};}
  .popup-nav-label{font-size:10px;font-weight:600;color:${t.textDim};white-space:nowrap;}
  .popup-nav-link{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;
    border-radius:${t.r.full};font-size:10px;font-weight:700;text-decoration:none;
    white-space:nowrap;transition:all ${t.tr};cursor:pointer;font-family:${t.font};border:1px solid;}
  .popup-nav-link:hover{transform:translateY(-1px);filter:brightness(1.1);}
  .popup-nav-link--gmaps{background:rgba(66,133,244,0.1);border-color:rgba(66,133,244,0.2);color:#4285F4;}
  .popup-nav-link--street{background:rgba(251,188,5,0.1);border-color:rgba(251,188,5,0.2);color:#FBBC05;}
  .popup-nav-link--waze{background:rgba(51,181,229,0.1);border-color:rgba(51,181,229,0.2);color:#33B5E5;}
  .popup-nav-link--coords{background:rgba(148,163,184,0.1);border-color:rgba(148,163,184,0.2);color:#94A3B8;}
  .popup-nav-link--coords.copied{background:rgba(16,185,129,0.1);border-color:rgba(16,185,129,0.3);color:#10B981;}

  /* Search in area button animation */
  @keyframes searchAreaFadeIn{from{opacity:0;transform:translateX(-50%) translateY(-8px) scale(0.92)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}

  /* Performance: GPU-composited layers for animated elements */
  .gpu-layer{will-change:transform;transform:translateZ(0)}
  /* Performance: content-visibility for below-fold sections (reduces initial paint) */
  .cv-auto{content-visibility:auto;contain-intrinsic-size:auto 400px}

  /* Skip to content link */
  .skip-link{position:absolute;top:-100%;left:50%;transform:translateX(-50%);z-index:9999;
    padding:12px 24px;background:${t.gold};color:${t.bg};font-weight:700;font-family:${t.font};font-size:14px;
    border-radius:0 0 ${t.r.md} ${t.r.md};box-shadow:${t.sh.lg};text-decoration:none;transition:top 0.2s;}
  .skip-link:focus{top:0;}

  @media(max-width:639px){
    .leaflet-control-zoom{margin-bottom:100px!important}
    .leaflet-control-zoom a{width:42px!important;height:42px!important;line-height:42px!important;font-size:18px!important}
    /* Push map legend above mobile nav bar + stats strip */
    .map-legend-box{bottom:112px!important;right:8px!important;padding:6px 10px!important;font-size:9px!important;max-width:140px!important;}
  }

  /* ── Print Styles ── */
  @media print{
    @page{size:A4;margin:15mm 12mm;}
    body{background:#fff!important;color:#000!important;font-size:11pt!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    nav,footer,.leaflet-container,.map-vignette,button:not(.print-show),[role="navigation"]{display:none!important;}
    /* Show content without fixed positioning */
    [style*="position: fixed"],[style*="position:fixed"]{position:static!important;box-shadow:none!important;backdrop-filter:none!important;border:none!important;}
    /* Cards look clean */
    *{box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;animation:none!important;transition:none!important;}
    /* Force visible colors for badges */
    [class*="Badge"]{border:1px solid #ccc!important;padding:2px 8px!important;}
    /* Grid layout for print */
    [class*="Grid"]{display:block!important;}
    [class*="Grid"] > *{margin-bottom:16px!important;page-break-inside:avoid!important;break-inside:avoid!important;}
    /* Print header */
    h1{font-size:20pt!important;color:#000!important;}
    h2,h3{font-size:14pt!important;color:#111!important;}
    /* Show URL after links */
    a[href^="http"]:after{content:" (" attr(href) ")";font-size:8pt;color:#666;}
    /* Hide interactive elements */
    input[type="range"],input[type="checkbox"]{display:none!important;}
    /* Print watermark */
    body::after{content:"LandMap Israel — Investment Report";position:fixed;bottom:5mm;right:10mm;font-size:8pt;color:#aaa;font-family:${t.font};}
    /* Page breaks for report sections */
    section,article,[class*="Card"]{page-break-inside:avoid!important;break-inside:avoid!important;}
    /* Plot detail print improvements */
    [class*="BottomBar"]{display:none!important;}
    [class*="WhatsAppFab"]{display:none!important;}
    [class*="ReadingProgress"]{display:none!important;}
    /* Investment projection chart: preserve colors */
    svg{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
    svg text{fill:#333!important;}
    /* Metrics grid: force readable sizing */
    [class*="Metrics"]{grid-template-columns:repeat(3,1fr)!important;gap:12px!important;}
    /* Main grid: force stacked layout */
    [class*="Grid"]{grid-template-columns:1fr!important;}
    /* Keep badges colorful */
    [class*="Badge"]{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
    /* Sidebar print layout — show content inline */
    aside[role="complementary"]{position:static!important;width:100%!important;max-width:100%!important;transform:none!important;
      border:none!important;height:auto!important;overflow:visible!important;}
    aside[role="complementary"] > div:first-child{display:none!important;} /* hide gold bar */
    /* Force dark text for print */
    aside[role="complementary"] *{color:#1a1a1a!important;background:white!important;border-color:#ddd!important;}
    aside[role="complementary"] h2{color:#000!important;}
    aside[role="complementary"] [class*="Badge"]{print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important;}
  }
`
