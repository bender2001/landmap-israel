import { useState, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { LogOut, BarChart3, Map, Users, Settings, Eye, TrendingUp, ChevronLeft, Phone, Mail, Clock, Search, Filter } from 'lucide-react'
import { t, media } from '../../theme'
import { useAuth, useLeads, useAllPlots } from '../../hooks'
import { Spinner, Badge, GoldButton, GhostButton } from '../../components/UI'
import { fmt, p, roi, statusLabels, statusColors, leadStatusLabels, leadStatusColors } from '../../utils'
import type { Plot, Lead } from '../../types'
import * as api from '../../api'

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`

// ── Login Page ──
const LoginPage = styled.div`
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: ${t.colors.bg}; padding: 24px;
`
const LoginCard = styled.div`
  width: 100%; max-width: 380px; padding: 32px;
  background: ${t.colors.surface}; border: 1px solid ${t.colors.border};
  border-radius: ${t.radius.xl};
`
const LoginTitle = styled.h1`font-size: 22px; font-weight: 800; color: ${t.colors.text}; text-align: center; margin-bottom: 24px;`
const LoginInput = styled.input`
  width: 100%; padding: 12px; margin-bottom: 12px;
  border: 1px solid ${t.colors.border}; border-radius: ${t.radius.sm};
  background: ${t.colors.surfaceHover}; color: ${t.colors.text};
  font-size: 14px; font-family: ${t.font}; outline: none;
  &:focus { border-color: ${t.colors.gold}; }
`

// ── Admin Layout ──
const Layout = styled.div`
  display: grid; grid-template-columns: 220px 1fr;
  min-height: 100vh; background: ${t.colors.bg};
  ${media.mobile} { grid-template-columns: 1fr; }
`
const Sidebar = styled.nav`
  background: ${t.colors.surface}; border-left: 1px solid ${t.colors.border};
  padding: 20px 12px; display: flex; flex-direction: column; gap: 4px;
  ${media.mobile} { display: none; }
`
const SidebarLink = styled.button<{ $active?: boolean }>`
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 10px 12px; border-radius: ${t.radius.sm};
  border: none; background: ${({ $active }) => $active ? t.colors.goldDim : 'transparent'};
  color: ${({ $active }) => $active ? t.colors.goldBright : t.colors.textSec};
  font-size: 13px; font-weight: 500; cursor: pointer; font-family: ${t.font};
  transition: all ${t.transition}; text-align: right;
  &:hover { background: ${t.colors.surfaceHover}; }
`
const Content = styled.main`padding: 24px; overflow-y: auto; animation: ${fadeIn} 0.3s ease;`
const PageTitle = styled.h1`font-size: 22px; font-weight: 800; color: ${t.colors.text}; margin-bottom: 20px;`

const StatGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px; margin-bottom: 24px;
`
const StatCard = styled.div`
  padding: 16px; border-radius: ${t.radius.md};
  background: ${t.colors.surface}; border: 1px solid ${t.colors.border};
`
const StatLabel = styled.div`font-size: 11px; color: ${t.colors.textDim}; margin-bottom: 4px;`
const StatValue = styled.div<{ $color?: string }>`font-size: 22px; font-weight: 800; color: ${({ $color }) => $color || t.colors.text};`

const Table = styled.div`
  background: ${t.colors.surface}; border: 1px solid ${t.colors.border};
  border-radius: ${t.radius.lg}; overflow: hidden;
`
const THead = styled.div`
  display: grid; padding: 10px 16px; font-size: 12px; font-weight: 600;
  color: ${t.colors.textDim}; background: ${t.colors.surfaceHover};
  border-bottom: 1px solid ${t.colors.border};
`
const TRow = styled.div`
  display: grid; padding: 12px 16px; font-size: 13px;
  border-bottom: 1px solid ${t.colors.border};
  transition: background ${t.transition};
  &:hover { background: ${t.colors.surfaceHover}; }
  &:last-child { border-bottom: none; }
`

type Tab = 'dashboard' | 'plots' | 'leads' | 'settings'

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try { await login(email, password); onLogin() }
    catch { setError('פרטי התחברות שגויים') }
    finally { setLoading(false) }
  }

  return (
    <LoginPage>
      <LoginCard>
        <LoginTitle>🏗️ LandMap Admin</LoginTitle>
        <form onSubmit={handleSubmit}>
          <LoginInput placeholder="אימייל" type="email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" />
          <LoginInput placeholder="סיסמה" type="password" value={password} onChange={e => setPassword(e.target.value)} dir="ltr" />
          {error && <p style={{ color: t.colors.danger, fontSize: 12, marginBottom: 8 }}>{error}</p>}
          <GoldButton type="submit" disabled={loading} style={{ width: '100%', padding: 12 }}>
            {loading ? 'מתחבר...' : 'התחבר'}
          </GoldButton>
        </form>
      </LoginCard>
    </LoginPage>
  )
}

function Dashboard({ plots, leads }: { plots: Plot[]; leads: Lead[] }) {
  const newLeads = leads.filter(l => l.status === 'new').length
  const totalValue = plots.reduce((s, pl) => s + (pl.total_price ?? pl.totalPrice ?? 0), 0)
  const avgRoi = plots.length > 0 ? Math.round(plots.reduce((s, pl) => s + roi(pl), 0) / plots.length) : 0

  return (
    <>
      <PageTitle>📊 לוח בקרה</PageTitle>
      <StatGrid>
        <StatCard><StatLabel>סה"כ חלקות</StatLabel><StatValue>{plots.length}</StatValue></StatCard>
        <StatCard><StatLabel>לידים חדשים</StatLabel><StatValue $color={t.colors.success}>{newLeads}</StatValue></StatCard>
        <StatCard><StatLabel>שווי כולל</StatLabel><StatValue $color={t.colors.goldBright}>{fmt.compact(totalValue)}</StatValue></StatCard>
        <StatCard><StatLabel>תשואה ממוצעת</StatLabel><StatValue $color={t.colors.success}>+{avgRoi}%</StatValue></StatCard>
      </StatGrid>
    </>
  )
}

function PlotsList({ plots }: { plots: Plot[] }) {
  const gridCols = '2fr 1fr 1fr 1fr 80px'
  return (
    <>
      <PageTitle>🗺️ חלקות ({plots.length})</PageTitle>
      <Table>
        <THead style={{ gridTemplateColumns: gridCols }}>
          <span>חלקה</span><span>מחיר</span><span>שטח</span><span>סטטוס</span><span></span>
        </THead>
        {plots.map(plot => {
          const d = p(plot)
          return (
            <TRow key={plot.id} style={{ gridTemplateColumns: gridCols }}>
              <div>
                <div style={{ fontWeight: 600 }}>גוש {d.block} / {plot.number}</div>
                <div style={{ fontSize: 11, color: t.colors.textDim }}>{plot.city}</div>
              </div>
              <div>{fmt.compact(d.price)}</div>
              <div>{fmt.dunam(d.size)} דונם</div>
              <div><Badge $color={statusColors[plot.status || 'AVAILABLE']}>{statusLabels[plot.status || 'AVAILABLE']}</Badge></div>
              <div><Link to={`/plot/${plot.id}`} style={{ fontSize: 12, color: t.colors.gold }}>צפה</Link></div>
            </TRow>
          )
        })}
      </Table>
    </>
  )
}

function LeadsList({ leads }: { leads: Lead[] }) {
  const gridCols = '2fr 1fr 1fr 1fr'
  const updateStatus = async (id: string, status: string) => {
    try { await api.updateLeadStatus(id, status) } catch {}
  }
  return (
    <>
      <PageTitle>👥 לידים ({leads.length})</PageTitle>
      <Table>
        <THead style={{ gridTemplateColumns: gridCols }}>
          <span>שם</span><span>טלפון</span><span>סטטוס</span><span>תאריך</span>
        </THead>
        {leads.map(lead => (
          <TRow key={lead.id} style={{ gridTemplateColumns: gridCols }}>
            <div style={{ fontWeight: 600 }}>{lead.name}</div>
            <div dir="ltr" style={{ color: t.colors.textSec }}>{lead.phone}</div>
            <div>
              <Badge $color={leadStatusColors[lead.status] || t.colors.textDim}>
                {leadStatusLabels[lead.status] || lead.status}
              </Badge>
            </div>
            <div style={{ fontSize: 12, color: t.colors.textDim }}>{fmt.date(lead.created_at)}</div>
          </TRow>
        ))}
      </Table>
    </>
  )
}

export default function AdminPage() {
  const { user, logout, isLoading: authLoading } = useAuth()
  const [tab, setTab] = useState<Tab>('dashboard')
  const { data: plots = [] } = useAllPlots({})
  const { data: leads = [] } = useLeads()
  const navigate = useNavigate()

  if (authLoading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: t.colors.bg }}><Spinner size={32} /></div>
  if (!user) return <LoginForm onLogin={() => {}} />

  return (
    <Layout>
      <Sidebar>
        <div style={{ fontSize: 16, fontWeight: 800, color: t.colors.goldBright, padding: '8px 12px', marginBottom: 8 }}>🏗️ Admin</div>
        <SidebarLink $active={tab === 'dashboard'} onClick={() => setTab('dashboard')}><BarChart3 size={16} /> לוח בקרה</SidebarLink>
        <SidebarLink $active={tab === 'plots'} onClick={() => setTab('plots')}><Map size={16} /> חלקות</SidebarLink>
        <SidebarLink $active={tab === 'leads'} onClick={() => setTab('leads')}><Users size={16} /> לידים</SidebarLink>
        <div style={{ flex: 1 }} />
        <SidebarLink onClick={() => navigate('/')}><ChevronLeft size={16} /> חזרה לאתר</SidebarLink>
        <SidebarLink onClick={logout} style={{ color: t.colors.danger }}><LogOut size={16} /> התנתק</SidebarLink>
      </Sidebar>
      <Content>
        {tab === 'dashboard' && <Dashboard plots={plots as Plot[]} leads={leads as Lead[]} />}
        {tab === 'plots' && <PlotsList plots={plots as Plot[]} />}
        {tab === 'leads' && <LeadsList leads={leads as Lead[]} />}
      </Content>
    </Layout>
  )
}
