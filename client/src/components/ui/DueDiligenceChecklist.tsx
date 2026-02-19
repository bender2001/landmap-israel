import { useState, useEffect, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import {
  CheckCircle2,
  Circle,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'
import { theme } from '../../styles/theme'

type ChecklistCategory = 'legal' | 'planning' | 'financial' | 'physical' | 'professional'

type ChecklistItem = {
  id: string
  label: string
  description: string
  link?: string
  category: ChecklistCategory
}

interface DueDiligenceChecklistProps {
  plotId?: string | number
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'tabu_extract',
    label: 'נסח טאבו',
    description: 'הוצאת נסח טאבו עדכני מרשם המקרקעין',
    link: 'https://www.gov.il/he/departments/topics/tabu-online',
    category: 'legal',
  },
  {
    id: 'land_registry',
    label: 'בדיקת בעלות',
    description: 'אימות בעלות על הקרקע ובדיקת שעבודים/עיקולים',
    category: 'legal',
  },
  {
    id: 'zoning_check',
    label: 'בדיקת ייעוד קרקע',
    description: 'אימות ייעוד הקרקע בוועדה המקומית לתכנון ובנייה',
    link: 'https://www.govmap.gov.il',
    category: 'planning',
  },
  {
    id: 'taba_plan',
    label: 'תוכנית בניין עיר (תב״ע)',
    description: 'בדיקת תב"ע החלה על החלקה וזכויות בנייה',
    category: 'planning',
  },
  {
    id: 'betterment_levy',
    label: 'היטל השבחה',
    description: 'בדיקת חבות היטל השבחה צפוי בעירייה',
    category: 'financial',
  },
  {
    id: 'tax_authority',
    label: 'שומת מס שבח',
    description: 'בדיקת שומת מס שבח צפויה ברשות המיסים',
    category: 'financial',
  },
  {
    id: 'infrastructure',
    label: 'תשתיות',
    description: 'בדיקת חיבור לתשתיות: מים, חשמל, ביוב, כבישים',
    category: 'physical',
  },
  {
    id: 'site_visit',
    label: 'ביקור בשטח',
    description: 'ביקור פיזי בחלקה ובדיקת הסביבה',
    category: 'physical',
  },
  {
    id: 'appraiser',
    label: 'שמאי מקרקעין',
    description: 'קבלת חוות דעת שמאי מוסמך',
    category: 'professional',
  },
  {
    id: 'lawyer',
    label: 'עורך דין מקרקעין',
    description: 'ייעוץ וליווי משפטי של עו"ד המתמחה במקרקעין',
    category: 'professional',
  },
]

const CATEGORIES: Record<ChecklistCategory, { label: string; emoji: string }> = {
  legal: { label: 'משפטי', emoji: '⚖️' },
  planning: { label: 'תכנון', emoji: '📐' },
  financial: { label: 'פיננסי', emoji: '💰' },
  physical: { label: 'פיזי', emoji: '🏗️' },
  professional: { label: 'מקצועי', emoji: '👨‍💼' },
}

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
`

const Wrapper = styled.div`
  background: rgba(22, 42, 74, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${theme.radii.lg};
  overflow: hidden;
  margin: 12px 0;
`

const HeaderButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: ${theme.transitions.normal};
  text-align: right;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`

const HeaderIcon = styled.div<{ $complete: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: ${theme.radii.md};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ $complete }) => ($complete ? 'rgba(34,197,94,0.2)' : 'rgba(200,148,42,0.15)')};
`

const HeaderText = styled.div`
  flex: 1;
`

const HeaderTitle = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${theme.colors.slate[200]};
`

const HeaderSub = styled.div`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
  margin-top: 2px;
`

const ProgressRing = styled.div`
  position: relative;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
`

const ProgressValue = styled.span<{ $complete: boolean }>`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  color: ${({ $complete }) => ($complete ? theme.colors.emerald : theme.colors.gold)};
`

const Content = styled.div`
  padding: 4px 16px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: ${fadeIn} 0.2s ease-out;
`

const Callout = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: rgba(249, 115, 22, 0.8);
  background: rgba(249, 115, 22, 0.05);
  border: 1px solid rgba(249, 115, 22, 0.1);
  border-radius: ${theme.radii.md};
  padding: 8px 12px;
`

const CategoryTitle = styled.div`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
  font-weight: 500;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
`

const Items = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const Item = styled.div<{ $done: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 12px;
  border-radius: ${theme.radii.md};
  cursor: pointer;
  transition: ${theme.transitions.normal};
  background: ${({ $done }) => ($done ? 'rgba(34,197,94,0.05)' : 'transparent')};

  &:hover {
    background: ${({ $done }) => ($done ? 'rgba(34,197,94,0.08)' : 'rgba(255, 255, 255, 0.02)')};
  }
`

const ItemText = styled.div`
  flex: 1;
  min-width: 0;
`

const ItemLabel = styled.div<{ $done: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${({ $done }) => ($done ? theme.colors.emerald : theme.colors.slate[300])};
  text-decoration: ${({ $done }) => ($done ? 'line-through' : 'none')};
  opacity: ${({ $done }) => ($done ? 0.7 : 1)};
`

const ItemDesc = styled.div`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
  margin-top: 2px;
`

const ItemLink = styled.a`
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: ${theme.transitions.normal};

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  svg {
    color: ${theme.colors.slate[500]};
  }

  &:hover svg {
    color: ${theme.colors.gold};
  }
`

const Success = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: ${theme.colors.emerald};
  background: rgba(34, 197, 94, 0.05);
  border: 1px solid rgba(34, 197, 94, 0.1);
  border-radius: ${theme.radii.md};
  padding: 8px 12px;
`

const getStorageKey = (plotId: string | number) => `landmap_dd_${plotId}`

export default function DueDiligenceChecklist({ plotId }: DueDiligenceChecklistProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (!plotId) return
    try {
      const saved = JSON.parse(localStorage.getItem(getStorageKey(plotId)) || '{}') as Record<string, boolean>
      setChecked(saved)
    } catch (error) {
      setChecked({})
    }
  }, [plotId])

  const toggle = useCallback(
    (itemId: string) => {
      setChecked(prev => {
        const next = { ...prev, [itemId]: !prev[itemId] }
        try {
          if (plotId) {
            localStorage.setItem(getStorageKey(plotId), JSON.stringify(next))
          }
        } catch (error) {
          console.warn('Failed to persist checklist state', error)
        }
        return next
      })
    },
    [plotId]
  )

  const completedCount = CHECKLIST_ITEMS.filter(item => checked[item.id]).length
  const totalCount = CHECKLIST_ITEMS.length
  const progressPct = Math.round((completedCount / totalCount) * 100)
  const isComplete = completedCount === totalCount

  const grouped = CHECKLIST_ITEMS.reduce<Record<ChecklistCategory, ChecklistItem[]>>(
    (acc, item) => {
      acc[item.category].push(item)
      return acc
    },
    { legal: [], planning: [], financial: [], physical: [], professional: [] }
  )

  return (
    <Wrapper>
      <HeaderButton onClick={() => setIsExpanded(prev => !prev)}>
        <HeaderIcon $complete={isComplete}>
          <ClipboardCheck size={16} color={isComplete ? theme.colors.emerald : theme.colors.gold} />
        </HeaderIcon>
        <HeaderText>
          <HeaderTitle>בדיקת נאותות (Due Diligence)</HeaderTitle>
          <HeaderSub>
            {completedCount}/{totalCount} שלבים הושלמו
          </HeaderSub>
        </HeaderText>
        <ProgressRing>
          <svg viewBox="0 0 36 36" width="36" height="36" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke={isComplete ? theme.colors.emerald : theme.colors.gold}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${progressPct * 0.942} 100`}
              style={{ transition: theme.transitions.smooth }}
            />
          </svg>
          <ProgressValue $complete={isComplete}>{progressPct}%</ProgressValue>
        </ProgressRing>
        {isExpanded ? (
          <ChevronUp size={14} color={theme.colors.slate[400]} />
        ) : (
          <ChevronDown size={14} color={theme.colors.slate[400]} />
        )}
      </HeaderButton>

      {isExpanded && (
        <Content>
          {completedCount === 0 && (
            <Callout>
              <AlertTriangle size={12} />
              <span>מומלץ להשלים את כל שלבי הבדיקה לפני רכישה</span>
            </Callout>
          )}

          {Object.entries(grouped).map(([catKey, items]) => {
            const cat = CATEGORIES[catKey as ChecklistCategory]
            return (
              <div key={catKey}>
                <CategoryTitle>
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </CategoryTitle>
                <Items>
                  {items.map(item => {
                    const isDone = !!checked[item.id]
                    return (
                      <Item key={item.id} $done={isDone} onClick={() => toggle(item.id)}>
                        {isDone ? (
                          <CheckCircle2 size={16} color={theme.colors.emerald} style={{ marginTop: 2 }} />
                        ) : (
                          <Circle size={16} color={theme.colors.slate[600]} style={{ marginTop: 2 }} />
                        )}
                        <ItemText>
                          <ItemLabel $done={isDone}>{item.label}</ItemLabel>
                          <ItemDesc>{item.description}</ItemDesc>
                        </ItemText>
                        {item.link && (
                          <ItemLink
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={event => event.stopPropagation()}
                            title="פתח קישור"
                          >
                            <ExternalLink size={12} />
                          </ItemLink>
                        )}
                      </Item>
                    )
                  })}
                </Items>
              </div>
            )
          })}

          {isComplete && (
            <Success>
              <CheckCircle2 size={14} />
              <span>כל שלבי הבדיקה הושלמו! ✨</span>
            </Success>
          )}
        </Content>
      )}
    </Wrapper>
  )
}
