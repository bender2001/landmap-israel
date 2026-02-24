import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { Search, MapPin, TrendingUp, Home, Zap, Calculator, FileText, Map, X, ArrowRight, Command } from 'lucide-react'
import { t, mobile } from '../theme'
import { useAllPlots } from '../hooks'
import { p, calcScore, getGrade, fmt, pricePerDunam } from '../utils'
import type { Plot } from '../types'

/* ── Animations ── */
const backdropIn = keyframes`from{opacity:0}to{opacity:1}`
const dialogIn = keyframes`from{opacity:0;transform:translateY(-16px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}`
const resultIn = keyframes`from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}`

/* ── Styled Components ── */
const Backdrop = styled.div<{$open:boolean}>`
  position:fixed;inset:0;z-index:${t.z.modal + 10};
  background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
  display:${pr=>pr.$open?'flex':'none'};align-items:flex-start;justify-content:center;
  padding:min(15vh,120px) 16px 40px;
  animation:${backdropIn} 0.15s ease-out;
`
const Dialog = styled.div`
  width:100%;max-width:560px;
  background:rgba(17,24,39,0.97);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border:1px solid ${t.goldBorder};border-radius:${t.r.xl};
  box-shadow:0 24px 80px rgba(0,0,0,0.5),0 0 0 1px rgba(212,168,75,0.08);
  overflow:hidden;animation:${dialogIn} 0.2s cubic-bezier(0.32,0.72,0,1);
  direction:rtl;
`
const SearchRow = styled.div`
  display:flex;align-items:center;gap:10px;padding:16px 18px;
  border-bottom:1px solid ${t.border};
`
const SearchIcon = styled(Search)`color:${t.gold};flex-shrink:0;`
const Input = styled.input`
  flex:1;background:none;border:none;outline:none;
  font-size:16px;font-family:${t.font};color:${t.text};
  &::placeholder{color:${t.textDim};}
`
const KbdHint = styled.kbd`
  display:inline-flex;align-items:center;justify-content:center;
  padding:2px 7px;font-size:11px;font-weight:600;font-family:${t.font};
  color:${t.textDim};background:rgba(255,255,255,0.06);
  border:1px solid ${t.border};border-radius:${t.r.sm};
  line-height:1.4;
`
const CloseBtn = styled.button`
  display:flex;align-items:center;justify-content:center;
  width:28px;height:28px;border-radius:${t.r.sm};
  background:transparent;border:1px solid ${t.border};
  color:${t.textDim};cursor:pointer;transition:all ${t.tr};flex-shrink:0;
  &:hover{border-color:${t.goldBorder};color:${t.text};}
`
const ResultsWrap = styled.div`
  max-height:360px;overflow-y:auto;padding:6px 0;
  scrollbar-width:thin;
  &::-webkit-scrollbar{width:4px;}
  &::-webkit-scrollbar-thumb{background:${t.surfaceLight};border-radius:2px;}
`
const GroupLabel = styled.div`
  padding:8px 18px 4px;font-size:10px;font-weight:700;color:${t.textDim};
  letter-spacing:0.5px;text-transform:uppercase;
`
const ResultItem = styled.div<{$focused?:boolean}>`
  display:flex;align-items:center;gap:12px;padding:10px 18px;
  cursor:pointer;transition:background 0.12s;
  background:${pr=>pr.$focused?'rgba(212,168,75,0.08)':'transparent'};
  animation:${resultIn} 0.15s ease-out both;
  &:hover{background:rgba(212,168,75,0.08);}
`
const ResultIcon = styled.div<{$bg?:string}>`
  width:36px;height:36px;border-radius:${t.r.md};flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  background:${pr=>pr.$bg||'rgba(212,168,75,0.08)'};
  border:1px solid ${pr=>pr.$bg?'transparent':t.goldBorder};
  color:${t.gold};font-size:15px;
`
const ResultInfo = styled.div`flex:1;min-width:0;`
const ResultName = styled.div`font-size:14px;font-weight:700;color:${t.text};`
const ResultMeta = styled.div`font-size:11px;color:${t.textSec};display:flex;gap:8px;margin-top:1px;`
const ResultMetaVal = styled.span`font-weight:700;color:${t.goldBright};`
const ResultArrow = styled.div`
  color:${t.textDim};opacity:0;transition:all 0.15s;
  ${ResultItem}:hover &, ${ResultItem}[data-focused="true"] &{opacity:1;transform:translateX(-2px);}
`
const Footer = styled.div`
  display:flex;align-items:center;justify-content:space-between;gap:8px;
  padding:10px 18px;border-top:1px solid ${t.border};
  font-size:11px;color:${t.textDim};
`
const FooterKeys = styled.div`display:flex;align-items:center;gap:8px;`
const FooterKey = styled.div`
  display:flex;align-items:center;gap:4px;
`
const EmptyState = styled.div`
  padding:32px 18px;text-align:center;color:${t.textSec};
  display:flex;flex-direction:column;align-items:center;gap:8px;
`
const EmptyIcon = styled.div`
  width:48px;height:48px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  background:rgba(212,168,75,0.06);border:1px solid ${t.goldBorder};
  margin-bottom:4px;
`

/* ── Quick Actions ── */
const QUICK_ACTIONS = [
  { id: 'explore', icon: Map, label: 'מפה אינטראקטיבית', desc: 'צפייה בכל החלקות', path: '/explore' },
  { id: 'hot', icon: Zap, label: 'עסקאות חמות', desc: 'חלקות עם ציון גבוה', path: '/explore?ripeness=high' },
  { id: 'calc', icon: Calculator, label: 'מחשבון תשואה', desc: 'חשב את ההשקעה שלך', path: '/calculator' },
  { id: 'about', icon: FileText, label: 'אודות LandMap', desc: 'מי אנחנו ומה אנחנו עושים', path: '/about' },
  { id: 'home', icon: Home, label: 'דף הבית', desc: 'חזרה לדף הראשי', path: '/' },
]

/* ── City Data ── */
const CITY_ICONS: Record<string, string> = {
  'חדרה': '🏗️', 'נתניה': '🌊', 'קיסריה': '🏛️', 'הרצליה': '💎',
  'כפר סבא': '🌳', 'רעננה': '🏠', 'תל אביב': '🌆', 'ירושלים': '✡️',
  'חיפה': '⚓', 'באר שבע': '🏜️', 'ראשון לציון': '🏙️', 'אשדוד': '🚢',
}

interface SearchResult {
  type: 'plot' | 'city' | 'action'
  id: string
  label: string
  sublabel: string
  icon: string | React.ElementType
  iconBg?: string
  path: string
  score?: number
  price?: number
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [focusIdx, setFocusIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { data: plots = [] } = useAllPlots()

  // Open/close with Ctrl+K or Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => {
          if (!o) {
            setQuery('')
            setFocusIdx(0)
          }
          return !o
        })
      }
      if (e.key === 'Escape' && open) {
        e.stopPropagation()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Search results
  const results = useMemo((): SearchResult[] => {
    const q = query.trim().toLowerCase()
    if (!q) {
      // Show quick actions when empty
      return QUICK_ACTIONS.map(a => ({
        type: 'action' as const,
        id: a.id,
        label: a.label,
        sublabel: a.desc,
        icon: a.icon,
        path: a.path,
      }))
    }

    const items: SearchResult[] = []

    // Search cities
    const citySet = new Set<string>()
    for (const pl of plots) {
      if (pl.city && !citySet.has(pl.city)) {
        citySet.add(pl.city)
        if (pl.city.toLowerCase().includes(q)) {
          const cityPlots = plots.filter(pp => pp.city === pl.city)
          const avgPrice = cityPlots.reduce((s, pp) => s + p(pp).price, 0) / (cityPlots.length || 1)
          items.push({
            type: 'city',
            id: `city-${pl.city}`,
            label: pl.city,
            sublabel: `${cityPlots.length} חלקות · ממוצע ${fmt.compact(Math.round(avgPrice))}`,
            icon: CITY_ICONS[pl.city] || '📍',
            path: `/explore?city=${encodeURIComponent(pl.city)}`,
          })
        }
      }
    }

    // Search plots by block number, plot number, or city
    const matchingPlots = plots.filter(pl => {
      const d = p(pl)
      return String(d.block).includes(q) ||
             pl.number?.toLowerCase().includes(q) ||
             pl.city?.toLowerCase().includes(q) ||
             pl.description?.toLowerCase().includes(q)
    }).slice(0, 8)

    for (const pl of matchingPlots) {
      const d = p(pl)
      const score = calcScore(pl)
      const grade = getGrade(score)
      items.push({
        type: 'plot',
        id: pl.id,
        label: `גוש ${d.block} חלקה ${pl.number}`,
        sublabel: `${pl.city} · ${fmt.compact(d.price)} · ${grade.grade}`,
        icon: MapPin,
        iconBg: `${grade.color}15`,
        path: `/plot/${pl.id}`,
        score,
        price: d.price,
      })
    }

    // Search quick actions
    const matchingActions = QUICK_ACTIONS.filter(a =>
      a.label.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q)
    )
    for (const a of matchingActions) {
      items.push({
        type: 'action',
        id: a.id,
        label: a.label,
        sublabel: a.desc,
        icon: a.icon,
        path: a.path,
      })
    }

    return items
  }, [query, plots])

  // Reset focus when results change
  useEffect(() => { setFocusIdx(0) }, [results.length])

  const select = useCallback((item: SearchResult) => {
    setOpen(false)
    setQuery('')
    navigate(item.path)
  }, [navigate])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[focusIdx]) {
      e.preventDefault()
      select(results[focusIdx])
    }
  }, [results, focusIdx, select])

  // Group results by type
  const grouped = useMemo(() => {
    const cities = results.filter(r => r.type === 'city')
    const plotResults = results.filter(r => r.type === 'plot')
    const actions = results.filter(r => r.type === 'action')
    return { cities, plots: plotResults, actions }
  }, [results])

  if (!open) return null

  let idx = -1
  const renderItem = (item: SearchResult) => {
    idx++
    const i = idx
    const IconComp = typeof item.icon === 'string' ? null : item.icon
    return (
      <ResultItem
        key={item.id}
        $focused={i === focusIdx}
        data-focused={i === focusIdx || undefined}
        onClick={() => select(item)}
        onMouseEnter={() => setFocusIdx(i)}
        role="option"
        aria-selected={i === focusIdx}
      >
        <ResultIcon $bg={item.iconBg}>
          {IconComp ? <IconComp size={18} /> : <span>{item.icon}</span>}
        </ResultIcon>
        <ResultInfo>
          <ResultName>{item.label}</ResultName>
          <ResultMeta>
            {item.sublabel}
            {item.score != null && (
              <ResultMetaVal style={{ color: getGrade(item.score).color }}>
                {getGrade(item.score).grade}
              </ResultMetaVal>
            )}
          </ResultMeta>
        </ResultInfo>
        <ResultArrow><ArrowRight size={14} /></ResultArrow>
      </ResultItem>
    )
  }

  return (
    <Backdrop $open={open} onClick={() => setOpen(false)}>
      <Dialog onClick={e => e.stopPropagation()}>
        <SearchRow>
          <SearchIcon size={20} />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="חיפוש חלקות, ערים, פעולות..."
            autoComplete="off"
            role="combobox"
            aria-expanded={true}
            aria-label="חיפוש מהיר"
          />
          <CloseBtn onClick={() => setOpen(false)} aria-label="סגור">
            <X size={14} />
          </CloseBtn>
        </SearchRow>

        <ResultsWrap role="listbox">
          {results.length === 0 ? (
            <EmptyState>
              <EmptyIcon><Search size={22} color={t.textDim} /></EmptyIcon>
              <div style={{fontSize:14,fontWeight:700,color:t.text}}>לא נמצאו תוצאות</div>
              <div style={{fontSize:12}}>נסו לחפש עיר, גוש או מספר חלקה</div>
            </EmptyState>
          ) : (
            <>
              {query.trim() ? (
                <>
                  {grouped.cities.length > 0 && (
                    <>
                      <GroupLabel>📍 ערים</GroupLabel>
                      {grouped.cities.map(renderItem)}
                    </>
                  )}
                  {grouped.plots.length > 0 && (
                    <>
                      <GroupLabel>🗺️ חלקות</GroupLabel>
                      {grouped.plots.map(renderItem)}
                    </>
                  )}
                  {grouped.actions.length > 0 && (
                    <>
                      <GroupLabel>⚡ פעולות</GroupLabel>
                      {grouped.actions.map(renderItem)}
                    </>
                  )}
                </>
              ) : (
                <>
                  <GroupLabel>⚡ גישה מהירה</GroupLabel>
                  {results.map(renderItem)}
                </>
              )}
            </>
          )}
        </ResultsWrap>

        <Footer>
          <FooterKeys>
            <FooterKey><KbdHint>↑↓</KbdHint> ניווט</FooterKey>
            <FooterKey><KbdHint>↵</KbdHint> בחירה</FooterKey>
            <FooterKey><KbdHint>Esc</KbdHint> סגירה</FooterKey>
          </FooterKeys>
          <span>LandMap חיפוש מהיר</span>
        </Footer>
      </Dialog>
    </Backdrop>
  )
}
