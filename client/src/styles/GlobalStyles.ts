import { createGlobalStyle } from 'styled-components'

export const GlobalStyles = createGlobalStyle`
  :root {
    --color-primary: ${({ theme }) => theme.colors.primary};
    --color-primary-light: ${({ theme }) => theme.colors.primaryLight};
    --color-primary-dark: ${({ theme }) => theme.colors.primaryDark};
    --color-text: ${({ theme }) => theme.colors.text};
    --color-text-secondary: ${({ theme }) => theme.colors.textSecondary};
    --color-text-tertiary: ${({ theme }) => theme.colors.textTertiary};
    --color-bg: ${({ theme }) => theme.colors.bg};
    --color-bg-secondary: ${({ theme }) => theme.colors.bgSecondary};
    --color-bg-tertiary: ${({ theme }) => theme.colors.bgTertiary};
    --color-border: ${({ theme }) => theme.colors.border};
    --color-border-light: ${({ theme }) => theme.colors.borderLight};
    --vh-dynamic: 100vh;
  }
  @supports (height: 100dvh) {
    :root {
      --vh-dynamic: 100dvh;
    }
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%;
    width: 100%;
    overflow: auto;
  }

  body {
    font-family: ${({ theme }) => theme.fonts.primary};
    background: var(--color-bg);
    color: var(--color-text);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    line-height: 1.5;
  }

  /* Scrollbar — light gray */
  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: #D1D5DB;
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #9CA3AF;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* ═══════════════════════════════════════════
     LEAFLET OVERRIDES (Dark Luxury Theme)
     ═══════════════════════════════════════════ */
  .leaflet-container {
    background: #050D1A !important;
    font-family: 'Heebo', sans-serif !important;
  }
  .leaflet-popup-content-wrapper {
    background: rgba(8, 18, 35, 0.96) !important;
    backdrop-filter: blur(24px) saturate(1.5) !important;
    border: 1px solid rgba(200, 148, 42, 0.3) !important;
    border-radius: 18px !important;
    box-shadow:
      0 24px 80px rgba(0, 0, 0, 0.6),
      0 0 40px rgba(200, 148, 42, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
    color: #F1F5F9 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }
  .leaflet-popup-content {
    margin: 0 !important;
    font-family: 'Heebo', sans-serif !important;
    direction: rtl !important;
    min-width: 240px !important;
  }
  .leaflet-popup-tip {
    background: rgba(8, 18, 35, 0.96) !important;
    border: 1px solid rgba(200, 148, 42, 0.3) !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
  }
  .leaflet-popup-close-button {
    color: #94A3B8 !important;
    font-size: 22px !important;
    padding: 8px 12px !important;
    z-index: 10 !important;
    transition: color 0.2s !important;
  }
  .leaflet-popup-close-button:hover {
    color: #E5B94E !important;
  }
  .leaflet-control-zoom {
    border: 1px solid rgba(200, 148, 42, 0.15) !important;
    border-radius: 14px !important;
    overflow: hidden !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 1px rgba(200, 148, 42, 0.2) !important;
  }
  .leaflet-control-zoom a {
    background: rgba(8, 18, 35, 0.92) !important;
    color: #C8942A !important;
    border-color: rgba(200, 148, 42, 0.1) !important;
    width: 38px !important;
    height: 38px !important;
    line-height: 38px !important;
    font-size: 18px !important;
    transition: all 0.2s !important;
  }
  .leaflet-control-zoom a:hover {
    background: rgba(22, 42, 74, 0.95) !important;
    color: #E5B94E !important;
  }
  .leaflet-control-attribution {
    background: rgba(8, 18, 35, 0.7) !important;
    color: #334155 !important;
    font-size: 10px !important;
    backdrop-filter: blur(8px) !important;
    border-radius: 6px 0 0 0 !important;
  }
  .leaflet-control-attribution a {
    color: #475569 !important;
  }
  .leaflet-tooltip-pane {
    z-index: 15 !important;
  }
  .leaflet-popup-pane {
    z-index: 20 !important;
  }
  .leaflet-container {
    overflow: hidden !important;
  }
  .leaflet-container * {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .leaflet-container *::-webkit-scrollbar {
    display: none;
  }
  @media (max-width: 767px) {
    .leaflet-popup-content-wrapper {
      max-width: calc(100vw - 40px) !important;
    }
    .leaflet-popup-content {
      min-width: 200px !important;
      max-width: calc(100vw - 60px) !important;
    }
  }
  @media (max-width: 639px) {
    .leaflet-control-zoom {
      margin-bottom: calc(180px + env(safe-area-inset-bottom, 0px)) !important;
    }
    .leaflet-control-zoom a {
      width: 44px !important;
      height: 44px !important;
      line-height: 44px !important;
      font-size: 20px !important;
    }
  }

  /* ═══════════════════════════════════════════
     POLYGON GLOW & PULSE EFFECTS
     ═══════════════════════════════════════════ */
  .leaflet-overlay-pane path {
    filter: drop-shadow(0 0 8px currentColor) drop-shadow(0 0 2px currentColor);
    transition: fill-opacity 0.3s ease, filter 0.3s ease, stroke-width 0.3s ease;
    cursor: pointer !important;
  }
  .leaflet-overlay-pane path:hover {
    filter: drop-shadow(0 0 18px currentColor) drop-shadow(0 0 36px currentColor) drop-shadow(0 0 4px #fff);
    stroke-width: 4 !important;
  }
  @keyframes polygon-breathe {
    0%, 100% { filter: drop-shadow(0 0 8px currentColor) drop-shadow(0 0 2px currentColor); }
    50% { filter: drop-shadow(0 0 16px currentColor) drop-shadow(0 0 4px currentColor); }
  }

  /* ═══════════════════════════════════════════
     MAP VIGNETTE & NOISE OVERLAY
     ═══════════════════════════════════════════ */
  .map-vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 10;
    background: radial-gradient(ellipse 75% 70% at 50% 50%, transparent 60%, rgba(5, 13, 26, 0.35) 100%);
  }
  .map-noise {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 9;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    background-size: 256px 256px;
  }

  /* ═══════════════════════════════════════════
     GLASS PANEL (Premium Dark) + HOVER GLOW
     ═══════════════════════════════════════════ */
  .glass-panel {
    background: rgba(8, 18, 35, 0.82);
    backdrop-filter: blur(28px) saturate(1.4);
    -webkit-backdrop-filter: blur(28px) saturate(1.4);
    border: 1px solid rgba(200, 148, 42, 0.12);
    border-radius: 1rem;
    box-shadow:
      0 25px 60px -12px rgba(0, 0, 0, 0.55),
      0 0 1px rgba(200, 148, 42, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .glass-panel::-webkit-scrollbar {
    display: none;
  }
  .glass-panel:hover {
    border-color: rgba(200, 148, 42, 0.15);
  }
  .glass-panel-hover:hover {
    border-color: rgba(200, 148, 42, 0.25);
    box-shadow:
      0 25px 60px -12px rgba(0, 0, 0, 0.55),
      0 0 20px rgba(200, 148, 42, 0.08),
      0 0 1px rgba(200, 148, 42, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  /* ═══════════════════════════════════════════
     BRAND BADGE SHIMMER
     ═══════════════════════════════════════════ */
  @keyframes brand-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .brand-text {
    background: linear-gradient(90deg, #C8942A 0%, #E5B94E 25%, #F0D078 50%, #E5B94E 75%, #C8942A 100%);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: brand-shimmer 6s linear infinite;
  }

  /* ═══════════════════════════════════════════
     PRICE TOOLTIPS ON MAP POLYGONS
     ═══════════════════════════════════════════ */
  .leaflet-tooltip.price-tooltip {
    background: rgba(8, 18, 35, 0.92) !important;
    border: 1px solid rgba(200, 148, 42, 0.35) !important;
    border-radius: 10px !important;
    padding: 4px 10px !important;
    font-family: 'Heebo', sans-serif !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    color: #E5B94E !important;
    text-shadow: 0 0 10px rgba(229, 185, 78, 0.3) !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5) !important;
    white-space: nowrap !important;
    pointer-events: none !important;
    transition: all 0.2s ease !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    line-height: 1.3 !important;
    z-index: 15 !important;
  }
  .leaflet-tooltip.price-tooltip .tooltip-main-price {
    font-size: 12px;
    font-weight: 700;
  }
  .leaflet-tooltip.price-tooltip .tooltip-sub {
    font-size: 9px;
    font-weight: 500;
    color: rgba(203, 213, 225, 0.7);
    text-shadow: none;
    letter-spacing: 0.02em;
  }
  .leaflet-tooltip.price-tooltip .tooltip-score-row {
    font-size: 8px;
    font-weight: 600;
    color: rgba(203, 213, 225, 0.55);
    text-shadow: none;
    letter-spacing: 0.01em;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 3px;
    justify-content: center;
  }
  .leaflet-tooltip.price-tooltip .tooltip-grade-badge {
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.02em;
    padding: 0 4px;
    border-radius: 4px;
    border: 1px solid;
    line-height: 14px;
  }
  .leaflet-tooltip.price-tooltip .tooltip-deal-badge {
    font-size: 8px;
    font-weight: 800;
    color: #FFA500;
    text-shadow: 0 0 6px rgba(255, 165, 0, 0.3);
    background: rgba(255, 165, 0, 0.12);
    border: 1px solid rgba(255, 165, 0, 0.25);
    border-radius: 6px;
    padding: 1px 5px;
    margin-top: 1px;
    letter-spacing: 0.01em;
    animation: deal-pulse 2s ease-in-out infinite;
  }
  @keyframes deal-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  .leaflet-tooltip.price-tooltip::before {
    display: none !important;
  }
  @media (max-width: 639px) {
    .leaflet-tooltip.price-tooltip {
      padding: 2px 6px !important;
      font-size: 10px !important;
      border-radius: 7px !important;
    }
    .leaflet-tooltip.price-tooltip .tooltip-main-price {
      font-size: 10px;
    }
    .leaflet-tooltip.price-tooltip .tooltip-sub {
      font-size: 7px;
    }
    .leaflet-tooltip.price-tooltip .tooltip-score-row {
      font-size: 7px;
    }
  }

  /* ═══════════════════════════════════════════
     POPUP INNER STYLES (Premium)
     ═══════════════════════════════════════════ */
  .plot-popup {
    padding: 18px 20px;
  }
  .plot-popup::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #C8942A, #E5B94E, #C8942A, transparent);
  }
  .plot-popup-images {
    display: flex;
    gap: 4px;
    margin: -18px -20px 12px -20px;
    overflow: hidden;
    border-radius: 12px 12px 0 0;
    height: 80px;
  }
  .plot-popup-image-thumb {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }
  .plot-popup-image-thumb img {
    width: 100%;
    height: 80px;
    object-fit: cover;
    display: block;
    transition: transform 0.3s ease;
  }
  .plot-popup-image-thumb:hover img {
    transform: scale(1.08);
  }
  .plot-popup-image-more {
    position: absolute;
    top: 4px;
    left: 4px;
    background: rgba(0,0,0,0.6);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 6px;
    backdrop-filter: blur(4px);
    z-index: 2;
  }
  .plot-popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    gap: 8px;
  }
  .plot-popup-title {
    font-size: 15px;
    font-weight: 800;
    color: #F1F5F9;
    letter-spacing: -0.3px;
  }
  .plot-popup-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }
  .plot-popup-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    font-size: 13px;
    color: #CBD5E1;
    border-bottom: 1px solid rgba(200, 148, 42, 0.06);
  }
  .plot-popup-row:last-child {
    border-bottom: none;
  }
  .plot-popup-label {
    color: #64748B;
    font-weight: 400;
  }
  .plot-popup-value {
    font-weight: 700;
    color: #E2E8F0;
  }
  .plot-popup-value.gold {
    color: #E5B94E;
    text-shadow: 0 0 20px rgba(229, 185, 78, 0.2);
  }
  .plot-popup-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 14px;
  }
  .plot-popup-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid rgba(200, 148, 42, 0.2);
    background: rgba(200, 148, 42, 0.06);
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  .plot-popup-action-btn:hover {
    background: rgba(200, 148, 42, 0.15);
    transform: scale(1.08);
  }
  .plot-popup-action-btn.is-active {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
  }
  .plot-popup-cta {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 0;
    flex: 1;
    padding: 8px 16px;
    background: linear-gradient(135deg, #C8942A, #E5B94E);
    border: none;
    border-radius: 10px;
    color: #0A1628;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    font-family: 'Heebo', sans-serif;
  }
  .plot-popup-cta:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(200, 148, 42, 0.4);
  }
  .plot-popup-badges {
    display: flex;
    gap: 6px;
    margin-top: 10px;
    flex-wrap: wrap;
  }
  .plot-popup-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 600;
  }
  .plot-popup-badge-roi {
    background: rgba(200, 148, 42, 0.15);
    border: 1px solid rgba(200, 148, 42, 0.3);
    color: #E5B94E;
  }
  .plot-popup-badge-time {
    background: rgba(139, 92, 246, 0.15);
    border: 1px solid rgba(139, 92, 246, 0.3);
    color: #A78BFA;
  }

  /* ═══════════════════════════════════════════
     CUSTOM MARKER STYLES (POI)
     ═══════════════════════════════════════════ */
  .poi-marker {
    background: none !important;
    border: none !important;
  }
  .poi-marker-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
  }
  .poi-marker-emoji {
    font-size: 24px;
    filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6));
  }
  .poi-marker-label {
    font-size: 10px;
    font-weight: 700;
    color: rgba(200, 148, 42, 0.7);
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.9);
    white-space: nowrap;
    letter-spacing: 0.3px;
  }

  /* ═══════════════════════════════════════════
     USER LOCATION BLUE DOT
     ═══════════════════════════════════════════ */
  .user-location-marker {
    background: none !important;
    border: none !important;
  }
  .user-dot-outer {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(66, 133, 244, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: user-dot-pulse 2s ease-in-out infinite;
  }
  .user-dot-inner {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #4285F4;
    border: 2.5px solid #fff;
    box-shadow: 0 0 8px rgba(66, 133, 244, 0.6), 0 0 20px rgba(66, 133, 244, 0.3);
  }
  @keyframes user-dot-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.4); opacity: 0.7; }
  }
  .user-location-tooltip .leaflet-tooltip-content {
    font-family: 'Heebo', sans-serif;
    font-size: 11px;
    color: #F1F5F9;
    background: rgba(5, 13, 26, 0.9);
    border: 1px solid rgba(66, 133, 244, 0.3);
    border-radius: 8px;
    padding: 4px 8px;
  }

  /* ═══════════════════════════════════════════
     CITY CLUSTER MARKERS
     ═══════════════════════════════════════════ */
  .city-cluster-marker {
    background: none !important;
    border: none !important;
  }
  .city-cluster-bubble {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, rgba(200, 148, 42, 0.9), rgba(200, 148, 42, 0.7));
    border: 2px solid rgba(229, 185, 78, 0.6);
    box-shadow: 0 4px 20px rgba(200, 148, 42, 0.4), 0 0 40px rgba(200, 148, 42, 0.15);
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    animation: cluster-pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .city-cluster-bubble:hover {
    transform: scale(1.12);
    box-shadow: 0 6px 30px rgba(200, 148, 42, 0.6), 0 0 60px rgba(200, 148, 42, 0.25);
  }
  .city-cluster-city {
    font-size: 9px;
    font-weight: 700;
    color: rgba(26, 26, 46, 0.9);
    line-height: 1;
    margin-bottom: 1px;
    max-width: 90%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .city-cluster-count {
    font-size: 12px;
    font-weight: 800;
    color: #1a1a2e;
    line-height: 1;
  }
  .city-cluster-price {
    font-size: 8px;
    font-weight: 700;
    color: rgba(26, 26, 46, 0.7);
    line-height: 1;
    margin-top: 1px;
  }
  .city-cluster-tooltip {
    background: rgba(5, 13, 26, 0.92) !important;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(200, 148, 42, 0.25) !important;
    border-radius: 10px !important;
    padding: 8px 12px !important;
    font-size: 11px;
    color: #E2E8F0 !important;
    line-height: 1.5;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
  }
  .city-cluster-tooltip::before {
    border-top-color: rgba(200, 148, 42, 0.25) !important;
  }
  @keyframes cluster-pop-in {
    from { transform: scale(0); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  /* ═══════════════════════════════════════════
     POLYGON CENTER LABEL (divIcon)
     ═══════════════════════════════════════════ */
  .polygon-center-label {
    background: none !important;
    border: none !important;
  }

  /* ═══════════════════════════════════════════
     MAP RULER TOOL
     ═══════════════════════════════════════════ */
  .ruler-tooltip {
    background: rgba(5, 13, 26, 0.9) !important;
    border: 1px solid rgba(200, 148, 42, 0.4) !important;
    border-radius: 8px !important;
    color: #F1F5F9 !important;
    font-family: 'Heebo', sans-serif !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    padding: 4px 10px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
    white-space: nowrap !important;
  }
  .ruler-tooltip::before {
    display: none !important;
  }

  /* ═══════════════════════════════════════════
     FILTER BAR CONTAINER
     ═══════════════════════════════════════════ */
  .filter-bar-container {
    position: fixed;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 30;
    max-width: min(900px, calc(100vw - 120px));
    width: 100%;
  }

  /* ═══════════════════════════════════════════
     INTERACTIVE LEGEND
     ═══════════════════════════════════════════ */
  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    padding: 4px 6px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    user-select: none;
    background: none;
    border: none;
    color: inherit;
    font-family: inherit;
    width: 100%;
    text-align: start;
  }
  .legend-item:focus-visible {
    outline: 2px solid rgba(200, 148, 42, 0.6);
    outline-offset: 1px;
  }
  .legend-item:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: scale(1.02);
  }
  .legend-item.inactive {
    opacity: 0.35;
  }
  .legend-item-check {
    width: 14px;
    height: 14px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    color: white;
    transition: all 0.2s;
  }

  /* ═══════════════════════════════════════════
     SCREEN READER ONLY
     ═══════════════════════════════════════════ */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* ═══════════════════════════════════════════
     ANIMATIONS
     ═══════════════════════════════════════════ */
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fade-in 0.2s ease-out;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  /* Selection color */
  ::selection {
    background: rgba(200, 148, 42, 0.3);
    color: #F1F5F9;
  }

  a {
    color: var(--color-primary);
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }

  /* Focus visible */
  :focus-visible {
    outline: 2px solid rgba(200, 148, 42, 0.5);
    outline-offset: 2px;
  }
  :focus:not(:focus-visible) {
    outline: none;
  }

  /* ═══════════════════════════════════════════
     BACKDROP-FILTER FALLBACK
     ═══════════════════════════════════════════ */
  @supports not (backdrop-filter: blur(1px)) {
    .filter-bar-container,
    [class*="backdrop-blur"] {
      background-color: rgba(5, 13, 26, 0.95) !important;
    }
    .glass-panel {
      background-color: rgba(5, 13, 26, 0.98) !important;
    }
  }

  /* ═══════════════════════════════════════════
     TAILWIND-LIKE UTILITY CLASSES
     Used by MapArea, MapClusterLayer, MapRuler,
     MapHeatLayer and related map components.
     ═══════════════════════════════════════════ */

  /* --- Position --- */
  .absolute { position: absolute; }
  .relative { position: relative; }
  .fixed { position: fixed; }
  .inset-0 { inset: 0; }
  .top-3 { top: 0.75rem; }
  .top-4 { top: 1rem; }
  .bottom-8 { bottom: 2rem; }
  .left-3 { left: 0.75rem; }
  .left-4 { left: 1rem; }
  .right-3 { right: 0.75rem; }
  .right-4 { right: 1rem; }
  .z-\\[1000\\] { z-index: 1000; }
  .z-\\[1001\\] { z-index: 1001; }
  .-z-10 { z-index: -10; }

  /* --- Flexbox --- */
  .flex { display: flex; }
  .flex-col { flex-direction: column; }
  .flex-1 { flex: 1 1 0%; }
  .flex-shrink-0 { flex-shrink: 0; }
  .items-center { align-items: center; }
  .justify-center { justify-content: center; }
  .justify-between { justify-content: space-between; }
  .gap-1 { gap: 0.25rem; }
  .gap-1\\.5 { gap: 0.375rem; }
  .gap-2 { gap: 0.5rem; }
  .gap-8 { gap: 2rem; }

  /* --- Sizing --- */
  .w-3 { width: 0.75rem; }
  .w-3\\.5 { width: 0.875rem; }
  .w-4 { width: 1rem; }
  .w-5 { width: 1.25rem; }
  .w-9 { width: 2.25rem; }
  .h-3 { height: 0.75rem; }
  .h-3\\.5 { height: 0.875rem; }
  .h-4 { height: 1rem; }
  .h-5 { height: 1.25rem; }
  .h-9 { height: 2.25rem; }
  .h-full { height: 100%; }
  .w-full { width: 100%; }
  .min-w-\\[130px\\] { min-width: 130px; }
  .min-w-\\[140px\\] { min-width: 140px; }
  .min-w-\\[220px\\] { min-width: 220px; }
  .max-w-sm { max-width: 24rem; }
  .max-h-40 { max-height: 10rem; }

  /* --- Spacing --- */
  .p-2 { padding: 0.5rem; }
  .p-2\\.5 { padding: 0.625rem; }
  .px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
  .px-1\\.5 { padding-left: 0.375rem; padding-right: 0.375rem; }
  .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
  .px-2\\.5 { padding-left: 0.625rem; padding-right: 0.625rem; }
  .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
  .px-4 { padding-left: 1rem; padding-right: 1rem; }
  .px-5 { padding-left: 1.25rem; padding-right: 1.25rem; }
  .px-8 { padding-left: 2rem; padding-right: 2rem; }
  .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
  .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
  .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
  .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
  .mb-0\\.5 { margin-bottom: 0.125rem; }
  .mb-1 { margin-bottom: 0.25rem; }
  .mb-1\\.5 { margin-bottom: 0.375rem; }
  .mb-2 { margin-bottom: 0.5rem; }
  .mb-4 { margin-bottom: 1rem; }
  .mt-0\\.5 { margin-top: 0.125rem; }
  .mr-auto { margin-right: auto; }

  /* --- Dividers --- */
  .divide-y > * + * { border-top-width: 1px; border-top-style: solid; }
  .divide-white\\/10 > * + * { border-color: rgba(255, 255, 255, 0.1); }

  /* --- Overflow --- */
  .overflow-hidden { overflow: hidden; }
  .overflow-y-auto { overflow-y: auto; }

  /* --- Spacing (children) --- */
  .space-y-0\\.5 > * + * { margin-top: 0.125rem; }

  /* --- Pointer & Interaction --- */
  .pointer-events-none { pointer-events: none; }
  .pointer-events-auto { pointer-events: auto; }
  .cursor-pointer { cursor: pointer; }
  .select-none { user-select: none; }
  .outline-none { outline: none; }

  /* --- Typography --- */
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .text-xs { font-size: 0.75rem; line-height: 1rem; }
  .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
  .text-base { font-size: 1rem; line-height: 1.5rem; }
  .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
  .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
  .text-\\[8px\\] { font-size: 8px; }
  .text-\\[9px\\] { font-size: 9px; }
  .text-\\[10px\\] { font-size: 10px; }
  .text-\\[11px\\] { font-size: 11px; }
  .text-\\[12px\\] { font-size: 12px; }
  .font-bold { font-weight: 700; }
  .font-medium { font-weight: 500; }
  .leading-relaxed { line-height: 1.625; }
  .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .whitespace-nowrap { white-space: nowrap; }
  .tabular-nums { font-variant-numeric: tabular-nums; }

  /* --- Colors --- */
  .text-gold { color: #C8942A; }
  .text-slate-200 { color: #E2E8F0; }
  .text-slate-300 { color: #CBD5E1; }
  .text-slate-400 { color: #94A3B8; }
  .text-slate-500 { color: #64748B; }
  .text-slate-600 { color: #475569; }
  .text-emerald-400 { color: #34D399; }
  .text-white { color: #FFFFFF; }
  .text-navy { color: #0A1628; }
  .hover\\:text-gold:hover { color: #C8942A; }
  .hover\\:text-slate-300:hover { color: #CBD5E1; }

  /* --- Backgrounds --- */
  .bg-white\\/5 { background-color: rgba(255, 255, 255, 0.05); }
  .bg-gold\\/10 { background-color: rgba(200, 148, 42, 0.1); }
  .bg-gold\\/15 { background-color: rgba(200, 148, 42, 0.15); }
  .hover\\:bg-white\\/5:hover { background-color: rgba(255, 255, 255, 0.05); }
  .hover\\:bg-gold\\/10:hover { background-color: rgba(200, 148, 42, 0.1); }

  /* --- Gradients --- */
  .bg-gradient-to-r { background-image: linear-gradient(to right, var(--tw-gradient-stops)); }
  .bg-gradient-to-br { background-image: linear-gradient(to bottom right, var(--tw-gradient-stops)); }
  .from-gold { --tw-gradient-from: #C8942A; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(200, 148, 42, 0)); }
  .to-gold-bright { --tw-gradient-to: #E5B94E; }
  .from-navy-light\\/60 { --tw-gradient-from: rgba(22, 42, 74, 0.6); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(22, 42, 74, 0)); }
  .to-gold\\/5 { --tw-gradient-to: rgba(200, 148, 42, 0.05); }

  /* --- Borders --- */
  .border { border-width: 1px; border-style: solid; }
  .border-gold\\/20 { border-color: rgba(200, 148, 42, 0.2); }
  .border-gold\\/30 { border-color: rgba(200, 148, 42, 0.3); }
  .border-gold\\/40 { border-color: rgba(200, 148, 42, 0.4); }
  .border-white\\/10 { border-color: rgba(255, 255, 255, 0.1); }
  .hover\\:border-gold\\/20:hover { border-color: rgba(200, 148, 42, 0.2); }
  .hover\\:border-gold\\/30:hover { border-color: rgba(200, 148, 42, 0.3); }

  /* --- Border radius --- */
  .rounded-full { border-radius: 9999px; }
  .rounded-lg { border-radius: 0.5rem; }
  .rounded-sm { border-radius: 0.125rem; }
  .rounded-xl { border-radius: 0.75rem; }

  /* --- Transitions --- */
  .transition-colors { transition-property: color, background-color, border-color; transition-duration: 150ms; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }
  .transition-all { transition-property: all; transition-duration: 150ms; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }

  /* --- Shadows --- */
  .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
  .shadow-gold\\/10 { box-shadow: 0 4px 12px rgba(200, 148, 42, 0.1); }
  .shadow-gold\\/30 { box-shadow: 0 4px 12px rgba(200, 148, 42, 0.3); }
  .hover\\:shadow-lg:hover { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }

  /* --- Transforms --- */
  .hover\\:scale-105:hover { transform: scale(1.05); }
  .-translate-x-1\\/2 { transform: translateX(-50%); }
  .-translate-y-1\\/2 { transform: translateY(-50%); }

  /* --- Misc --- */
  .disabled\\:opacity-50:disabled { opacity: 0.5; }
  .hidden { display: none; }
  .accent-gold { accent-color: #C8942A; }

  /* --- Responsive (sm: 640px+) --- */
  @media (min-width: 640px) {
    .sm\\:block { display: block; }
    .sm\\:hidden { display: none; }
    .sm\\:inline { display: inline; }
    .sm\\:flex { display: flex; }
    .sm\\:top-4 { top: 1rem; }
    .sm\\:right-4 { right: 1rem; }
    .sm\\:bottom-\\[15rem\\] { bottom: 15rem; }
    .sm\\:bottom-\\[12rem\\] { bottom: 12rem; }
    .sm\\:bottom-\\[14rem\\] { bottom: 14rem; }
    .sm\\:bottom-44 { bottom: 11rem; }
    .sm\\:top-\\[4\\.5rem\\] { top: 4.5rem; }
    .sm\\:top-\\[60px\\] { top: 60px; }
    .sm\\:top-\\[116px\\] { top: 116px; }
  }
`
