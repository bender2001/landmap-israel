import styled from 'styled-components'
import type { Plot } from '../../../types'

const PLOT_COLORS = ['#3B82F6', '#22C55E', '#F59E0B']

const BarChartWrap = styled.div`margin-bottom: 24px;`
const BarChartLabel = styled.div`font-size: 12px; font-weight: 500; color: ${({ theme }) => theme.colors.textSecondary}; margin-bottom: 8px;`
const BarChartStack = styled.div`display: flex; flex-direction: column; gap: 8px;`
const BarRow = styled.div`display: flex; align-items: center; gap: 12px;`
const BarPlotId = styled.span`font-size: 10px; color: ${({ theme }) => theme.colors.textTertiary}; width: 64px; text-align: left; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`
const BarTrack = styled.div`flex: 1; height: 24px; border-radius: ${({ theme }) => theme.radii.md}; background: ${({ theme }) => theme.colors.bgTertiary}; overflow: hidden; position: relative;`
const BarFill = styled.div<{ $width: number; $color: string; $isBest: boolean }>`
  height: 100%; border-radius: ${({ theme }) => theme.radii.md}; transition: all 0.7s ease-out;
  display: flex; align-items: center; justify-content: flex-end; padding: 0 8px;
  width: ${({ $width }) => Math.max($width, 8)}%;
  background: ${({ $color }) => `linear-gradient(90deg, ${$color}30, ${$color}90)`};
  border-right: ${({ $isBest, $color }) => $isBest ? `3px solid ${$color}` : 'none'};
`
const BarValueText = styled.span<{ $isBest: boolean }>`font-size: 10px; font-weight: 700; color: ${({ $isBest, theme }) => $isBest ? theme.colors.text : theme.colors.textSecondary};`
const BestCrown = styled.span`font-size: 9px; color: ${({ theme }) => theme.colors.primary}; font-weight: 700; flex-shrink: 0;`

interface CompareBarChartProps {
  plots: Plot[]; label: string; getter: (plot: Plot) => number | null | undefined
  formatter?: (val: number) => string; unit?: string; mode?: 'higher-better' | 'lower-better'
}

export default function CompareBarChart({ plots, label, getter, formatter, unit = '', mode = 'higher-better' }: CompareBarChartProps) {
  const values = plots.map(getter).filter((v): v is number => v != null)
  if (values.length === 0) return null
  const maxVal = Math.max(...values, 1)
  return (
    <BarChartWrap>
      <BarChartLabel>{label}</BarChartLabel>
      <BarChartStack>
        {plots.map((plot, i) => {
          const val = getter(plot)
          if (val == null) return null
          const pct = (val / maxVal) * 100
          const blockNum = plot.block_number ?? plot.blockNumber
          const isBest = mode === 'higher-better' ? val === Math.max(...values) : val === Math.min(...values)
          return (
            <BarRow key={plot.id}>
              <BarPlotId>{blockNum}/{plot.number}</BarPlotId>
              <BarTrack>
                <BarFill $width={pct} $color={PLOT_COLORS[i]} $isBest={isBest}>
                  <BarValueText $isBest={isBest}>{formatter ? formatter(val) : val.toLocaleString()}{unit}</BarValueText>
                </BarFill>
              </BarTrack>
              {isBest && <BestCrown>{'\uD83D\uDC51'}</BestCrown>}
            </BarRow>
          )
        })}
      </BarChartStack>
    </BarChartWrap>
  )
}
