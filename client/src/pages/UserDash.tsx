import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { Heart, Eye, TrendingUp, Trash2, Calculator, Settings as SettingsIcon, LayoutDashboard, GitCompare } from 'lucide-react'
import { t, fadeInUp, md } from '../theme'
import { DashLayout } from '../components/Layout'
import { GoldButton, GhostButton, Badge, AnimatedCard, Spinner, CountUpNumber } from '../components/UI'
import { useAuth, useFavorites, useCompare, usePlotsBatch, useAllPlots } from '../hooks'
import { fmt, p, roi, calcScore, getGrade, calcMonthly, zoningLabels } from '../utils'
import type { Plot } from '../types'

/* ── styled ── */
const Page = styled.div`direction:rtl;animation:${fadeInUp} 0.4s both;`
const Header = styled.div`margin-bottom:32px;`
const H1 = styled.h1`font-size:24px;font-weight:800;color:${t.lText};font-family:${t.font};`
const HSub = styled.p`color:${t.lTextSec};font-size:14px;margin-top:4px;`
const Tabs = styled.div`display:flex;gap:4px;border-bottom:1px solid ${t.lBorder};margin-bottom:28px;overflow-x:auto;`
const Tab = styled.button<{$active?:boolean}>`padding:10px 20px;border:none;background:none;font-size:14px;font-weight:${p=>p.$active?700:500};color:${p=>p.$active?t.gold:t.lTextSec};border-bottom:2px solid ${p=>p.$active?t.gold:'transparent'};cursor:pointer;transition:all ${t.tr};white-space:nowrap;font-family:${t.font};&:hover{color:${t.gold};}`
const StatsGrid = styled.div`display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px;${md}{grid-template-columns:1fr;}`
const Stat = styled(AnimatedCard)`background:${t.lSurface};border:1px solid ${t.lBorder};border-radius:${t.r.lg};padding:20px;display:flex;align-items:center;gap:16px;`
const StatIcon = styled.div<{$c?:string}>`width:44px;height:44px;border-radius:${t.r.md};background:${p=>(p.$c||t.gold)+'14'};display:flex;align-items:center;justify-content:center;color:${p=>p.$c||t.gold};`
const StatVal = styled.div`font-size:22px;font-weight:800;color:${t.lText};`
const StatLbl = styled.div`font-size:12px;color:${t.lTextSec};`
const Grid = styled.div`display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;`
const PlotCard = styled(AnimatedCard)`background:${t.lSurface};border:1px solid ${t.lBorder};border-radius:${t.r.lg};padding:20px;transition:all ${t.tr};&:hover{box-shadow:${t.sh.md};border-color:${t.gold};transform:translateY(-2px);}`
const CardTop = styled.div`display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;`
const CardCity = styled(Link)`font-size:15px;font-weight:700;color:${t.lText};text-decoration:none;&:hover{color:${t.gold};}`
const CardRow = styled.div`display:flex;justify-content:space-between;font-size:13px;color:${t.lTextSec};padding:4px 0;`
const RemBtn = styled.button`background:none;border:none;color:${t.err};cursor:pointer;padding:4px;border-radius:${t.r.sm};transition:background ${t.tr};&:hover{background:rgba(239,68,68,0.08);}`
const Table = styled.table`width:100%;border-collapse:collapse;background:${t.lSurface};border:1px solid ${t.lBorder};border-radius:${t.r.lg};overflow:hidden;`
const Th = styled.th`text-align:right;padding:12px 16px;font-size:12px;font-weight:600;color:${t.lTextSec};background:#F8FAFC;border-bottom:1px solid ${t.lBorder};`
const Td = styled.td`padding:12px 16px;font-size:13px;color:${t.lText};border-bottom:1px solid ${t.lBorder};`
const Form = styled.div`max-width:480px;display:flex;flex-direction:column;gap:16px;`
const Label = styled.label`font-size:13px;font-weight:600;color:${t.lText};display:flex;flex-direction:column;gap:4px;`
const Input = styled.input`padding:10px 14px;border:1px solid ${t.lBorder};border-radius:${t.r.md};font-size:14px;font-family:${t.font};outline:none;transition:border ${t.tr};&:focus{border-color:${t.gold};}`
const CalcGrid = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:560px;${md}{grid-template-columns:1fr;}`
const Result = styled(AnimatedCard)`background:${t.lSurface};border:1px solid ${t.lBorder};border-radius:${t.r.lg};padding:24px;margin-top:20px;max-width:560px;`
const ResRow = styled.div`display:flex;justify-content:space-between;padding:8px 0;font-size:14px;border-bottom:1px solid ${t.lBorder};&:last-child{border:none;}`
const ResLbl = styled.span`color:${t.lTextSec};`
const ResVal = styled.span`font-weight:700;color:${t.lText};`
const Empty = styled.p`text-align:center;color:${t.lTextSec};padding:48px 0;font-size:14px;`

const TABS = [
  { key: 'dash', label: 'דשבורד', icon: LayoutDashboard },
  { key: 'fav', label: 'מועדפים', icon: Heart },
  { key: 'compare', label: 'השוואה', icon: GitCompare },
  { key: 'calc', label: 'מחשבון', icon: Calculator },
  { key: 'settings', label: 'הגדרות', icon: SettingsIcon },
]

function PlotCardItem({ plot, action }: { plot: Plot; action?: React.ReactNode }) {
  const d = p(plot), r = roi(plot), g = getGrade(calcScore(plot))
  return (
    <PlotCard>
      <CardTop>
        <CardCity to={`/plot/${plot.id}`}>{plot.city} - {plot.number}</CardCity>
        {action}
      </CardTop>
      <CardRow><span>מחיר</span><span style={{fontWeight:700}}>{fmt.compact(d.price)}</span></CardRow>
      <CardRow><span>תשואה</span><Badge $color={g.color}>{fmt.pct(r)}</Badge></CardRow>
      <CardRow><span>שלב</span><span>{zoningLabels[d.zoning] || d.zoning}</span></CardRow>
    </PlotCard>
  )
}

export default function UserDash() {
  const { user } = useAuth()
  const [tab, setTab] = useState('dash')
  const fav = useFavorites()
  const compare = useCompare()
  const { data: favPlots, isLoading: favLoad } = usePlotsBatch(fav.ids)
  const { data: cmpPlots } = usePlotsBatch(compare.ids)
  const { data: allPlots } = useAllPlots()

  /* calculator */
  const [price, setPrice] = useState(500000)
  const [projected, setProjected] = useState(1500000)
  const [years, setYears] = useState(5)
  const [ltv, setLtv] = useState(50)
  const calc = useMemo(() => calcMonthly(price, ltv / 100, 0.06, years), [price, ltv, years])
  const totalRoi = price > 0 ? ((projected - price) / price) * 100 : 0

  /* settings */
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')

  const recommended = useMemo(() => (allPlots || []).slice(0, 3), [allPlots])

  return (
    <DashLayout role="user">
      <Page>
        <Header>
          <H1>שלום, {user?.name || 'משתמש'} 👋</H1>
          <HSub>ברוך הבא לדשבורד שלך</HSub>
        </Header>
        <Tabs>{TABS.map(tb => <Tab key={tb.key} $active={tab === tb.key} onClick={() => setTab(tb.key)}>{tb.label}</Tab>)}</Tabs>

        {tab === 'dash' && <>
          <StatsGrid>
            <Stat $delay={0}><StatIcon><Heart size={22} /></StatIcon><div><StatVal><CountUpNumber value={fav.ids.length} /></StatVal><StatLbl>מועדפים</StatLbl></div></Stat>
            <Stat $delay={0.1}><StatIcon $c={t.info}><Eye size={22} /></StatIcon><div><StatVal><CountUpNumber value={12} /></StatVal><StatLbl>צפיות אחרונות</StatLbl></div></Stat>
            <Stat $delay={0.2}><StatIcon $c={t.ok}><TrendingUp size={22} /></StatIcon><div><StatVal><CountUpNumber value={compare.ids.length} /></StatVal><StatLbl>בהשוואה</StatLbl></div></Stat>
          </StatsGrid>
          <H1 style={{fontSize:18,marginBottom:16}}>חלקות מומלצות</H1>
          <Grid>{recommended.map((pl,i) => <PlotCardItem key={pl.id} plot={pl} />)}</Grid>
        </>}

        {tab === 'fav' && <>
          {favLoad ? <div style={{textAlign:'center',padding:40}}><Spinner /></div>
           : !favPlots?.length ? <Empty>אין מועדפים עדיין</Empty>
           : <Grid>{favPlots.map(pl => <PlotCardItem key={pl.id} plot={pl} action={<RemBtn onClick={() => fav.toggle(pl.id)} title="הסר"><Trash2 size={16} /></RemBtn>} />)}</Grid>}
        </>}

        {tab === 'compare' && <>
          {!cmpPlots?.length ? <Empty>הוסיפו חלקות להשוואה מדף המפה</Empty> : (
            <div style={{overflowX:'auto'}}>
              <Table>
                <thead><tr><Th>שדה</Th>{cmpPlots.map(pl => <Th key={pl.id}>{pl.city} - {pl.number}</Th>)}</tr></thead>
                <tbody>
                  {[
                    { label: 'מחיר', fn: (pl:Plot) => fmt.compact(p(pl).price) },
                    { label: 'תשואה', fn: (pl:Plot) => fmt.pct(roi(pl)) },
                    { label: 'שטח (דונם)', fn: (pl:Plot) => fmt.dunam(p(pl).size) },
                    { label: 'שלב תכנון', fn: (pl:Plot) => zoningLabels[p(pl).zoning] || p(pl).zoning },
                    { label: 'ציון', fn: (pl:Plot) => { const g = getGrade(calcScore(pl)); return g.grade } },
                  ].map(row => (
                    <tr key={row.label}><Td style={{fontWeight:600}}>{row.label}</Td>{cmpPlots.map(pl => <Td key={pl.id}>{row.fn(pl)}</Td>)}</tr>
                  ))}
                </tbody>
              </Table>
              <GhostButton style={{marginTop:16}} onClick={compare.clear}>נקה השוואה</GhostButton>
            </div>
          )}
        </>}

        {tab === 'calc' && <>
          <CalcGrid>
            <Label>מחיר רכישה (₪)<Input type="number" value={price} onChange={e => setPrice(+e.target.value)} /></Label>
            <Label>שווי צפוי (₪)<Input type="number" value={projected} onChange={e => setProjected(+e.target.value)} /></Label>
            <Label>שנים<Input type="number" value={years} onChange={e => setYears(+e.target.value)} min={1} max={30} /></Label>
            <Label>מינוף (LTV %)<Input type="number" value={ltv} onChange={e => setLtv(+e.target.value)} min={0} max={90} /></Label>
          </CalcGrid>
          <Result>
            <ResRow><ResLbl>תשואה כוללת</ResLbl><ResVal style={{color:totalRoi>0?t.ok:t.err}}>{fmt.pct(totalRoi)}</ResVal></ResRow>
            <ResRow><ResLbl>CAGR</ResLbl><ResVal>{fmt.pct(((Math.pow(1+totalRoi/100,1/years)-1)*100))}</ResVal></ResRow>
            {calc && <>
              <ResRow><ResLbl>הון עצמי</ResLbl><ResVal>{fmt.price(calc.down)}</ResVal></ResRow>
              <ResRow><ResLbl>הלוואה</ResLbl><ResVal>{fmt.price(calc.loan)}</ResVal></ResRow>
              <ResRow><ResLbl>החזר חודשי</ResLbl><ResVal>{fmt.price(calc.monthly)}</ResVal></ResRow>
            </>}
          </Result>
        </>}

        {tab === 'settings' && (
          <Form>
            <Label>שם מלא<Input value={name} onChange={e => setName(e.target.value)} /></Label>
            <Label>אימייל<Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></Label>
            <GoldButton style={{alignSelf:'flex-start',marginTop:8}}>שמור שינויים</GoldButton>
          </Form>
        )}
      </Page>
    </DashLayout>
  )
}
