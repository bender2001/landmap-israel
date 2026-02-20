/**
 * QuickNavBar - Pill navigation for scrolling to sections
 */
import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { media } from '../../styles/theme'
import type { QuickNavBarProps } from './types'

const QuickNavWrap = styled.div`
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(10, 22, 40, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 6px 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  direction: rtl;
  &::-webkit-scrollbar { display: none; }
  -ms-overflow-style: none;
  scrollbar-width: none;
`

const QuickNavPill = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.lg};
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
  border: 1px solid ${({ $active }) => $active ? 'rgba(200,148,42,0.2)' : 'transparent'};
  background: ${({ $active }) => $active ? 'rgba(200,148,42,0.15)' : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.gold : theme.colors.slate[500]};
  cursor: pointer;
  transition: all 0.2s;
  &:hover { color: ${({ theme }) => theme.colors.slate[300]}; background: rgba(255, 255, 255, 0.05); }
`

const QuickNavLabel = styled.span`
  display: none;
  ${media.sm} { display: inline; }
`

const sections = [
  { id: 'section-financial', label: '💰', title: 'פיננסי' },
  { id: 'section-area-comparison', label: '📊', title: 'ביחס לאזור' },
  { id: 'section-roi-stages', label: '📈', title: 'השבחה' },
  { id: 'section-transactions', label: '🏠', title: 'עסקאות' },
  { id: 'section-planning', label: '📐', title: 'תב"עות' },
  { id: 'section-zoning', label: '🗺️', title: 'תכנון' },
  { id: 'section-images', label: '📷', title: 'תמונות' },
  { id: 'section-quality', label: '🛡️', title: 'איכות' },
  { id: 'section-nearby-pois', label: '📍', title: 'סביבה' },
  { id: 'section-streetview', label: '🛣️', title: 'Street View' },
  { id: 'section-dd', label: '\u2705', title: 'בדיקות' },
]

export default function QuickNavBar({ scrollRef }: QuickNavBarProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  useEffect(() => {
    const container = scrollRef?.current
    if (!container) return
    const handleScroll = () => {
      const containerTop = container.scrollTop + 80
      let found: string | null = null
      for (const s of sections) {
        const el = container.querySelector(`#${s.id}`) as HTMLElement | null
        if (el && el.offsetTop <= containerTop) found = s.id
      }
      setActiveSection(found)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [scrollRef])

  const scrollTo = (id: string) => {
    const container = scrollRef?.current
    if (!container) return
    const el = container.querySelector(`#${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <QuickNavWrap>
      {sections.map(s => (
        <QuickNavPill key={s.id} $active={activeSection === s.id} onClick={() => scrollTo(s.id)} title={s.title}>
          <span>{s.label}</span>
          <QuickNavLabel>{s.title}</QuickNavLabel>
        </QuickNavPill>
      ))}
    </QuickNavWrap>
  )
}
