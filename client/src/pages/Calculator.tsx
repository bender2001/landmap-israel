import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { ArrowRight, Calculator as CalcIcon, TrendingUp, Building, Banknote } from 'lucide-react'
import { t, media } from '../theme'
import { fmt, calcMonthly } from '../utils'
import { GoldButton } from '../components/UI'

const fadeIn = keyframes`from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); }`
const Page = styled.div`min-height: 100vh; background: ${t.colors.bg}; padding: 24px;`
const Container = styled.div`max-width: 700px; margin: 0 auto;`
const BackLink = styled(Link)`display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: ${t.colors.textDim}; text-decoration: none; margin-bottom: 20px; &:hover { color: ${t.colors.gold}; }`
const Title = styled.h1`font-size: 24px; font-weight: 800; color: ${t.colors.text}; margin-bottom: 8px;`
const Sub = styled.p`font-size: 14px; color: ${t.colors.textSec}; margin-bottom: 32px;`

const Card = styled.div`
  background: ${t.colors.surface}; border: 1px solid ${t.colors.border};
  border-radius: ${t.radius.lg}; padding: 24px; margin-bottom: 20px;
  animation: ${fadeIn} 0.4s ease;
`
const Grid = styled.div`display: grid; grid-template-columns: 1fr 1fr; gap: 16px; ${media.mobile} { grid-template-columns: 1fr; }`
const Field = styled.div`display: flex; flex-direction: column; gap: 4px;`
const Label = styled.label`font-size: 12px; font-weight: 600; color: ${t.colors.textDim};`
const Input = styled.input`
  padding: 10px 12px; border-radius: ${t.radius.sm};
  border: 1px solid ${t.colors.border}; background: ${t.colors.surfaceHover};
  color: ${t.colors.text}; font-size: 14px; font-family: ${t.font}; outline: none;
  &:focus { border-color: ${t.colors.gold}; }
`
const Select = styled.select`
  padding: 10px; border-radius: ${t.radius.sm};
  border: 1px solid ${t.colors.border}; background: ${t.colors.surfaceHover};
  color: ${t.colors.text}; font-size: 14px; font-family: ${t.font}; outline: none;
`
const Slider = styled.input`width: 100%; accent-color: ${t.colors.gold};`

const ResultsGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;
  margin-top: 20px;
`
const ResultCard = styled.div<{ $accent?: boolean }>`
  padding: 16px; border-radius: ${t.radius.md};
  background: ${({ $accent }) => $accent ? `linear-gradient(135deg, ${t.colors.gold}15, ${t.colors.goldBright}08)` : t.colors.surfaceHover};
  border: 1px solid ${({ $accent }) => $accent ? t.colors.goldBorder : t.colors.border};
  text-align: center; animation: ${fadeIn} 0.3s ease both;
`
const RLabel = styled.div`font-size: 11px; color: ${t.colors.textDim}; margin-bottom: 6px;`
const RValue = styled.div<{ $color?: string }>`font-size: 20px; font-weight: 800; color: ${({ $color }) => $color || t.colors.text}; font-variant-numeric: tabular-nums;`

export default function Calculator() {
  const [price, setPrice] = useState(400000)
  const [projected, setProjected] = useState(1200000)
  const [years, setYears] = useState(5)
  const [ltv, setLtv] = useState(50)
  const [rate, setRate] = useState(6)

  const results = useMemo(() => {
    const grossProfit = projected - price
    const totalRoi = price > 0 ? ((projected - price) / price) * 100 : 0
    const cagr = years > 0 ? (Math.pow(1 + totalRoi / 100, 1 / years) - 1) * 100 : 0
    const purchaseTax = Math.round(price * 0.06)
    const attorney = Math.round(price * 0.0175)
    const totalInvestment = price + purchaseTax + attorney
    const betterment = Math.round(grossProfit * 0.5)
    const capGains = Math.round(Math.max(0, grossProfit - betterment) * 0.25)
    const netProfit = grossProfit - purchaseTax - attorney - betterment - capGains
    const monthly = calcMonthly(price, ltv / 100, rate / 100, 15)
    return { grossProfit, totalRoi, cagr, purchaseTax, attorney, totalInvestment, betterment, capGains, netProfit, monthly }
  }, [price, projected, years, ltv, rate])

  return (
    <Page>
      <Container>
        <BackLink to="/"><ArrowRight size={15} /> חזרה למפה</BackLink>
        <Title>🧮 מחשבון השקעה</Title>
        <Sub>חשב תשואה, עלויות, ומימון להשקעת קרקע</Sub>

        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: t.colors.text, marginBottom: 16 }}>פרטי השקעה</h3>
          <Grid>
            <Field>
              <Label>מחיר רכישה (₪)</Label>
              <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
            </Field>
            <Field>
              <Label>שווי חזוי (₪)</Label>
              <Input type="number" value={projected} onChange={e => setProjected(Number(e.target.value))} />
            </Field>
            <Field>
              <Label>אופק השקעה (שנים): {years}</Label>
              <Slider type="range" min={1} max={15} value={years} onChange={e => setYears(Number(e.target.value))} />
            </Field>
            <Field>
              <Label>אחוז מימון: {ltv}%</Label>
              <Slider type="range" min={0} max={75} step={5} value={ltv} onChange={e => setLtv(Number(e.target.value))} />
            </Field>
          </Grid>
        </Card>

        <ResultsGrid>
          <ResultCard $accent>
            <RLabel>תשואה כוללת</RLabel>
            <RValue $color={t.colors.success}>+{results.totalRoi.toFixed(0)}%</RValue>
          </ResultCard>
          <ResultCard>
            <RLabel>צמיחה שנתית</RLabel>
            <RValue>{results.cagr.toFixed(1)}%</RValue>
          </ResultCard>
          <ResultCard>
            <RLabel>רווח גולמי</RLabel>
            <RValue>{fmt.compact(results.grossProfit)}</RValue>
          </ResultCard>
          <ResultCard $accent>
            <RLabel>רווח נקי</RLabel>
            <RValue $color={results.netProfit > 0 ? t.colors.success : t.colors.danger}>{fmt.compact(results.netProfit)}</RValue>
          </ResultCard>
        </ResultsGrid>

        <Card style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: t.colors.text, marginBottom: 16 }}>פירוט עלויות</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['מס רכישה (6%)', fmt.price(results.purchaseTax)],
              ['שכ"ט עו"ד (1.75%)', fmt.price(results.attorney)],
              ['סה"כ השקעה נדרשת', fmt.price(results.totalInvestment)],
              ['היטל השבחה (50%)', fmt.price(results.betterment)],
              ['מס שבח (25%)', fmt.price(results.capGains)],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, borderBottom: `1px solid ${t.colors.border}` }}>
                <span style={{ color: t.colors.textDim }}>{label}</span>
                <span style={{ fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
          {results.monthly && (
            <div style={{ marginTop: 16, padding: 12, background: t.colors.surfaceHover, borderRadius: t.radius.sm }}>
              <div style={{ fontSize: 11, color: t.colors.textDim, marginBottom: 4 }}>החזר חודשי ({ltv}% מימון)</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: t.colors.goldBright }}>₪{results.monthly.monthly.toLocaleString()}/חודש</div>
            </div>
          )}
        </Card>
      </Container>
    </Page>
  )
}
