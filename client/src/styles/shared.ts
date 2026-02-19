import styled, { css, keyframes } from 'styled-components'
import { media } from './theme'

/* ── Keyframes ─────────────────────────────────────────── */
export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`
export const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.6; }
`
export const spin = keyframes`
  to { transform: rotate(360deg); }
`
export const shimmer = keyframes`
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

/* ── Page layouts ──────────────────────────────────────── */
export const PageWrapper = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.navy};
  direction: rtl;
`

export const PageContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 16px 64px;
  ${media.sm} { padding-left: 24px; padding-right: 24px; }
`

export const PageContentNarrow = styled(PageContent)`
  max-width: 960px;
`

/* ── Glass panel ───────────────────────────────────────── */
export const GlassPanel = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: ${({ theme }) => theme.radii.xl};
  backdrop-filter: blur(12px);
`

export const GlassPanelPadded = styled(GlassPanel)`
  padding: 20px;
`

/* ── Typography ────────────────────────────────────────── */
export const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.slate[100]};
  ${media.sm} { font-size: 36px; }
`

export const SectionTitle = styled.h3`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`

export const Label = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[400]};
`

export const SmallLabel = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[500]};
`

export const Muted = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.slate[600]};
`

/* ── Brand text gradient ───────────────────────────────── */
export const BrandText = styled.span`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.gold}, ${({ theme }) => theme.colors.goldBright});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

/* ── Inputs ────────────────────────────────────────────── */
export const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  background: rgba(10, 22, 40, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${({ theme }) => theme.radii.xl};
  color: ${({ theme }) => theme.colors.slate[200]};
  font-size: 14px;
  transition: border-color ${({ theme }) => theme.transitions.normal};
  &::placeholder { color: ${({ theme }) => theme.colors.slate[500]}; }
  &:focus { border-color: rgba(200, 148, 42, 0.5); outline: none; }
`

export const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  background: rgba(10, 22, 40, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${({ theme }) => theme.radii.xl};
  color: ${({ theme }) => theme.colors.slate[200]};
  font-size: 14px;
  transition: border-color ${({ theme }) => theme.transitions.normal};
  &:focus { border-color: rgba(200, 148, 42, 0.5); outline: none; }
`

/* ── Buttons ───────────────────────────────────────────── */
export const GoldButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.gold}, ${({ theme }) => theme.colors.goldBright});
  color: ${({ theme }) => theme.colors.navy};
  font-weight: 700;
  font-size: 14px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.xl};
  cursor: pointer;
  transition: box-shadow ${({ theme }) => theme.transitions.normal};
  &:hover { box-shadow: 0 4px 20px rgba(200, 148, 42, 0.3); }
`

export const GhostButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${({ theme }) => theme.radii.xl};
  color: ${({ theme }) => theme.colors.slate[300]};
  font-size: 14px;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.normal};
  &:hover {
    border-color: rgba(200, 148, 42, 0.3);
    color: ${({ theme }) => theme.colors.gold};
  }
`

/* ── Stat card ─────────────────────────────────────────── */
export const StatCardWrap = styled(GlassPanel)`
  padding: 16px;
`

/* ── Grid helpers ──────────────────────────────────────── */
export const Grid2 = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
`

export const Grid3 = styled.div`
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 12px;
  ${media.sm} { grid-template-columns: repeat(2, 1fr); }
  ${media.lg} { grid-template-columns: repeat(3, 1fr); }
`

/* ── Flex helpers ──────────────────────────────────────── */
export const FlexCenter = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`

export const FlexBetween = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

export const FlexRow = styled.div<{ $gap?: number }>`
  display: flex;
  align-items: center;
  gap: ${({ $gap = 8 }) => $gap}px;
`

export const FlexCol = styled.div<{ $gap?: number }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap = 8 }) => $gap}px;
`

/* ── Progress bar ──────────────────────────────────────── */
export const ProgressTrack = styled.div`
  height: 8px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

export const ProgressFill = styled.div<{ $width: number; $color?: string }>`
  height: 100%;
  border-radius: 9999px;
  width: ${({ $width }) => $width}%;
  background: ${({ $color }) => $color || 'linear-gradient(90deg, #C8942A, #E5B94E)'};
  transition: width 0.7s ease;
`

/* ── Divider ───────────────────────────────────────────── */
export const Divider = styled.div`
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 12px 0;
`

/* ── Badge ─────────────────────────────────────────────── */
export const Badge = styled.span<{ $bg?: string; $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 500;
  background: ${({ $bg }) => $bg || 'rgba(255,255,255,0.05)'};
  color: ${({ $color }) => $color || 'inherit'};
`

/* ── Card lift ─────────────────────────────────────────── */
export const CardLift = css`
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }
`
