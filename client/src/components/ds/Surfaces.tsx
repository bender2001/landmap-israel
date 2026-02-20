import styled, { css } from 'styled-components'
import { media } from '../../styles/theme'
import { fadeIn, slideUp, scaleIn } from './animations'

/* ── GlassCard ──────────────────────────────────────────────── */

export const GlassCard = styled.div<{ $pad?: boolean; $hover?: boolean }>`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: ${({ theme }) => theme.radii.lg};
  backdrop-filter: blur(8px);
  ${({ $pad }) => $pad !== false && css`padding: 20px;`}
  ${({ $hover }) => $hover && css`
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    &:hover {
      border-color: rgba(200, 148, 42, 0.2);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
  `}
`

/** Bare glass panel without padding */
export const GlassPanel = styled(GlassCard).attrs({ $pad: false })`
  backdrop-filter: blur(8px);
`

/** Section-level glass wrapper (subtler) */
export const SectionWrap = styled.div`
  background: rgba(10, 22, 40, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 12px;
`

/* ── Card (elevated surface) ────────────────────────────────── */

export const Card = styled.div<{ $p?: number }>`
  background: rgba(10, 22, 40, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ $p = 16 }) => $p}px;
`

/* ── Backdrop ───────────────────────────────────────────────── */

export const Backdrop = styled.div<{ $blur?: number }>`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.modal};
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(${({ $blur = 4 }) => $blur}px);
  animation: ${fadeIn} 0.2s ease;
`

/* ── Modal ──────────────────────────────────────────────────── */

export const ModalShell = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.modal};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`

export const ModalContent = styled.div<{ $maxW?: number }>`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: ${({ $maxW = 480 }) => $maxW}px;
  max-height: 90vh;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.navy};
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${({ theme }) => theme.radii.xxl};
  padding: 24px;
  animation: ${scaleIn} 0.25s ease;
`

/* ── Drawer ─────────────────────────────────────────────────── */

export const Drawer = styled.div<{ $side?: 'right' | 'left'; $width?: number }>`
  position: fixed;
  top: 0;
  ${({ $side = 'right' }) => $side}: 0;
  bottom: 0;
  z-index: ${({ theme }) => theme.zIndex.sidebar};
  width: ${({ $width = 420 }) => $width}px;
  max-width: 100vw;
  background: ${({ theme }) => theme.colors.navy};
  border-${({ $side = 'right' }) => $side === 'right' ? 'left' : 'right'}: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: -4px 0 30px rgba(0, 0, 0, 0.3);
  overflow-y: auto;
  overscroll-behavior: contain;
`

/* ── BottomSheet ────────────────────────────────────────────── */

export const BottomSheet = styled.div<{ $maxH?: string }>`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: ${({ theme }) => theme.zIndex.modal};
  max-height: ${({ $maxH = '85vh' }) => $maxH};
  background: ${({ theme }) => theme.colors.navy};
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px 20px 0 0;
  padding: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  animation: ${slideUp} 0.3s cubic-bezier(0.32, 0.72, 0, 1);
`

export const DragHandle = styled.div`
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 auto 12px;
`

/* ── GoldBar (top accent) ───────────────────────────────────── */

export const GoldBar = styled.div<{ $h?: number }>`
  height: ${({ $h = 2 }) => $h}px;
  background: linear-gradient(90deg,
    ${({ theme }) => theme.colors.gold},
    ${({ theme }) => theme.colors.goldBright}
  );
  border-radius: ${({ $h = 2 }) => $h / 2}px;
`

/* ── ScrollShadows ──────────────────────────────────────────── */

export const ScrollShadowTop = styled.div<{ $visible?: boolean }>`
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  height: 12px;
  pointer-events: none;
  z-index: 10;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  background: linear-gradient(to bottom, rgba(10,22,40,0.8), transparent);
  transition: opacity 0.2s ease;
`

export const ScrollShadowBottom = styled.div<{ $visible?: boolean }>`
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  height: 12px;
  pointer-events: none;
  z-index: 10;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  background: linear-gradient(to top, rgba(10,22,40,0.8), transparent);
  transition: opacity 0.2s ease;
`
