import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { ArrowRight, X, Plus } from 'lucide-react'
import { t, media } from '../theme'
import { useCompare, usePlotsBatch } from '../hooks'
import { Spinner, Badge, GoldButton, GhostButton } from '../components/UI'
import { fmt, p, roi, calcScore, getGrade, statusLabels, statusColors, zoningLabels } from '../utils'
import type { Plot } from '../types'

const fadeIn = keyframes`from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); }`
const Page = styled.div`min-height: 100vh; background: ${t.colors.bg}; padding: 24px;`
const Container = styled.div`max-width: 960px; margin: 0 auto;`
const BackLink = styled(Link)`display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: ${t.colors.textDim}; text-decoration: none; margin-bottom: 20px; &:hover { color: ${t.colors.gold}; }`
const Title = styled.h1`font-size: 24px; font-weight: 800; color: ${t.colors.text}; margin-bottom: 8px;`
const Sub = styled.p`font-size: 14px; color: ${t.colors.textSec}; margin-bottom: 32px;`
const Empty = styled.div`text-align: center; padding: 60px 20px; color: ${t.colors.textDim};`

const Table = styled.div`
  background: ${t.colors.surface}; border: 1px solid ${t.colors.border};
  border-radius: ${t.radius.lg}; overflow: hidden;
  animation: ${fadeIn} 0.4s ease;
`
const TRow = styled.div<{ $header?: boolean }>`
  display: grid; grid-template-columns: 140px repeat(3, 1fr);
  ${({ $header }) => $header && `background: ${t.colors.surfaceHover}; font-weight: 600; font-size: 13px;`}
  &:not(:last-child) { border-bottom: 1px solid ${t.colors.border}; }
  ${media.mobile} { grid-template-columns: 100px repeat(3, 1fr); }
`
const TCell = styled.div<{ $label?: boolean; $highlight?: boolean }>`
  padding: 10px 12px; font-size: 13px;
  color: ${({ $label }) => $label ? t.colors.textDim : t.colors.text};
  ${({ $highlight }) => $highlight && `color: ${t.colors.goldBright}; font-weight: 700;`}
  display: flex; align-items: center; gap: 4px;
  ${media.mobile} { padding: 8px; font-size: 11px; }
`
const RemoveBtn = styled.button`
  width: 20px; height: 20px; border-radius: 50%; border: none;
  background: rgba(239,68,68,0.1); color: #EF4444; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; transition: all ${t.transition};
  &:hover { background: rgba(239,68,68,0.2); }
`
const Best = styled.span`
  background: ${t.colors.success}18; color: ${t.colors.success};
  padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;
  margin-right: 4px;
`

export default function Compare() {
  const { ids, toggle, clear } = useCompare()
  const { data: plots = [], isLoading } = usePlotsBatch(ids)

  const rows = useMemo(() => {
    if (!(plots as Plot[]).length) return []
    const list = plots as Plot[]
    const prices = list.map(pl => pl.total_price ?? pl.totalPrice ?? 0)
    const rois = list.map(pl => roi(pl))
    const sizes = list.map(pl => pl.size_sqm ?? pl.sizeSqM ?? 0)
    const scores = list.map(pl => calcScore(pl))
    const minPrice = Math.min(...prices)
    const maxRoi = Math.max(...rois)
    const maxSize = Math.max(...sizes)
    const maxScore = Math.max(...scores)

    return [
      { label: 'עיר', values: list.map(pl => pl.city || '') },
      { label: 'מחיר', values: list.map((pl, i) => ({ text: fmt.compact(prices[i]), best: prices[i] === minPrice })) },
      { label: 'שטח', values: list.map((pl, i) => ({ text: `${fmt.dunam(sizes[i])} דונם`, best: sizes[i] === maxSize })) },
      { label: 'תשואה', values: list.map((pl, i) => ({ text: `+${rois[i].toFixed(0)}%`, best: rois[i] === maxRoi })) },
      { label: 'ציון', values: list.map((pl, i) => ({ text: `${scores[i]}/10 (${getGrade(scores[i]).grade})`, best: scores[i] === maxScore })) },
      { label: 'שלב תכנוני', values: list.map(pl => zoningLabels[p(pl).zoning] || p(pl).zoning) },
      { label: 'סטטוס', values: list.map(pl => statusLabels[pl.status || 'AVAILABLE']) },
    ]
  }, [plots])

  const plotList = plots as Plot[]

  return (
    <Page>
      <Container>
        <BackLink to="/"><ArrowRight size={15} /> חזרה למפה</BackLink>
        <Title>📊 השוואת חלקות</Title>
        <Sub>{ids.length}/3 חלקות להשוואה {ids.length > 0 && <GhostButton onClick={clear} style={{ marginRight: 8, padding: '2px 8px', fontSize: 11 }}>נקה הכל</GhostButton>}</Sub>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spinner size={32} /></div>
        ) : ids.length === 0 ? (
          <Empty>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>אין חלקות להשוואה</p>
            <p style={{ marginBottom: 20 }}>הוסיפו חלקות מהמפה כדי להשוות ביניהן</p>
            <GoldButton as={Link} to="/" style={{ textDecoration: 'none' }}>חזרה למפה</GoldButton>
          </Empty>
        ) : (
          <Table>
            <TRow $header>
              <TCell></TCell>
              {plotList.map(pl => (
                <TCell key={pl.id} style={{ justifyContent: 'space-between' }}>
                  <Link to={`/plot/${pl.id}`} style={{ color: t.colors.gold, fontSize: 12 }}>גוש {p(pl).block} / {pl.number}</Link>
                  <RemoveBtn onClick={() => toggle(pl.id)}><X size={10} /></RemoveBtn>
                </TCell>
              ))}
              {plotList.length < 3 && <TCell style={{ color: t.colors.textDim, fontSize: 11 }}><Plus size={12} /> הוסף חלקה</TCell>}
            </TRow>
            {rows.map(row => (
              <TRow key={row.label}>
                <TCell $label>{row.label}</TCell>
                {row.values.map((val, i) => (
                  <TCell key={i} $highlight={typeof val === 'object' && val.best}>
                    {typeof val === 'object' ? (
                      <>{val.best && <Best>הכי טוב</Best>}{val.text}</>
                    ) : val}
                  </TCell>
                ))}
                {plotList.length < 3 && <TCell />}
              </TRow>
            ))}
          </Table>
        )}
      </Container>
    </Page>
  )
}
