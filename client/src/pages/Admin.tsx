import { useState, useMemo } from 'react'
import styled from 'styled-components'
import { LayoutDashboard, Users, Map, FileText, Settings as SettingsIcon, DollarSign, Activity, Trash2 } from 'lucide-react'
import { t, fadeInUp, md } from '../theme'
import { DashLayout } from '../components/Layout'
import { GoldButton, GhostButton, Badge, AnimatedCard, Spinner, CountUpNumber } from '../components/UI'
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
const Empty = styled.p`text-align:center;color:${t.lTextSec};padding:48px 0;font-size:14px;`
const Select = styled.select`padding:4px 8px;border:1px solid ${t.lBorder};border-radius:${t.r.sm};font-size:12px;font-family:${t.font};background:${t.lSurface};color:${t.lText};cursor:pointer;&:focus{border-color:${t.gold};outline:none;}`
const DelBtn = styled.button`background:none;border:none;color:${t.err};cursor:pointer;padding:4px;border-radius:${t.r.sm};transition:background ${t.tr};&:hover{background:rgba(239,68,68,0.08);}`
const ActionRow = styled.div`display:flex;align-items:center;gap:8px;`
const ActBox = styled.div`background:${t.lSurface};border:1px solid ${t.lBorder};border-radius:${t.r.lg};padding:20px;margin-top:24px;`
const ActItem = styled.div`display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid ${t.lBorder};&:last-child{border:none;}`
const ActText = styled.span`font-size:13px;color:${t.lText};`
const ActTime = styled.span`font-size:11px;color:${t.lTextSec};`
const ConfigSection = styled.div`max-width:560px;`
const ConfigCard = styled(AnimatedCard)`background:${t.lSurface};border:1px solid ${t.lBorder};border-radius:${t.r.lg};padding:20px;margin-bottom:16px;`
const ConfigTitle = styled.h3`font-size:15px;font-weight:700;color:${t.lText};margin-bottom:8px;`
const ConfigDesc = styled.p`font-size:13px;color:${t.lTextSec};`

const TABS = [
  { key: 'dash', label: 'דשבורד', icon: LayoutDashboard },
  { key: 'users', label: 'משתמשים', icon: Users },
  { key: 'plots', label: 'חלקות', icon: Map },
  { key: 'leads', label: 'לידים', icon: FileText },
  { key: 'settings', label: 'הגדרות', icon: SettingsIcon },
]

const ROLE_LABELS: Record<string, string> = { user: 'משתמש', business: 'עסקי', admin: 'מנהל' }
const ROLE_COLORS: Record<string, string> = { user: t.info, business: t.warn, admin: t.err }

const MOCK_USERS = [
  { id: '1', name: 'ישראל כהן', email: 'israel@mail.com', role: 'user', created_at: '2025-12-01' },
  { id: '2', name: 'מיכל לוי', email: 'michal@mail.com', role: 'business', created_at: '2025-11-15' },
  { id: '3', name: 'דני אברהם', email: 'dani@mail.com', role: 'admin', created_at: '2025-10-20' },
  { id: '4', name: 'שרה גולד', email: 'sara@mail.com', role: 'user', created_at: '2026-01-05' },
  { id: '5', name: 'אבי רוזן', email: 'avi@mail.com', role: 'business', created_at: '2026-01-18' },
]

export default function Admin() {
  const { user } = useAuth()
  const [tab, setTab] = useState('dash')
  const { data: allPlots, isLoading: plotsLoad } = useAllPlots()
  const { data: leads, isLoading: leadsLoad } = useLeads()
  const [users, setUsers] = useState(MOCK_USERS)

  const plots = allPlots || []
  const allLeads = leads || []
  const revenue = useMemo(() => plots.reduce((s, pl) => s + (p(pl).price * 0.03), 0), [plots])

  return (
    <DashLayout role="admin">
      <Page>
        <Header>
          <H1>ניהול מערכת</H1>
          <HSub>שלום, {user?.name || 'מנהל'}</HSub>
        </Header>
        <Tabs>{TABS.map(tb => <Tab key={tb.key} $active={tab === tb.key} onClick={() => setTab(tb.key)}>{tb.label}</Tab>)}</Tabs>

        {tab === 'dash' && <>
          <StatsGrid>
            <Stat $delay={0}><StatIcon><Users size={22} /></StatIcon><div><StatVal><CountUpNumber value={users.length} /></StatVal><StatLbl>משתמשים</StatLbl></div></Stat>
            <Stat $delay={0.1}><StatIcon $c={t.info}><Map size={22} /></StatIcon><div><StatVal><CountUpNumber value={plots.length} /></StatVal><StatLbl>חלקות</StatLbl></div></Stat>
            <Stat $delay={0.2}><StatIcon $c={t.ok}><FileText size={22} /></StatIcon><div><StatVal><CountUpNumber value={allLeads.length} /></StatVal><StatLbl>לידים</StatLbl></div></Stat>
            <Stat $delay={0.3}><StatIcon $c={t.warn}><DollarSign size={22} /></StatIcon><div><StatVal>{fmt.compact(revenue)}</StatVal><StatLbl>הכנסות (עמלה)</StatLbl></div></Stat>
          </StatsGrid>
          <ActBox>
            <h3 style={{fontSize:15,fontWeight:700,color:t.lText,marginBottom:12}}>פעילות אחרונה</h3>
            {allLeads.slice(0, 5).map(l => (
              <ActItem key={l.id}>
                <ActText>ליד חדש: {l.name}</ActText>
                <ActTime>{fmt.relative(l.created_at)}</ActTime>
              </ActItem>
            ))}
            {!allLeads.length && <Empty>אין פעילות</Empty>}
          </ActBox>
        </>}

        {tab === 'users' && (
          <div style={{overflowX:'auto'}}>
            <Table>
              <thead><tr><Th>שם</Th><Th>אימייל</Th><Th>תפקיד</Th><Th>תאריך הצטרפות</Th><Th>פעולות</Th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <Td style={{fontWeight:600}}>{u.name}</Td>
                    <Td>{u.email}</Td>
                    <Td>
                      <Select value={u.role} onChange={e => setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: e.target.value } : x))}>
                        <option value="user">משתמש</option>
                        <option value="business">עסקי</option>
                        <option value="admin">מנהל</option>
                      </Select>
                    </Td>
                    <Td>{fmt.date(u.created_at)}</Td>
                    <Td><Badge $color={ROLE_COLORS[u.role]}>{ROLE_LABELS[u.role]}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {tab === 'plots' && <>
          {plotsLoad ? <div style={{textAlign:'center',padding:40}}><Spinner /></div> : !plots.length ? <Empty>אין חלקות</Empty> : (
            <div style={{overflowX:'auto'}}>
              <Table>
                <thead><tr><Th>מספר</Th><Th>עיר</Th><Th>מחיר</Th><Th>סטטוס</Th><Th>תשואה</Th><Th>פעולות</Th></tr></thead>
                <tbody>
                  {plots.map(pl => (
                    <tr key={pl.id}>
                      <Td style={{fontWeight:600}}>{pl.number}</Td>
                      <Td>{pl.city}</Td>
                      <Td>{fmt.compact(p(pl).price)}</Td>
                      <Td><Badge $color={statusColors[pl.status || 'AVAILABLE']}>{statusLabels[pl.status || 'AVAILABLE']}</Badge></Td>
                      <Td>{fmt.pct(roi(pl))}</Td>
                      <Td>
                        <ActionRow>
                          <GhostButton style={{padding:'4px 12px',fontSize:11}}>צפה</GhostButton>
                          <DelBtn title="מחק"><Trash2 size={15} /></DelBtn>
                        </ActionRow>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </>}

        {tab === 'leads' && <>
          {leadsLoad ? <div style={{textAlign:'center',padding:40}}><Spinner /></div> : !allLeads.length ? <Empty>אין לידים</Empty> : (
            <div style={{overflowX:'auto'}}>
              <Table>
                <thead><tr><Th>שם</Th><Th>טלפון</Th><Th>חלקה</Th><Th>סטטוס</Th><Th>תאריך</Th></tr></thead>
                <tbody>
                  {allLeads.map(l => (
                    <tr key={l.id}>
                      <Td style={{fontWeight:600}}>{l.name}</Td>
                      <Td dir="ltr">{l.phone}</Td>
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

        {tab === 'settings' && (
          <ConfigSection>
            <ConfigCard $delay={0}><ConfigTitle>הגדרות כלליות</ConfigTitle><ConfigDesc>הגדרות מערכת כלליות כגון שם האתר, לוגו ושפה.</ConfigDesc></ConfigCard>
            <ConfigCard $delay={0.1}><ConfigTitle>הרשאות</ConfigTitle><ConfigDesc>ניהול הרשאות גישה לתפקידים שונים במערכת.</ConfigDesc></ConfigCard>
            <ConfigCard $delay={0.2}><ConfigTitle>אינטגרציות</ConfigTitle><ConfigDesc>חיבור למערכות חיצוניות - CRM, שליחת SMS, מערכת תשלומים.</ConfigDesc></ConfigCard>
            <ConfigCard $delay={0.3}><ConfigTitle>גיבויים</ConfigTitle><ConfigDesc>הגדרות גיבוי אוטומטי ושחזור נתונים.</ConfigDesc></ConfigCard>
          </ConfigSection>
        )}
      </Page>
    </DashLayout>
  )
}
