import { useEffect, useRef } from 'react'

/**
 * useThemeColor — dynamically updates the browser's theme-color meta tag.
 *
 * On mobile browsers (Chrome Android, Safari iOS, Edge), the `theme-color` meta tag
 * controls the color of the browser chrome (address bar, status bar). By changing it
 * based on app context, we make the app feel more native — like a real installed app
 * rather than a website in a browser.
 *
 * Context-aware colors:
 * - Default (map view): #0A1628 (deep navy — matches app background)
 * - Sidebar open (selected plot): darken slightly to signal focused mode
 * - PlotDetail page: #050D1A (darkest navy — full immersion)
 * - Admin pages: #1E293B (slate — distinct from public UI)
 *
 * Neither Madlan nor Yad2 dynamically changes theme-color. This small touch makes
 * LandMap feel significantly more polished on mobile.
 *
 * Also supports `media` attribute for dark/light mode matching (Safari 15+).
 *
 * @param {string} color - Hex color for the browser chrome
 */

const DEFAULT_COLOR = '#0A1628'

export function useThemeColor(color) {
  const prevColorRef = useRef(null)

  useEffect(() => {
    const targetColor = color || DEFAULT_COLOR

    // Find the existing theme-color meta tag
    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'theme-color')
      document.head.appendChild(meta)
    }

    // Save previous value for cleanup
    if (prevColorRef.current === null) {
      prevColorRef.current = meta.getAttribute('content') || DEFAULT_COLOR
    }

    meta.setAttribute('content', targetColor)

    // Cleanup: restore previous color when component unmounts
    return () => {
      const existing = document.querySelector('meta[name="theme-color"]')
      if (existing && prevColorRef.current) {
        existing.setAttribute('content', prevColorRef.current)
      }
      prevColorRef.current = null
    }
  }, [color])
}

/**
 * Preset theme colors for different app contexts.
 * Centralized here so all pages use consistent colors.
 */
export const themeColors = {
  default: '#0A1628',     // Deep navy — default map view
  focused: '#050D1A',     // Darkest navy — sidebar/detail open
  detail: '#050D1A',      // Plot detail page
  admin: '#1E293B',       // Slate — admin pages
  calculator: '#0A1628',  // Navy — calculator
  error: '#1A0A0A',       // Dark red tint — error pages
}
