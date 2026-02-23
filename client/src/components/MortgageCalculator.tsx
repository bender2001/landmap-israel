import { useState, useCallback, useMemo, useEffect, memo } from 'react'
import styled, { keyframes } from 'styled-components'
import { Calculator, X, ChevronDown, ChevronUp, TrendingUp, DollarSign, Clock, Percent, PiggyBank, BarChart3 } from 'lucide-react'
import { t, mobile } from '../theme'
import { fmt, calcMonthly } from '../utils'

/* ── Animations ── */
const slideUp = keyframes`from{opacity:0;transform:translateY(24px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}`
const fadeIn = keyframes`from{opacity:0}to{opacity:1}`
const pulseGold = keyframes`0%,100%{box-shadow:0 0 0 0 rgba(212,168,75,0.25)}50%{box-shadow:0 0 0 8px rgba(212,168,75,0)}`

/* ── Styled ── */
const Backdrop = styled.div<{ $open: boolean }>`
  position:fixed;inset:0;z-index:${t.z.modal - 5};
  background:rgba(0,0,0,0.3);backdrop-filter:blur(4px);
  opacity:${pr => pr.$open ? 1 : 0};pointer-events:${pr => pr.$open ? 'auto' : 'none'};
  transition:opacity 0.3s;
`

const Panel = styled.div<{ $open: boolean }>`
  position:fixed;bottom:0;left:50%;transform:translateX(-50%);
  z-index:${t.z.modal - 4};
  width:min(480px, calc(100vw - 24px));max-height:80vh;overflow-y:auto;
  background:${t.glass};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border:1px solid ${t.glassBorder};border-radius:${t.r.xl} ${t.r.xl} 0 0;
  box-shadow:${t.sh.xl};direction:rtl;
  animation:${slideUp} 0.35s cubic-bezier(0.32,0.72,0,1);
  display:${pr => pr.$open ? 'flex' : 'none'};flex-direction:column;
  &::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;
    background:linear-gradient(90deg,transparent,${t.gold},${t.goldBright},${t.gold},transparent);
    border-radius:${t.r.xl} ${t.r.xl} 0 0;}
  scrollbar-width:thin;
  &::-webkit-scrollbar{width:4px;}
  &::-webkit-scrollbar-thumb{background:${t.surfaceLight};border-radius:2px;}
  ${mobile}{width:100vw;border-radius:${t.r.xl} ${t.r.xl} 0 0;max-height:85vh;}
`

const Handle = styled.div`
  width:36px;height:4px;border-radius:2px;background:${t.textDim};
  margin:10px auto 6px;opacity:0.4;flex-shrink:0;
`

const Header = styled.div`
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 20px 12px;flex-shrink:0;
`

const Title = styled.h3`
  font-size:16px;font-weight:800;color:${t.text};margin:0;
  display:flex;align-items:center;gap:8px;font-family:${t.font};
`

const CloseBtn = styled.button`
  display:flex;align-items:center;justify-content:center;width:32px;height:32px;
  border-radius:${t.r.sm};background:transparent;border:1px solid ${t.border};
  color:${t.textSec};cursor:pointer;transition:all ${t.tr};
  &:hover{background:${t.hover};color:${t.text};border-color:${t.goldBorder};}
`

const Body = styled.div`padding:0 20px 20px;`

/* ── Slider Input ── */
const SliderGroup = styled.div`margin-bottom:18px;`
const SliderLabel = styled.div`
  display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;
`
const SliderName = styled.span`
  font-size:12px;font-weight:700;color:${t.textSec};
  display:flex;align-items:center;gap:6px;
`
const SliderValue = styled.span`
  font-size:14px;font-weight:800;color:${t.gold};
  min-width:80px;text-align:left;
`

const RangeInput = styled.input`
  width:100%;height:6px;border-radius:3px;appearance:none;outline:none;cursor:pointer;
  background:linear-gradient(to left, ${t.gold} var(--fill), ${t.surfaceLight} var(--fill));
  transition:background 0.2s;
  &::-webkit-slider-thumb{
    appearance:none;width:20px;height:20px;border-radius:50%;
    background:linear-gradient(135deg,${t.gold},${t.goldBright});border:2px solid ${t.bg};
    box-shadow:0 2px 8px rgba(212,168,75,0.4);cursor:pointer;transition:transform 0.15s;
  }
  &::-webkit-slider-thumb:hover{transform:scale(1.15);}
  &::-moz-range-thumb{
    width:18px;height:18px;border-radius:50%;border:2px solid ${t.bg};
    background:linear-gradient(135deg,${t.gold},${t.goldBright});cursor:pointer;
  }
  &::-moz-range-track{height:6px;border-radius:3px;background:${t.surfaceLight};}
`

const SliderMarks = styled.div`
  display:flex;justify-content:space-between;margin-top:4px;
`
const SliderMark = styled.span`font-size:9px;color:${t.textDim};`

/* ── Quick Preset Chips ── */
const PresetRow = styled.div`
  display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;
`
const PresetChip = styled.button<{$active:boolean}>`
  padding:5px 12px;border-radius:${t.r.full};font-size:11px;font-weight:700;font-family:${t.font};
  background:${pr=>pr.$active?t.goldDim:'transparent'};
  border:1px solid ${pr=>pr.$active?t.goldBorder:t.border};
  color:${pr=>pr.$active?t.gold:t.textSec};cursor:pointer;transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};color:${t.gold};}
`

/* ── Results ── */
const ResultsGrid = styled.div`
  display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:16px;
  padding-top:16px;border-top:1px solid ${t.border};
`
const ResultCard = styled.div<{$highlight?:boolean}>`
  display:flex;flex-direction:column;align-items:center;gap:4px;
  padding:14px 10px;background:${pr=>pr.$highlight?t.goldDim:t.surfaceLight};
  border:1px solid ${pr=>pr.$highlight?t.goldBorder:t.border};
  border-radius:${t.r.md};transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};transform:translateY(-1px);}
`
const ResultVal = styled.div<{$c?:string}>`
  font-size:18px;font-weight:900;color:${pr=>pr.$c||t.gold};
`
const ResultLabel = styled.div`
  font-size:10px;font-weight:600;color:${t.textDim};text-align:center;
`
const ResultSub = styled.div`font-size:9px;color:${t.textDim};opacity:0.7;`

/* ── Comparison Section ── */
const CompareSection = styled.div`
  margin-top:16px;padding:14px;
  background:${t.surfaceLight};border:1px solid ${t.border};border-radius:${t.r.md};
`
const CompareTitle = styled.div`
  font-size:12px;font-weight:700;color:${t.textSec};margin-bottom:10px;
  display:flex;align-items:center;gap:6px;
`
const CompareRow = styled.div<{$best?:boolean}>`
  display:flex;align-items:center;justify-content:space-between;
  padding:6px 0;border-bottom:1px solid ${t.border};
  &:last-child{border-bottom:none;}
  ${pr=>pr.$best?`background:${t.goldDim};margin:0 -8px;padding:6px 8px;border-radius:${t.r.sm};border-bottom:none;`:''};
`
const CompareName = styled.span<{$c?:string}>`
  font-size:11px;font-weight:${pr=>pr.$c?800:600};color:${pr=>pr.$c||t.textSec};
`
const CompareValue = styled.span<{$c?:string}>`
  font-size:12px;font-weight:800;color:${pr=>pr.$c||t.text};
`

/* ── Amortization Mini Chart ── */
function AmortizationChart({ principal, monthlyPayment, rate, years }: {
  principal: number; monthlyPayment: number; rate: number; years: number
}) {
  const data = useMemo(() => {
    const pts: { year: number; balance: number; totalPaid: number; totalInterest: number }[] = []
    let balance = principal
    let totalPaid = 0
    let totalInterest = 0
    const mr = rate / 12

    for (let y = 0; y <= years; y++) {
      pts.push({ year: y, balance: Math.max(0, balance), totalPaid, totalInterest })
      for (let m = 0; m < 12; m++) {
        if (balance <= 0) break
        const interest = balance * mr
        const principalPart = monthlyPayment - interest
        balance -= principalPart
        totalPaid += monthlyPayment
        totalInterest += interest
      }
    }
    return pts
  }, [principal, monthlyPayment, rate, years])

  const w = 400, h = 100, pad = 20
  const maxVal = Math.max(principal, data[data.length - 1]?.totalPaid || 0)

  const balancePath = data.map((pt, i) => {
    const x = pad + (i / years) * (w - pad * 2)
    const y = h - pad - ((pt.balance / maxVal) * (h - pad * 2))
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const paidPath = data.map((pt, i) => {
    const x = pad + (i / years) * (w - pad * 2)
    const y = h - pad - ((pt.totalPaid / maxVal) * (h - pad * 2))
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 80, marginTop: 12 }}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(pct => (
        <line key={pct} x1={pad} y1={h - pad - pct * (h - pad * 2)} x2={w - pad} y2={h - pad - pct * (h - pad * 2)}
          stroke={t.border} strokeWidth="0.5" strokeDasharray="3,3" />
      ))}
      {/* Balance line */}
      <path d={balancePath} fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      {/* Total paid line */}
      <path d={paidPath} fill="none" stroke={t.gold} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      {/* Labels */}
      <text x={pad} y={12} fontSize="8" fill={t.textDim} fontWeight="600" textAnchor="start">₪{fmt.compact(maxVal).replace('₪', '')}</text>
      <text x={pad} y={h - 4} fontSize="8" fill={t.textDim}>0</text>
      <text x={w - pad} y={h - 4} fontSize="8" fill={t.textDim} textAnchor="end">{years} שנה</text>
      {/* Legend */}
      <circle cx={w - pad - 100} cy={6} r="3" fill="#EF4444" />
      <text x={w - pad - 93} y={10} fontSize="8" fill={t.textDim}>יתרת חוב</text>
      <circle cx={w - pad - 50} cy={6} r="3" fill={t.gold} />
      <text x={w - pad - 43} y={10} fontSize="8" fill={t.textDim}>שולם</text>
    </svg>
  )
}

/* ── Trigger Button ── */
const TriggerBtn = styled.button<{$hasPlot:boolean}>`
  position:fixed;bottom:52px;left:16px;z-index:${t.z.filter + 1};
  display:flex;align-items:center;gap:6px;padding:10px 16px;
  background:${t.glass};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid ${t.goldBorder};border-radius:${t.r.full};
  color:${t.gold};font-size:12px;font-weight:700;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};box-shadow:${t.sh.md};
  ${pr=>pr.$hasPlot?`animation:${pulseGold} 3s ease-in-out 1;`:''}
  &:hover{background:${t.goldDim};transform:translateY(-2px);box-shadow:${t.sh.lg};}
  ${mobile}{bottom:100px;left:8px;padding:8px 14px;font-size:11px;}
`

/* ── Presets ── */
const TERM_PRESETS = [
  { years: 10, label: '10 שנים' },
  { years: 15, label: '15 שנים' },
  { years: 20, label: '20 שנים' },
  { years: 25, label: '25 שנים' },
  { years: 30, label: '30 שנים' },
]

const RATE_PRESETS = [
  { rate: 3.5, label: '3.5%' },
  { rate: 4.5, label: '4.5%' },
  { rate: 5.5, label: '5.5%' },
  { rate: 6.5, label: '6.5%' },
]

/* ── Component ── */
interface Props {
  plotPrice?: number
  plotLabel?: string
}

function MortgageCalculator({ plotPrice, plotLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [price, setPrice] = useState(plotPrice || 500000)
  const [downPct, setDownPct] = useState(30)
  const [rate, setRate] = useState(5.5)
  const [years, setYears] = useState(20)

  // Sync price from selected plot
  useEffect(() => {
    if (plotPrice && plotPrice > 0) setPrice(plotPrice)
  }, [plotPrice])

  const downPayment = Math.round(price * (downPct / 100))
  const loanAmount = price - downPayment
  const ltvFraction = 1 - (downPct / 100)

  const result = useMemo(() => calcMonthly(price, ltvFraction, rate / 100, years), [price, ltvFraction, rate, years])

  const totalPaid = result ? result.monthly * years * 12 : 0
  const totalInterest = totalPaid - loanAmount

  // Investment comparison: what if you invested the down payment instead?
  const alternatives = useMemo(() => {
    const invest = downPayment
    const stockReturn = invest * Math.pow(1.08, years) // ~8% annual S&P 500
    const bondReturn = invest * Math.pow(1.04, years) // ~4% bonds
    const bankReturn = invest * Math.pow(1.02, years) // ~2% savings
    return [
      { name: '🏠 נדל״ן (הקרקע הזו)', value: price * 1.5, color: t.gold, best: true },
      { name: '📈 מדד S&P 500', value: Math.round(stockReturn), color: '#10B981', best: false },
      { name: '📊 אגרות חוב', value: Math.round(bondReturn), color: '#3B82F6', best: false },
      { name: '🏦 פיקדון בנקאי', value: Math.round(bankReturn), color: '#94A3B8', best: false },
    ]
  }, [downPayment, years, price])

  const toggle = useCallback(() => setOpen(o => !o), [])

  const fillPct = (val: number, min: number, max: number) =>
    `${((val - min) / (max - min)) * 100}%`

  return (
    <>
      <TriggerBtn onClick={toggle} $hasPlot={!!plotPrice && plotPrice > 0} aria-label="מחשבון משכנתא">
        <Calculator size={16} />
        מחשבון משכנתא
        {plotPrice && plotPrice > 0 && (
          <span style={{ fontSize: 10, opacity: 0.7 }}>{fmt.compact(plotPrice)}</span>
        )}
      </TriggerBtn>

      <Backdrop $open={open} onClick={toggle} />
      <Panel $open={open} role="dialog" aria-label="מחשבון משכנתא">
        <Handle />
        <Header>
          <Title>
            <Calculator size={18} color={t.gold} />
            מחשבון משכנתא
          </Title>
          <CloseBtn onClick={toggle} aria-label="סגור"><X size={16} /></CloseBtn>
        </Header>
        <Body>
          {plotLabel && (
            <div style={{
              fontSize: 11, fontWeight: 600, color: t.textDim, marginBottom: 14,
              padding: '6px 12px', background: t.surfaceLight, borderRadius: t.r.full,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              📍 {plotLabel}
            </div>
          )}

          {/* Price Slider */}
          <SliderGroup>
            <SliderLabel>
              <SliderName><DollarSign size={14} color={t.textDim} /> מחיר הנכס</SliderName>
              <SliderValue>{fmt.compact(price)}</SliderValue>
            </SliderLabel>
            <RangeInput
              type="range" min={100000} max={10000000} step={50000} value={price}
              onChange={e => setPrice(Number(e.target.value))}
              style={{ '--fill': fillPct(price, 100000, 10000000) } as React.CSSProperties}
            />
            <SliderMarks>
              <SliderMark>₪100K</SliderMark>
              <SliderMark>₪5M</SliderMark>
              <SliderMark>₪10M</SliderMark>
            </SliderMarks>
          </SliderGroup>

          {/* Down Payment Slider */}
          <SliderGroup>
            <SliderLabel>
              <SliderName><PiggyBank size={14} color={t.textDim} /> הון עצמי ({downPct}%)</SliderName>
              <SliderValue>{fmt.compact(downPayment)}</SliderValue>
            </SliderLabel>
            <RangeInput
              type="range" min={10} max={80} step={5} value={downPct}
              onChange={e => setDownPct(Number(e.target.value))}
              style={{ '--fill': fillPct(downPct, 10, 80) } as React.CSSProperties}
            />
            <SliderMarks>
              <SliderMark>10%</SliderMark>
              <SliderMark>30%</SliderMark>
              <SliderMark>50%</SliderMark>
              <SliderMark>80%</SliderMark>
            </SliderMarks>
          </SliderGroup>

          {/* Interest Rate */}
          <SliderGroup>
            <SliderLabel>
              <SliderName><Percent size={14} color={t.textDim} /> ריבית שנתית</SliderName>
              <SliderValue>{rate}%</SliderValue>
            </SliderLabel>
            <RangeInput
              type="range" min={2} max={10} step={0.1} value={rate}
              onChange={e => setRate(Number(e.target.value))}
              style={{ '--fill': fillPct(rate, 2, 10) } as React.CSSProperties}
            />
            <PresetRow>
              {RATE_PRESETS.map(p => (
                <PresetChip key={p.rate} $active={rate === p.rate} onClick={() => setRate(p.rate)}>
                  {p.label}
                </PresetChip>
              ))}
            </PresetRow>
          </SliderGroup>

          {/* Loan Term */}
          <SliderGroup>
            <SliderLabel>
              <SliderName><Clock size={14} color={t.textDim} /> תקופת הלוואה</SliderName>
              <SliderValue>{years} שנים</SliderValue>
            </SliderLabel>
            <RangeInput
              type="range" min={5} max={30} step={1} value={years}
              onChange={e => setYears(Number(e.target.value))}
              style={{ '--fill': fillPct(years, 5, 30) } as React.CSSProperties}
            />
            <PresetRow>
              {TERM_PRESETS.map(p => (
                <PresetChip key={p.years} $active={years === p.years} onClick={() => setYears(p.years)}>
                  {p.label}
                </PresetChip>
              ))}
            </PresetRow>
          </SliderGroup>

          {/* Results */}
          {result && (
            <>
              <ResultsGrid>
                <ResultCard $highlight>
                  <ResultVal>{fmt.price(result.monthly)}</ResultVal>
                  <ResultLabel>תשלום חודשי</ResultLabel>
                  <ResultSub>{fmt.price(result.monthly * 12)} / שנה</ResultSub>
                </ResultCard>
                <ResultCard>
                  <ResultVal $c={t.text}>{fmt.compact(loanAmount)}</ResultVal>
                  <ResultLabel>סכום ההלוואה</ResultLabel>
                  <ResultSub>{Math.round(100 - downPct)}% מימון</ResultSub>
                </ResultCard>
                <ResultCard>
                  <ResultVal $c="#EF4444">{fmt.compact(totalInterest)}</ResultVal>
                  <ResultLabel>סה״כ ריבית</ResultLabel>
                  <ResultSub>{totalPaid > 0 ? Math.round((totalInterest / totalPaid) * 100) : 0}% מהתשלום</ResultSub>
                </ResultCard>
                <ResultCard>
                  <ResultVal $c={t.ok}>{fmt.compact(totalPaid)}</ResultVal>
                  <ResultLabel>סה״כ לתשלום</ResultLabel>
                  <ResultSub>קרן + ריבית</ResultSub>
                </ResultCard>
              </ResultsGrid>

              {/* Amortization Chart */}
              <AmortizationChart
                principal={loanAmount}
                monthlyPayment={result.monthly}
                rate={rate / 100}
                years={years}
              />

              {/* Investment Comparison */}
              <CompareSection>
                <CompareTitle>
                  <BarChart3 size={14} color={t.gold} />
                  השוואת השקעה ({years} שנים)
                </CompareTitle>
                {alternatives.map(alt => (
                  <CompareRow key={alt.name} $best={alt.best}>
                    <CompareName $c={alt.best ? t.gold : undefined}>{alt.name}</CompareName>
                    <CompareValue $c={alt.color}>{fmt.compact(alt.value)}</CompareValue>
                  </CompareRow>
                ))}
              </CompareSection>
            </>
          )}
        </Body>
      </Panel>
    </>
  )
}

export default memo(MortgageCalculator)
