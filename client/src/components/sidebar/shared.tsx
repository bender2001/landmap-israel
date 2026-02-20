/**
 * Shared styled-components used across multiple sidebar sub-files.
 * These are local to the sidebar module and NOT part of the DS.
 */
import styled, { css, keyframes } from 'styled-components'
import { media } from '../../styles/theme'
import { CardLift } from '../../styles/shared'

/* ── Keyframes ─────────────────────────────────────────────── */

export const pulseAnim = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`

export const pulseGoldAnim = keyframes`
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(200,148,42,0.4); }
  50% { opacity: 0.8; box-shadow: 0 0 8px 4px rgba(200,148,42,0); }
`

const spinAnim = keyframes`
  to { transform: rotate(360deg); }
`

const staggerFadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`

/* ── Stagger wrapper ───────────────────────────────────────── */

export const StaggerIn = styled.div<{ $delay?: number }>`
  animation: ${staggerFadeIn} 0.4s ease both;
  animation-delay: ${({ $delay = 0 }) => $delay * 0.06}s;
`

/* ── Skeleton ──────────────────────────────────────────────── */

export const SkeletonPulse = styled.div<{ $w?: string; $h?: string; $rounded?: string }>`
  width: ${({ $w }) => $w || '100%'};
  height: ${({ $h }) => $h || '12px'};
  border-radius: ${({ $rounded }) => $rounded || '8px'};
  background: rgba(51, 65, 85, 0.3);
  animation: ${pulseAnim} 2s ease infinite;
`

/* ── Spinner ───────────────────────────────────────────────── */

export const SpinnerWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
`

export const SpinnerCircle = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  border: 2px solid rgba(200, 148, 42, 0.3);
  border-top-color: ${({ theme }) => theme.colors.gold};
  animation: ${spinAnim} 0.6s linear infinite;
`

export function SectionSpinner() {
  return (
    <SpinnerWrap>
      <SpinnerCircle />
    </SpinnerWrap>
  )
}

/* ── Info / Tag badges ─────────────────────────────────────── */

export const InfoBadge = styled.span<{ $bg?: string; $color?: string; $border?: string; $size?: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ $size }) => $size === 'sm' ? '4px' : '6px'};
  padding: ${({ $size }) => $size === 'sm' ? '2px 8px' : '4px 10px'};
  border-radius: ${({ $size }) => $size === 'sm' ? '8px' : '12px'};
  font-size: ${({ $size }) => $size === 'sm' ? '11px' : '12px'};
  color: ${({ $color, theme }) => $color || theme.colors.slate[400]};
  background: ${({ $bg }) => $bg || 'rgba(255,255,255,0.05)'};
  border: ${({ $border }) => $border ? `1px solid ${$border}` : 'none'};
  font-weight: ${({ $border }) => $border ? '500' : 'normal'};
`

export const StatusDot = styled.span<{ $color: string; $size?: number }>`
  width: ${({ $size }) => $size || 8}px;
  height: ${({ $size }) => $size || 8}px;
  border-radius: 9999px;
  background: ${({ $color }) => $color};
  animation: ${pulseAnim} 2s ease infinite;
`

export const TagBadge = styled.span<{ $bg: string; $border?: string; $color: string; $size?: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ $size }) => $size === 'sm' ? '4px' : '6px'};
  padding: ${({ $size }) => $size === 'sm' ? '2px 8px' : '2px 10px'};
  border-radius: 9999px;
  font-size: ${({ $size }) => $size === 'sm' ? '10px' : '11px'};
  font-weight: 500;
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $border, $bg }) => $border || $bg};
  color: ${({ $color }) => $color};
`

/* ── Alert cards ───────────────────────────────────────────── */

export const AlertCard = styled.div<{ $bg: string; $border: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 16px;
  padding: 12px;
  border: 1px solid ${({ $border }) => $border};
  background: ${({ $bg }) => $bg};
`

export const AlertIconBox = styled.div<{ $bg: string }>`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radii.xl};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
  background: ${({ $bg }) => $bg};
`

export const SmallAlertIconBox = styled(AlertIconBox)`
  width: 36px;
  height: 36px;
  font-size: 16px;
`

/* ── Section-level styled panels ───────────────────────────── */

export const GoldPanel = styled.div`
  background: linear-gradient(to right, rgba(200,148,42,0.05), rgba(200,148,42,0.1));
  border: 1px solid rgba(200, 148, 42, 0.2);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 8px;
`

export const GoldPanelSm = styled(GoldPanel)`
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 12px;
  margin-bottom: 12px;
`

export const ContextPanel = styled.div`
  background: linear-gradient(to right, rgba(10,22,40,0.5), rgba(10,22,40,0.6));
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 16px;
  margin-top: 12px;
`

export const SummaryCard = styled.div`
  background: linear-gradient(to right, rgba(10,22,40,0.6), rgba(10,22,40,0.4));
  border: 1px solid rgba(200, 148, 42, 0.15);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
`

/* ── Grid helpers ──────────────────────────────────────────── */

export const Grid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`

export const Grid3 = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 12px;
`

export const Grid2Gap2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`

/* ── Dividers ──────────────────────────────────────────────── */

export const GoldDivider = styled.div`
  height: 1px;
  margin: 24px 0;
  background: linear-gradient(90deg, transparent, rgba(200,148,42,0.2) 20%, rgba(200,148,42,0.35) 50%, rgba(200,148,42,0.2) 80%, transparent);
`

export const ThinDivider = styled.div`
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
  margin: 4px 0;
`

/* ── Progress bars ─────────────────────────────────────────── */

export const ProgressBar = styled.div`
  height: 10px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

export const ProgressFill = styled.div<{ $width: string; $bg: string }>`
  height: 100%;
  border-radius: 9999px;
  width: ${({ $width }) => $width};
  background: ${({ $bg }) => $bg};
  transition: all 0.7s ease;
`

/* ── Comparison bars ───────────────────────────────────────── */

export const CompBarTrack = styled.div`
  position: relative;
  height: 10px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

export const CompBarFill = styled.div<{ $width: string; $bg: string; $dir?: string }>`
  position: absolute;
  top: 0;
  ${({ $dir }) => $dir === 'left' ? 'left: 0;' : 'right: 0;'}
  height: 100%;
  border-radius: 9999px;
  width: ${({ $width }) => $width};
  background: ${({ $bg }) => $bg};
  transition: all 0.7s;
`

/* ── Mini bar ──────────────────────────────────────────────── */

export const MiniBar = styled.div`
  flex: 1;
  max-width: 50px;
  margin-right: auto;
`

export const MiniBarTrack = styled.div`
  position: relative;
  width: 100%;
  height: 4px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

export const MiniBarFill = styled.div<{ $width: string; $bg: string }>`
  position: absolute;
  inset: 0;
  left: 0;
  border-radius: 9999px;
  width: ${({ $width }) => $width};
  background: ${({ $bg }) => $bg};
  transition: all 0.5s;
`

/* ── Misc ──────────────────────────────────────────────────── */

export const RangeInput = styled.input`
  width: 100%;
  height: 6px;
  border-radius: 9999px;
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  accent-color: ${({ theme }) => theme.colors.gold};
  cursor: pointer;
`

export const BadgeRow = styled.div<{ $mobile?: boolean }>`
  display: ${({ $mobile }) => $mobile ? 'flex' : 'none'};
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ $mobile }) => $mobile ? '6px' : '8px'};
  margin-top: ${({ $mobile }) => $mobile ? '6px' : '8px'};

  ${media.sm} {
    display: ${({ $mobile }) => $mobile ? 'none' : 'flex'};
  }
`

export const MobileOnlyBlock = styled.div`
  display: block;
  padding: 8px 16px 4px;
  ${media.sm} { display: none; }
`

export const ScenarioRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
`

export const AltBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const BuildableCell = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 8px;
  text-align: center;
`

export const RiskSegment = styled.div<{ $active?: boolean; $level?: number }>`
  height: 6px;
  flex: 1;
  border-radius: 9999px;
  transition: background 0.2s;
  background: ${({ $active, $level }) => {
    if (!$active) return 'rgba(255,255,255,0.06)'
    if ($level && $level <= 2) return '#22C55E'
    if ($level && $level <= 3) return '#F59E0B'
    return '#EF4444'
  }};
`

export const FooterRow = styled.div`
  margin-top: 24px;
  margin-bottom: 8px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
`
