import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Home } from 'lucide-react'
import styled from 'styled-components'
import { theme, media } from '../../styles/theme'

const Nav = styled.nav`
  direction: rtl;
`

const List = styled.ol`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
  font-size: 11px;
  color: ${theme.colors.slate[500]};
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  ${media.sm} {
    font-size: 12px;
  }
`

const Item = styled.li`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`

const Separator = styled(ChevronLeft)`
  width: 12px;
  height: 12px;
  color: ${theme.colors.slate[600]};
  flex-shrink: 0;
`

const HomeIcon = styled(Home)`
  width: 12px;
  height: 12px;
  flex-shrink: 0;
`

const Current = styled.span`
  color: ${theme.colors.gold};
  font-weight: 500;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  ${media.sm} {
    max-width: none;
  }
`

const LinkItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${theme.colors.slate[400]};
  text-decoration: none;
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color ${theme.transitions.normal};

  &:hover {
    color: ${theme.colors.gold};
  }

  ${media.sm} {
    max-width: none;
  }
`

interface BreadcrumbItem {
  label: string
  to?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (!items || items.length < 2) return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.to ? { item: `${window.location.origin}${item.to}` } : {}),
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav aria-label="Breadcrumb" className={className}>
        <List role="list">
          {items.map((item, i) => {
            const isLast = i === items.length - 1
            const isFirst = i === 0

            return (
              <Item key={item.to || item.label}>
                {i > 0 && <Separator aria-hidden="true" />}
                {isLast ? (
                  <Current aria-current="page" title={item.label}>
                    {item.label}
                  </Current>
                ) : (
                  <LinkItem to={item.to || ''} title={item.label}>
                    {isFirst && <HomeIcon aria-hidden="true" />}
                    <span>{item.label}</span>
                  </LinkItem>
                )}
              </Item>
            )
          })}
        </List>
      </Nav>
    </>
  )
}

export default memo(Breadcrumb)
