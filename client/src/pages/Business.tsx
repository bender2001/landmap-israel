import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { LayoutDashboard, Map, FileText, BarChart3, Eye, TrendingUp, Users } from 'lucide-react'
import { t, fadeInUp, md } from '../theme'
import { DashLayout } from '../components/Layout'
import { GoldButton, Badge, AnimatedCard, Spinner, CountUpNumber } from '../components/UI'
import { useAuth, useAllPlots, useLeads } from '../hooks'
import { fmt, p, roi, statusLabels, statusColors, leadStatusLabels, leadStatusColors } from '../utils'
import type { Plot, Lead } from '../types'

/* ── styled ── */
const Page = styled.div`direction:rtl;animation:${fadeInUp} 0.4s both;`
const Header = styled.div`margin-bottom:32px;`
const H1 = styled.h1`font-size:24px;font-weight:800;color:${t.lText};font-family:${t.font};`
const HSub = styled.p`color:${t.lTextSec};font-size:14px;margin-top:4px;`
const Tabs = styled.div`display:flex;gap:4px;border-bottom:1px solid ${t.lBorder};margin-bottom:28px;overflow-x:auto;`
const Tab = styled.button<{$active?:boolean}>`padding:10px 20px;border:none;background:none;font-size:14px;font-weight:${p=>p.$active?700:500};color:${p=>p.$active?t.gold:t.lTextSec};border-bottom:2px solid ${p=>p.$active?t.gold:'transparent'};cursor:pointer;transition:all ${t.tr};white-space:nowrap;font-family:${t.font};&:hover{color:${t.gold};}`
const StatsGrid = styled.div`display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px;${md}{grid-template-columns:repeat(2,1fr);}@media(max-width:480px){grid-template-columns:1fr;}`
const Stat = styled(AnimatedCard)`background:${t.lSurface};border:1px solid ${t.lBorder};border-radius:${t.r.lg};padding:20px;display:flex;align-items:center;gap:16px;`
const StatIcon = styled.div<{$c?:string}>`width:44px;height:44px;border-radius:${t.r.md};background:${p=>(p.$c||t.gold)+'14'};display:flex;align-items:center;justify-content:center;color:${p=>p.$c||t.gold};`
const StatVal = styled.div`font-size:22px;font-weight:800;color:${t.lText};`
const StatLbl = styled.div`font-size:12px;color:${t.lTextSec};`
const Table = styled.table`width:100%;border-collapse:collapse;background:${t.lSurface};border:1px solid ${t.lBorder};border-radius:${t.r.lg};overflow:hidden;`
const Th = styled.th`text-align:right;padding:12px 16px;font-size:12px;font-weight:600;color:${t.lTextSec};background:#F8FAFC;border-bottom:1px solid ${t.lBorder};`
const Td = styled.td`padding:12px 16px;font-size:13px;color:${t.lText};border-bottom:1px solid ${t.lBorder};`
const ActionLink = styled(Link)`color:${t.gold};font-size:12px;font-weight:600;text-decoration:none;&:hover{text-decoration:underline;}`
const Empty = styled.p`text-align:center;color:${t.lTextSec};padding:48px 0;font-size:14px;`
const MetricCard = styled(AnimatedCard)`background:${t.lSurface};border:1px solid ${t.lBorder};border-radius:${t.r.lg};padding:24px;text-align:center;`
const MetricVal = styled.div`font-size:28px;font-weight:800;color:${t.gold};margin-bottom:4px;`
const MetricLbl = styled.div`font-size:13px;color:${t.lTextSec};`
const Grid2 = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:20px;${md}{grid-template-columns:1fr;}`
const Activity = styled.div`background:${t.lSurface};border:1px solid ${t.lBorder};border-radius:${t.r.lg};padding:20px;margin-top:24px;`
const ActItem = styled.div`display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid ${t.lBorder};&:last-child{border:none;}`
const ActText = styled.span`font-size:13px;color:${t.lText};`
const ActTime = styled.span`font-size:11px;color:${t.lTextSec};`

const TABS = [
  { key: 'dash', label: 'דשבורד', icon: LayoutDashboard },
  { key: 'plots', label: 'חלקות שלי', icon: Map },
  { key: 'leads', label: 'לידים', icon: FileText },
  { key: 'analytics', label: 'אנליטיקס', icon: BarChart3 },
]

export default function Business() {
  const { user } = useAuth()
  const [tab, setTab] = useState('dash')
  const { data: allPlots, isLoading: plotsLoad } = useAllPlots()
  const { data: leads, isLoading: leadsLoad } = useLeads()

  const myPlots = useMemo(() => (allPlots || []).filter(pl => pl.owner_id === user?.id || true).slice(0, 10), [allPlots, user])
  const myLeads = useMemo(() => (leads || []).slice(0, 20), [leads])
  const totalViews = useMemo(() => myPlots.reduce((s, pl) => s + (pl.views || 0), 0), [myPlots])
  const avgRoi = useMemo(() => { if (!myPlots.length) return 0; return myPlots.reduce((s, pl) => s + roi(pl), 0) / myPlots.length }, [myPlots])

  return (
    <DashLayout role="business">
      <Page>
        <Header>
          <H1>שלום, {user?.name || 'בעל עסק'}</H1>
          <HSub>ניהול חלקות ולידים</HSub>
        </Header>
        <Tabs>{TABS.map(tb => <Tab key={tb.key} $active={tab === tb.key} onClick={() => setTab(tb.key)}>{tb.label}</Tab>)}</Tabs>

        {tab === 'dash' && <>
          <StatsGrid>
            <Stat $delay={0}><StatIcon><Map size={22} /></StatIcon><div><StatVal><CountUpNumber value={myPlots.length} /></StatVal><StatLbl>חלקות</StatLbl></div></Stat>
            <Stat $delay={0.1}><StatIcon $c={t.info}><FileText size={22} /></StatIcon><div><StatVal><CountUpNumber value={myLeads.length} /></StatVal><StatLbl>לידים פעילים</StatLbl></div></Stat>
            <Stat $delay={0.2}><StatIcon $c={t.ok}><Eye size={22} /></StatIcon><div><StatVal><CountUpNumber value={totalViews} /></StatVal><StatLbl>צפיות</StatLbl></div></Stat>
            <Stat $delay={0.3}><StatIcon $c={t.warn}><TrendingUp size={22} /></StatIcon><div><StatVal>{fmt.pct(avgRoi)}</StatVal><StatLbl>ROI ממוצע</StatLbl></div></Stat>
          </StatsGrid>
          <Activity>
            <h3 style={{fontSize:15,fontWeight:700,color:t.lText,marginBottom:12}}>פעילות אחרונה</h3>
            {myLeads.slice(0, 5).map((l, i) => (
              <ActItem key={l.id}>
                <ActText>ליד חדש: {l.name} עבור חלקה {l.plot_id}</ActText>
                <ActTime>{fmt.relative(l.created_at)}</ActTime>
              </ActItem>
            ))}
            {!myLeads.length && <Empty>אין פעילות אחרונה</Empty>}
          </Activity>
        </>}

        {tab === 'plots' && <>
          {plotsLoad ? <div style={{textAlign:'center',padding:40}}><Spinner /></div> : !myPlots.length ? <Empty>אין חלקות</Empty> : (
            <div style={{overflowX:'auto'}}>
              <Table>
                <thead><tr><Th>חלקה</Th><Th>עיר</Th><Th>מחיר</Th><Th>סטטוס</Th><Th>צפיות</Th><Th>פעולות</Th></tr></thead>
                <tbody>
                  {myPlots.map(pl => (
                    <tr key={pl.id}>
                      <Td style={{fontWeight:600}}>{pl.number}</Td>
                      <Td>{pl.city}</Td>
                      <Td>{fmt.compact(p(pl).price)}</Td>
                      <Td><Badge $color={statusColors[pl.status || 'AVAILABLE']}>{statusLabels[pl.status || 'AVAILABLE']}</Badge></Td>
                      <Td>{pl.views || 0}</Td>
                      <Td><ActionLink to={`/plot/${pl.id}`}>צפה</ActionLink></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </>}

        {tab === 'leads' && <>
          {leadsLoad ? <div style={{textAlign:'center',padding:40}}><Spinner /></div> : !myLeads.length ? <Empty>אין לידים</Empty> : (
            <div style={{overflowX:'auto'}}>
              <Table>
                <thead><tr><Th>שם</Th><Th>טלפון</Th><Th>אימייל</Th><Th>חלקה</Th><Th>סטטוס</Th><Th>תאריך</Th></tr></thead>
                <tbody>
                  {myLeads.map(l => (
                    <tr key={l.id}>
                      <Td style={{fontWeight:600}}>{l.name}</Td>
                      <Td dir="ltr">{l.phone}</Td>
                      <Td>{l.email || '—'}</Td>
                      <Td>{l.plot_id}</Td>
                      <Td><Badge $color={leadStatusColors[l.status] || t.info}>{leadStatusLabels[l.status] || l.status}</Badge></Td>
                      <Td>{fmt.date(l.created_at)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </>}

        {tab === 'analytics' && <>
          <Grid2>
            <MetricCard $delay={0}><MetricVal><CountUpNumber value={totalViews} /></MetricVal><MetricLbl>סה״כ צפיות</MetricLbl></MetricCard>
            <MetricCard $delay={0.1}><MetricVal>{myLeads.length && totalViews ? fmt.pct((myLeads.length / totalViews) * 100) : '0%'}</MetricVal><MetricLbl>שיעור המרה</MetricLbl></MetricCard>
          </Grid2>
          <Activity style={{marginTop:20}}>
            <h3 style={{fontSize:15,fontWeight:700,color:t.lText,marginBottom:12}}>צפיות לאורך זמן</h3>
            <Empty>הגרף יהיה זמין בקרוב</Empty>
          </Activity>
        </>}
      </Page>
    </DashLayout>
  )
}
