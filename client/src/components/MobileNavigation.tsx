import { memo } from 'react'
import styled from 'styled-components'
import { MapIcon, Heart, Layers } from 'lucide-react'
import { t, mobile } from '../theme'

/* ── Mobile Navigation Components ── */
export interface MobileNavProps {
  tab: 'map' | 'fav'
  listOpen: boolean
  favIds: string[]
  sortedLength: number
  mapFullscreen: boolean
  onTabChange: (tab: 'map' | 'fav') => void
  onListToggle: () => void
}

const MobileNavContainer = styled.nav`
  display:none;position:fixed;bottom:0;left:0;right:0;z-index:${t.z.nav};
  background:${t.surface};border-top:1px solid ${t.border};
  ${mobile}{display:flex;justify-content:space-around;align-items:center;height:56px;}
`

const NavIndicator = styled.div<{$idx:number;$total:number}>`
  position:absolute;top:-1px;height:3px;
  width:${pr => Math.round(100 / pr.$total)}%;
  right:${pr => Math.round((pr.$idx / pr.$total) * 100)}%;
  background:linear-gradient(90deg,${t.gold},${t.goldBright});
  border-radius:0 0 3px 3px;
  transition:right 0.35s cubic-bezier(0.32,0.72,0,1);
  box-shadow:0 2px 8px rgba(212,168,75,0.35);
`

const NavBtn = styled.button<{$active?:boolean}>`
  display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:none;
  color:${pr=>pr.$active?t.gold:t.textDim};font-size:10px;font-family:${t.font};cursor:pointer;
  padding:4px 12px;transition:color ${t.tr};transform:${pr=>pr.$active?'scale(1.05)':'scale(1)'};
  transition:color ${t.tr},transform 0.2s cubic-bezier(0.32,0.72,0,1);
`

const NavBtnWrap = styled.div`
  position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;
`

const NavBadge = styled.span`
  position:absolute;top:-2px;right:-4px;
  display:inline-flex;align-items:center;justify-content:center;
  min-width:16px;height:16px;padding:0 4px;
  background:${t.gold};color:${t.bg};
  border-radius:${t.r.full};font-size:9px;font-weight:800;line-height:1;
  box-shadow:0 1px 4px rgba(212,168,75,0.4);
`

export const MobileNavigation = memo<MobileNavProps>(({
  tab,
  listOpen,
  favIds,
  sortedLength,
  mapFullscreen,
  onTabChange,
  onListToggle
}) => {
  if (mapFullscreen) return null

  const currentTab = tab === 'map' && listOpen ? 'areas' : tab
  const activeIndex = currentTab === 'fav' ? 1 : currentTab === 'areas' ? 2 : 0

  return (
    <MobileNavContainer role="navigation" aria-label="ניווט ראשי">
      <NavIndicator $idx={activeIndex} $total={3} />
      
      <NavBtn 
        $active={tab === 'map' && !listOpen} 
        onClick={() => { onTabChange('map'); onListToggle() }} 
        aria-label="מפה" 
        aria-current={tab === 'map' && !listOpen ? 'page' : undefined}
      >
        <NavBtnWrap>
          <MapIcon size={20} />
        </NavBtnWrap>
        מפה
      </NavBtn>

      <NavBtn 
        $active={tab === 'fav'} 
        onClick={() => { onTabChange('fav'); onListToggle() }} 
        aria-label={`מועדפים${favIds.length > 0 ? ` (${favIds.length})` : ''}`} 
        aria-current={tab === 'fav' ? 'page' : undefined}
      >
        <NavBtnWrap>
          <Heart size={20} />
          {favIds.length > 0 && <NavBadge>{favIds.length}</NavBadge>}
        </NavBtnWrap>
        מועדפים
      </NavBtn>

      <NavBtn 
        $active={tab === 'map' && listOpen} 
        onClick={() => { onTabChange('map'); onListToggle() }} 
        aria-label="רשימת חלקות" 
        aria-current={tab === 'map' && listOpen ? 'page' : undefined}
      >
        <NavBtnWrap>
          <Layers size={20} />
          {sortedLength > 0 && (
            <NavBadge>{sortedLength > 99 ? '99+' : sortedLength}</NavBadge>
          )}
        </NavBtnWrap>
        רשימה
      </NavBtn>
    </MobileNavContainer>
  )
})

MobileNavigation.displayName = 'MobileNavigation'

export default MobileNavigation