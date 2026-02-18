import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Scrolls the window to top on route changes — standard UX for SPAs.
 * Without this, navigating from a scrolled MapView to /about would keep the scroll position,
 * which feels broken. Madlan/Yad2 both reset scroll on navigation.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
