// ── PublicPageLayout ─────────────────────────────────────────
// Shared shell for all public pages (Areas, Favorites, Calculator, etc.)
// Includes: PublicNav, Breadcrumb, Container, PublicFooter, BackToTopButton
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'
import { PageShell, Container } from '../components/ds'
import PublicNav from '../components/PublicNav'
import PublicFooter from '../components/PublicFooter'
import Breadcrumb from '../components/ui/Breadcrumb'
import BackToTopButton from '../components/ui/BackToTopButton'

/* ── Types ─────────────────────────────────────────────────── */

interface BreadcrumbItem {
  label: string
  to?: string
}

interface PublicPageLayoutProps {
  /** Page title for accessibility (sr-only heading) */
  title?: string
  /** Breadcrumb items; last item is auto-treated as current */
  breadcrumbs?: BreadcrumbItem[]
  /** Narrower max-width container (960 px vs 1200 px) */
  narrow?: boolean
  /** Padding override for the container */
  noPad?: boolean
  children: ReactNode
}

/* ── Component ─────────────────────────────────────────────── */

export default function PublicPageLayout({
  title,
  breadcrumbs,
  narrow,
  noPad,
  children,
}: PublicPageLayoutProps) {
  return (
    <PageShell>
      <PublicNav />

      <Container $narrow={narrow} $noPad={noPad}>
        {title && (
          <h1
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            {title}
          </h1>
        )}

        {breadcrumbs && breadcrumbs.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Breadcrumb items={breadcrumbs} />
          </div>
        )}

        {children}
      </Container>

      <PublicFooter />
      <BackToTopButton />
    </PageShell>
  )
}
