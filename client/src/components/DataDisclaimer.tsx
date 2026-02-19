import { AlertTriangle, Shield, ExternalLink, Info } from 'lucide-react'
import styled from 'styled-components'
import { theme } from '../styles/theme'

type DataSource = {
  name: string
  nameEn: string
  org: string
  url: string
  type: string
  color: string
}

const DATA_SOURCES: DataSource[] = [
  {
    name: 'נדל"ן נט',
    nameEn: 'nadlan.gov.il',
    org: 'משרד המשפטים',
    url: 'https://www.nadlan.gov.il/',
    type: 'עסקאות נדל"ן',
    color: theme.colors.gold,
  },
  {
    name: 'מנהל התכנון',
    nameEn: 'govmap.gov.il',
    org: 'משרד הפנים',
    url: 'https://www.govmap.gov.il/',
    type: 'תכניות בניין עיר',
    color: theme.colors.blue,
  },
  {
    name: 'רשם המקרקעין',
    nameEn: 'tabu.gov.il',
    org: 'משרד המשפטים',
    url: 'https://www.gov.il/he/departments/topics/tabu-online',
    type: 'רישום טאבו',
    color: theme.colors.purple,
  },
]

type Variant = 'full' | 'compact' | 'inline'

type DataDisclaimerProps = {
  variant?: Variant
  lastUpdate?: string | null
  className?: string
}

export default function DataDisclaimer({
  variant = 'full',
  lastUpdate = null,
  className = '',
}: DataDisclaimerProps) {
  if (variant === 'inline') {
    return (
      <InlineWrap className={className}>
        <Info aria-hidden />
        <span>
          נתונים ממקורות ממשלתיים. אינו מהווה ייעוץ השקעות.
          {lastUpdate && <InlineUpdate>עודכן: {lastUpdate}</InlineUpdate>}
        </span>
      </InlineWrap>
    )
  }

  if (variant === 'compact') {
    return (
      <CompactWrap className={className}>
        <CompactRow>
          <AlertTriangle aria-hidden />
          <div>
            <CompactTitle>נתונים ממקורות ממשלתיים — לצורכי מידע בלבד</CompactTitle>
            <CompactBody>
              נדל"ן נט (nadlan.gov.il) · מנהל התכנון (govmap.gov.il) · אינו מהווה ייעוץ השקעות
            </CompactBody>
            {lastUpdate && <CompactUpdate>עדכון אחרון: {lastUpdate}</CompactUpdate>}
          </div>
        </CompactRow>
      </CompactWrap>
    )
  }

  return (
    <FullWrap className={className}>
      <Header>
        <HeaderIcon>
          <Shield aria-hidden />
        </HeaderIcon>
        <HeaderText>
          <HeaderTitle>מקורות מידע ואחריות</HeaderTitle>
          <HeaderSubtitle>שקיפות מלאה על מקורות הנתונים</HeaderSubtitle>
        </HeaderText>
      </Header>

      <Sources>
        {DATA_SOURCES.map((source) => (
          <SourceRow key={source.nameEn}>
            <SourceMarker $color={source.color} />
            <SourceContent>
              <SourceTitle>
                <span>{source.name}</span>
                <SourceLink href={source.url} target="_blank" rel="noopener noreferrer" $color={source.color}>
                  {source.nameEn}
                  <ExternalLink aria-hidden />
                </SourceLink>
              </SourceTitle>
              <SourceMeta>{source.org} · {source.type}</SourceMeta>
            </SourceContent>
          </SourceRow>
        ))}
      </Sources>

      <Disclaimers>
        <NoticeBox $tone="red">
          <NoticeRow>
            <AlertTriangle aria-hidden />
            <div>
              <NoticeTitle $tone="red">אין זה ייעוץ השקעות</NoticeTitle>
              <NoticeBody>
                המידע המוצג באתר הינו לצורכי מידע כללי בלבד ואינו מהווה המלצה, חוות דעת,
                או ייעוץ לרכישת נכסים. כל החלטת השקעה צריכה להתבצע לאחר התייעצות עם
                אנשי מקצוע מוסמכים — עו"ד, שמאי, יועץ מס ויועץ השקעות.
              </NoticeBody>
            </div>
          </NoticeRow>
        </NoticeBox>

        <NoticeBox $tone="blue">
          <NoticeRow>
            <Info aria-hidden />
            <div>
              <NoticeTitle $tone="blue">דיוק הנתונים</NoticeTitle>
              <NoticeBody>
                הנתונים מגיעים ממקורות ממשלתיים ציבוריים. ייתכנו אי-דיוקים, עיכובים
                בעדכון, או חוסרים. אין אנו אחראים לטעויות במידע.
                לאימות סופי — פנו ישירות למקורות הרשמיים.
              </NoticeBody>
            </div>
          </NoticeRow>
        </NoticeBox>

        {lastUpdate && <FooterUpdate>עדכון אחרון: {lastUpdate}</FooterUpdate>}
      </Disclaimers>
    </FullWrap>
  )
}

const InlineWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 9px;
  color: ${theme.colors.slate[500]};

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
`

const InlineUpdate = styled.span`
  margin-right: 4px;
`

const CompactWrap = styled.div`
  background: rgba(245, 158, 11, 0.05);
  border: 1px solid rgba(245, 158, 11, 0.15);
  border-radius: ${theme.radii.lg};
  padding: 0.75rem;
`

const CompactRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;

  svg {
    width: 16px;
    height: 16px;
    color: ${theme.colors.amber};
    flex-shrink: 0;
    margin-top: 2px;
  }
`

const CompactTitle = styled.p`
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: #fcd34d;
`

const CompactBody = styled.p`
  margin: 4px 0 0;
  font-size: 9px;
  color: ${theme.colors.slate[500]};
`

const CompactUpdate = styled.p`
  margin: 4px 0 0;
  font-size: 8px;
  color: ${theme.colors.slate[600]};
`

const FullWrap = styled.div`
  background: linear-gradient(180deg, rgba(22, 42, 74, 0.6), rgba(22, 42, 74, 0.4));
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${theme.radii.xl};
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`

const HeaderIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: ${theme.radii.lg};
  background: rgba(245, 158, 11, 0.15);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 20px;
    height: 20px;
    color: ${theme.colors.amber};
  }
`

const HeaderText = styled.div``

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
  color: ${theme.colors.slate[200]};
`

const HeaderSubtitle = styled.p`
  margin: 0;
  font-size: 10px;
  color: ${theme.colors.slate[500]};
`

const Sources = styled.div`
  padding: 1rem;
  display: grid;
  gap: 0.75rem;
`

const SourceRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
`

const SourceMarker = styled.div<{ $color: string }>`
  width: 4px;
  height: 32px;
  border-radius: ${theme.radii.full};
  background: ${({ $color }) => $color};
  flex-shrink: 0;
  margin-top: 2px;
`

const SourceContent = styled.div`
  flex: 1;
  min-width: 0;
`

const SourceTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 12px;
  color: ${theme.colors.slate[200]};
  font-weight: 600;
`

const SourceLink = styled.a<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 9px;
  color: ${({ $color }) => $color};
  text-decoration: none;
  transition: ${theme.transitions.fast};

  svg {
    width: 8px;
    height: 8px;
  }

  &:hover,
  &:focus-visible {
    color: ${theme.colors.gold};
  }
`

const SourceMeta = styled.p`
  margin: 0;
  font-size: 10px;
  color: ${theme.colors.slate[500]};
`

const Disclaimers = styled.div`
  padding: 1rem;
  padding-top: 0;
  display: grid;
  gap: 0.75rem;
`

const NoticeBox = styled.div<{ $tone: 'red' | 'blue' }>`
  background: ${({ $tone }) => ($tone === 'red' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(59, 130, 246, 0.05)')};
  border: 1px solid ${({ $tone }) => ($tone === 'red' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)')};
  border-radius: ${theme.radii.lg};
  padding: 0.75rem;
`

const NoticeRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    margin-top: 2px;
    color: ${theme.colors.red};
  }
`

const NoticeTitle = styled.p<{ $tone: 'red' | 'blue' }>`
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: ${({ $tone }) => ($tone === 'red' ? '#fca5a5' : '#93c5fd')};
`

const NoticeBody = styled.p`
  margin: 4px 0 0;
  font-size: 9px;
  color: ${theme.colors.slate[400]};
  line-height: 1.6;
`

const FooterUpdate = styled.p`
  margin: 0;
  text-align: center;
  font-size: 9px;
  color: ${theme.colors.slate[600]};
`
