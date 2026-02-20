/**
 * SidebarShell - Panel/Drawer wrapper, drag handle, scroll shadows, swipe gestures
 */
import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import styled, { keyframes } from 'styled-components'
import { ChevronUp } from 'lucide-react'
import { useFocusTrap } from '../../hooks/useUI'
import { media } from '../../styles/theme'
import { theme as themeTokens } from '../../styles/theme'
import { ScrollShadowTop, ScrollShadowBottom } from '../ds'

/* ── Local styled ──────────────────────────────────────────── */

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 50;
  animation: _shellFadeIn 0.2s ease;
  @keyframes _shellFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`

const Panel = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  height: 100%;
  width: 100%;
  max-width: 100%;
  z-index: 60;
  background: ${({ theme }) => theme.colors.navy};
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  direction: rtl;

  ${media.sm} {
    width: 420px;
    animation: slideInRight 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  }
  @media (min-width: 768px) { width: 480px; }
  @media (min-width: 1024px) { width: 520px; }
  @media (min-width: 1280px) { width: 560px; }

  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
`

const GoldAccentBar = styled.div`
  height: 3px;
  flex-shrink: 0;
  background: linear-gradient(90deg, #C8942A, #E5B94E, #F0D078, #E5B94E, #C8942A);
`

const DragHandle = styled.div`
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
  flex-shrink: 0;
  ${media.sm} { display: none; }
`

const DragHandleBar = styled.div`
  width: 36px;
  height: 4px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.15);
`

const ScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
`

const ScrollTopBtn = styled.button`
  position: absolute;
  left: 16px;
  bottom: 144px;
  z-index: 10;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radii.xl};
  background: rgba(10, 22, 40, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  backdrop-filter: blur(4px);
  transition: all 0.2s;

  &:hover {
    border-color: rgba(200, 148, 42, 0.3);
    background: rgba(10, 22, 40, 1);
  }
`

/* ── Component ─────────────────────────────────────────────── */

interface SidebarShellProps {
  isOpen: boolean
  onClose: () => void
  plotLabel: string
  headerContent: ReactNode
  footerContent: ReactNode
  children: ReactNode
  scrollRef: React.RefObject<HTMLDivElement>
}

const SNAP_PEEK = 40
const SNAP_MID = 75
const SNAP_FULL = 95
const snapPoints = [SNAP_PEEK, SNAP_MID, SNAP_FULL]

export default function SidebarShell({
  isOpen,
  onClose,
  plotLabel,
  headerContent,
  footerContent,
  children,
  scrollRef,
}: SidebarShellProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { returnFocus } = useFocusTrap(isOpen, panelRef as any)

  const handleClose = useCallback(() => {
    returnFocus()
    onClose()
  }, [returnFocus, onClose])

  const [scrollShadow, setScrollShadow] = useState({ top: false, bottom: false })
  const [showScrollTop, setShowScrollTop] = useState(false)

  const [sheetHeight, setSheetHeight] = useState(SNAP_MID)
  const [isDragging, setIsDragging] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)

  const dragRef = useRef({
    startY: 0,
    startX: 0,
    startHeight: SNAP_MID,
    direction: null as string | null,
    active: false,
  })

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

  const handleTouchStart = useCallback((e: any) => {
    const touch = e.touches[0]
    dragRef.current = {
      startY: touch.clientY,
      startX: touch.clientX,
      startHeight: sheetHeight,
      direction: null,
      active: false,
    }
  }, [sheetHeight])

  const handleTouchMove = useCallback((e: any) => {
    const touch = e.touches[0]
    const state = dragRef.current
    const dx = touch.clientX - state.startX
    const dy = touch.clientY - state.startY

    if (!state.direction && (Math.abs(dx) > 15 || Math.abs(dy) > 15)) {
      state.direction = Math.abs(dy) >= Math.abs(dx) ? 'vertical' : 'horizontal'
      state.active = true
      setIsDragging(true)
    }

    if (!state.active) return

    if (state.direction === 'vertical' && isMobile) {
      const vhPerPx = 100 / window.innerHeight
      const deltaVh = -dy * vhPerPx
      const newHeight = Math.max(10, Math.min(95, state.startHeight + deltaVh))
      setSheetHeight(newHeight)
      e.preventDefault()
    } else if (state.direction === 'horizontal') {
      const offset = Math.max(0, dx)
      setSwipeOffset(offset)
    }
  }, [isMobile])

  const handleTouchEnd = useCallback(() => {
    const state = dragRef.current
    setIsDragging(false)

    if (state.direction === 'vertical' && isMobile) {
      let closest = snapPoints[0]
      let minDist = Infinity
      for (const sp of snapPoints) {
        const dist = Math.abs(sheetHeight - sp)
        if (dist < minDist) { minDist = dist; closest = sp }
      }
      if (sheetHeight < SNAP_PEEK - 10) {
        handleClose()
        return
      }
      setSheetHeight(closest)
    } else if (state.direction === 'horizontal') {
      if (swipeOffset > 100) {
        setSwipeOffset(0)
        handleClose()
      } else {
        setSwipeOffset(0)
      }
    }

    dragRef.current = { startY: 0, startX: 0, startHeight: sheetHeight, direction: null, active: false }
  }, [sheetHeight, swipeOffset, handleClose, isMobile])

  useEffect(() => {
    if (isOpen) setSheetHeight(SNAP_MID)
  }, [isOpen])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const top = scrollTop > 10
    const bottom = scrollTop + clientHeight < scrollHeight - 10
    setShowScrollTop(scrollTop > 400)
    setScrollShadow(prev => {
      if (prev.top === top && prev.bottom === bottom) return prev
      return { top, bottom }
    })
  }, [scrollRef])

  useEffect(() => { handleScroll() }, [handleScroll])

  if (!isOpen) return null

  return (
    <>
      <Backdrop onClick={handleClose} aria-hidden="true" />

      <Panel
        ref={panelRef}
        role="dialog"
        aria-label={plotLabel}
        aria-modal="true"
        style={{
          ...(isMobile ? { height: `${sheetHeight}vh`, transition: isDragging ? 'none' : 'height 0.35s cubic-bezier(0.32, 0.72, 0, 1)' } : {}),
          ...(swipeOffset > 0 ? { transform: `translateX(${swipeOffset}px)`, transition: 'none' } : {}),
        }}
      >
        <GoldAccentBar />
        <DragHandle
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <DragHandleBar />
        </DragHandle>

        {/* Draggable header zone */}
        <div
          style={{ flexShrink: 0 }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {headerContent}
        </div>

        {/* Scrollable content */}
        <ScrollArea ref={scrollRef} onScroll={handleScroll}>
          <ScrollShadowTop $visible={scrollShadow.top} />
          <ScrollShadowBottom $visible={scrollShadow.bottom} />
          {children}
        </ScrollArea>

        {showScrollTop && (
          <ScrollTopBtn onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} title="חזור למעלה" aria-label="חזור למעלה">
            <ChevronUp style={{ width: 16, height: 16, color: themeTokens.colors.gold }} />
          </ScrollTopBtn>
        )}

        {footerContent}
      </Panel>
    </>
  )
}
