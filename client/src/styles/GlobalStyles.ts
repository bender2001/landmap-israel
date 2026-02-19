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

  /* Leaflet overrides */
  .leaflet-popup-content-wrapper {
    background: var(--color-bg);
    color: var(--color-text);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    border: 1px solid var(--color-border);
    padding: 0;
  }
  .leaflet-popup-tip {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
  }
  .leaflet-popup-content {
    margin: 0;
    font-family: 'Heebo', sans-serif;
  }
  .leaflet-popup-close-button {
    color: var(--color-text-secondary) !important;
    font-size: 20px !important;
    padding: 8px !important;
  }
  .leaflet-control-zoom a {
    background: var(--color-bg) !important;
    color: var(--color-text) !important;
    border-color: var(--color-border) !important;
  }
  .leaflet-control-zoom a:hover {
    background: var(--color-bg-secondary) !important;
  }
  .leaflet-control-attribution {
    background: rgba(255,255,255,0.8) !important;
    color: var(--color-text-tertiary) !important;
    font-size: 10px !important;
  }
  .leaflet-control-attribution a {
    color: var(--color-primary) !important;
  }

  /* Selection color */
  ::selection {
    background: var(--color-primary-light);
    color: var(--color-text);
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
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
`
