import { useState, useMemo } from 'react'
import styled, { keyframes } from 'styled-components'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  X,
  ArrowLeft,
  Share2,
  Check,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  Ruler,
  Clock,
  DollarSign,
  Award,
} from 'lucide-react'
import { statusColors, statusLabels } from '../utils/constants'
import { formatPriceShort, formatMonthlyPayment } from '../utils/format'
import { calcInvestmentScore, getInvestmentGrade, calcMonthlyPayment } from '../utils/investment'
import { showToast } from './ui/ToastContainer'
import { theme, media } from '../styles/theme'
import type { Plot } from '../types'

interface CompareBarProps {
  compareIds: Array<string | number>
  plots: Plot[]
  onRemove: (id: string | number) => void
  onClear: () => void
}

interface QuickComparisonGridProps {
  plots: Plot[]
}

interface MetricValue {
  text: string
  isBest?: boolean
  color?: string
}

interface MetricRow {
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  values: MetricValue[]
}

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

const BarWrap = styled.div`
  position: fixed;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  z-index: ${theme.zIndex.filterBar};
  width: min(860px, calc(100% - 24px));
`

const BarInner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(10, 22, 40, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: ${theme.radii.xl};
  box-shadow: ${theme.shadows.elevated};
  backdrop-filter: blur(14px);
`

const Label = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

const LabelText = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${theme.colors.slate[200]};
`

const ToggleButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: rgba(229, 185, 78, 0.7);
  background: transparent;
  border: none;
  padding: 4px 6px;
  border-radius: ${theme.radii.sm};
  transition: ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.gold};
    background: rgba(200, 148, 42, 0.1);
  }

  span {
    display: none;
  }

  ${media.sm} {
    span {
      display: inline;
    }
  }
`

const Chips = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
`

const Chip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: ${theme.radii.md};
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  min-width: 0;
`

const ChipText = styled.span`
  font-size: 11px;
  color: ${theme.colors.slate[300]};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ChipDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: ${theme.radii.full};
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const ChipRemove = styled.button`
  width: 16px;
  height: 16px;
  border-radius: ${theme.radii.full};
  background: rgba(255, 255, 255, 0.1);
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: ${theme.transitions.fast};
  flex-shrink: 0;

  &:hover {
    background: rgba(239, 68, 68, 0.3);
  }
`

const ChipEmpty = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: ${theme.radii.md};
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.08);
  color: ${theme.colors.slate[600]};
  font-size: 10px;
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

const TextButton = styled.button`
  font-size: 11px;
  color: ${theme.colors.slate[500]};
  background: transparent;
  border: none;
  transition: ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.red};
  }
`

const ShareButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: ${theme.colors.slate[400]};
  padding: 4px 8px;
  border-radius: ${theme.radii.md};
  background: transparent;
  border: none;
  transition: ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.gold};
    background: rgba(255, 255, 255, 0.05);
  }

  span {
    display: none;
  }

  ${media.sm} {
    span {
      display: inline;
    }
  }
`

const CTAButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: ${theme.radii.lg};
  background: ${theme.gradients.gold};
  color: ${theme.colors.navy};
  font-weight: 700;
  font-size: 12px;
  border: none;
  transition: ${theme.transitions.normal};

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const GridWrap = styled.div`
  margin-top: 8px;
  overflow-x: auto;
`

const GridTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
`

const GridHead = styled.thead``

const GridHeaderCell = styled.th`
  padding: 6px 4px;
  text-align: center;
  font-weight: 500;
  min-width: 80px;
  color: ${theme.colors.slate[300]};
`

const GridLabelCell = styled.th`
  padding: 6px 8px 6px 0;
  text-align: right;
  width: 64px;
  color: ${theme.colors.slate[500]};
  font-weight: 500;
`

const GridRow = styled.tr`
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);

  &:last-child {
    border-bottom: none;
  }
`

const GridCell = styled.td`
  padding: 4px 6px;
  text-align: center;
  white-space: nowrap;
`

const ValueText = styled.span<{ $isBest?: boolean; $color?: string }>`
  color: ${({ $color }) => $color || theme.colors.slate[400]};
  font-weight: ${({ $isBest }) => ($isBest ? 700 : 500)};
`

const ExpandedPanel = styled.div`
  padding: 6px 12px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  animation: ${slideUp} 0.2s ease;
`

function QuickComparisonGrid({ plots }: QuickComparisonGridProps) {
  if (plots.length < 2) return null

  const metrics = useMemo<MetricRow[]>(() => {
    const rows: MetricRow[] = []

    const prices = plots.map((p) => p.total_price ?? p.totalPrice ?? 0)
    const minPrice = Math.min(...prices.filter((v) => v > 0))
    rows.push({
      label: 'מחיר',
      icon: DollarSign,
      values: plots.map((p, i) => ({
        text: formatPriceShort(prices[i]),
        isBest: prices[i] === minPrice && prices[i] > 0,
      })),
    })

    const rois = plots.map((p) => {
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      return price > 0 ? Math.round(((proj - price) / price) * 100) : 0
    })
    const maxRoi = Math.max(...rois)
    rows.push({
      label: 'תשואה',
      icon: TrendingUp,
      values: plots.map((p, i) => ({
        text: `+${rois[i]}%`,
        isBest: rois[i] === maxRoi && rois[i] > 0,
      })),
    })

    const sizes = plots.map((p) => (p.size_sqm ?? p.sizeSqM ?? 0) / 1000)
    const maxSize = Math.max(...sizes)
    rows.push({
      label: 'שטח',
      icon: Ruler,
      values: plots.map((p, i) => ({
        text: `${sizes[i].toFixed(1)} דונם`,
        isBest: sizes[i] === maxSize && sizes[i] > 0,
      })),
    })

    const priceDunams = plots.map((p, i) => {
      const size = sizes[i]
      return size > 0 ? Math.round(prices[i] / size) : 0
    })
    const minPpd = Math.min(...priceDunams.filter((v) => v > 0))
    rows.push({
      label: '₪/דונם',
      icon: BarChart3,
      values: plots.map((p, i) => ({
        text: priceDunams[i] > 0 ? `₪${priceDunams[i].toLocaleString()}` : '—',
        isBest: priceDunams[i] === minPpd && priceDunams[i] > 0,
      })),
    })

    const monthlies = plots.map((p) => {
      const price = p.total_price ?? p.totalPrice ?? 0
      const payment = calcMonthlyPayment(price)
      return payment ? payment.monthly : 0
    })
    const minMonthly = Math.min(...monthlies.filter((v) => v > 0))
    rows.push({
      label: 'חודשי',
      icon: Clock,
      values: plots.map((p, i) => ({
        text: monthlies[i] > 0 ? formatMonthlyPayment(monthlies[i]) : '—',
        isBest: monthlies[i] === minMonthly && monthlies[i] > 0,
      })),
    })

    const scores = plots.map((p) => p._investmentScore ?? calcInvestmentScore(p))
    const maxScore = Math.max(...scores)
    rows.push({
      label: 'דירוג',
      icon: Award,
      values: plots.map((p, i) => {
        const { grade, color } = getInvestmentGrade(scores[i])
        return {
          text: `${grade} (${scores[i]}/10)`,
          isBest: scores[i] === maxScore,
          color,
        }
      }),
    })

    return rows
  }, [plots])

  return (
    <GridWrap>
      <GridTable>
        <GridHead>
          <GridRow>
            <GridLabelCell />
            {plots.map((plot) => {
              const blockNum = plot.block_number ?? plot.blockNumber
              const color = statusColors[plot.status]
              return (
                <GridHeaderCell key={plot.id}>
                  <span style={{ color: theme.colors.slate[300] }}>{blockNum}/{plot.number}</span>
                  <br />
                  <span style={{ color, fontSize: 8, fontWeight: 400 }}>
                    {statusLabels[plot.status]}
                  </span>
                </GridHeaderCell>
              )
            })}
          </GridRow>
        </GridHead>
        <tbody>
          {metrics.map((row, ri) => {
            const Icon = row.icon
            return (
              <GridRow key={ri}>
                <GridLabelCell>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span>{row.label}</span>
                    <Icon size={10} style={{ opacity: 0.6 }} />
                  </span>
                </GridLabelCell>
                {row.values.map((val, ci) => (
                  <GridCell key={ci}>
                    <ValueText $isBest={val.isBest} $color={val.color || (val.isBest ? theme.colors.gold : undefined)}>
                      {val.text}
                      {val.isBest && <span style={{ marginInlineStart: 4, fontSize: 8 }}>👑</span>}
                    </ValueText>
                  </GridCell>
                ))}
              </GridRow>
            )
          })}
        </tbody>
      </GridTable>
    </GridWrap>
  )
}

export default function CompareBar({ compareIds, plots, onRemove, onClear }: CompareBarProps) {
  const navigate = useNavigate()
  const [linkCopied, setLinkCopied] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  if (!compareIds || compareIds.length === 0) return null

  const comparePlots = compareIds
    .map((id) => plots.find((p) => p.id === id))
    .filter((plot): plot is Plot => Boolean(plot))

  return (
    <BarWrap dir="rtl">
      <BarInner>
        <Label>
          <BarChart3 size={16} color={theme.colors.gold} />
          <LabelText>השוואה ({comparePlots.length}/3)</LabelText>
          {comparePlots.length >= 2 && (
            <ToggleButton
              onClick={() => setIsExpanded((prev) => !prev)}
              title={isExpanded ? 'הסתר השוואה מהירה' : 'הצג השוואה מהירה'}
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
              <span>{isExpanded ? 'הסתר' : 'השוואה מהירה'}</span>
            </ToggleButton>
          )}
        </Label>

        <Chips>
          {comparePlots.map((plot) => {
            const color = statusColors[plot.status]
            const blockNum = plot.block_number ?? plot.blockNumber
            const price = plot.total_price ?? plot.totalPrice
            return (
              <Chip key={plot.id} style={{ borderColor: `${color}40` }}>
                <ChipDot $color={color} />
                <ChipText>
                  {blockNum}/{plot.number} · {formatPriceShort(price)}
                </ChipText>
                <ChipRemove
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(plot.id)
                  }}
                  aria-label="הסר"
                >
                  <X size={10} color={theme.colors.slate[400]} />
                </ChipRemove>
              </Chip>
            )
          })}

          {Array.from({ length: 3 - comparePlots.length }).map((_, i) => (
            <ChipEmpty key={`empty-${i}`}>+ בחר חלקה</ChipEmpty>
          ))}
        </Chips>

        <Actions>
          <TextButton onClick={onClear}>נקה</TextButton>
          {comparePlots.length >= 2 && (
            <ShareButton
              onClick={() => {
                const url = `${window.location.origin}/compare?plots=${compareIds.join(',')}`
                navigator.clipboard
                  .writeText(url)
                  .then(() => {
                    setLinkCopied(true)
                    showToast('🔗 קישור ההשוואה הועתק — שלח למשקיע אחר', 'success')
                    setTimeout(() => setLinkCopied(false), 2000)
                  })
                  .catch(() => {
                    showToast('לא הצלחנו להעתיק את הקישור', 'error')
                  })
              }}
              title="העתק קישור להשוואה"
            >
              {linkCopied ? <Check size={12} color={theme.colors.emerald} /> : <Share2 size={12} />}
              <span>{linkCopied ? 'הועתק!' : 'שתף'}</span>
            </ShareButton>
          )}
          <CTAButton
            onClick={() => navigate(`/compare?plots=${compareIds.join(',')}`)}
            disabled={comparePlots.length < 2}
          >
            <span>השווה</span>
            <ArrowLeft size={14} />
          </CTAButton>
        </Actions>
      </BarInner>

      {isExpanded && comparePlots.length >= 2 && (
        <ExpandedPanel>
          <QuickComparisonGrid plots={comparePlots} />
        </ExpandedPanel>
      )}
    </BarWrap>
  )
}
