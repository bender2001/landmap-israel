import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { Map, Search, Calculator, MapPin, BarChart3, Heart, type LucideIcon } from 'lucide-react'
import { useMetaTags } from '../../hooks/useSEO'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import { theme, media } from '../../styles/theme'

type SuggestedLink = {
  to: string
  icon: LucideIcon
  label: string
  desc: string
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`

const Page = styled.div`
  min-height: 100vh;
  background: ${theme.colors.navy};
  display: flex;
  flex-direction: column;
  direction: rtl;
`

const Main = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 16px 48px;
`

const TitleWrap = styled.div`
  position: relative;
  margin-bottom: 32px;
`

const TitleText = styled.h1`
  font-size: clamp(120px, 20vw, 180px);
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(180deg, ${theme.colors.gold} 0%, ${theme.colors.goldBright} 45%, rgba(200, 148, 42, 0.2) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
  user-select: none;
  animation: ${fadeIn} 0.6s ease both;
`

const TitleGlow = styled.div`
  position: absolute;
  inset: 0;
  font-size: clamp(120px, 20vw, 180px);
  font-weight: 900;
  line-height: 1;
  color: rgba(200, 148, 42, 0.08);
  filter: blur(24px);
  user-select: none;
`

const Card = styled.div`
  width: 100%;
  max-width: 520px;
  text-align: center;
  padding: 32px;
  background: ${theme.glass.bg};
  border: ${theme.glass.border};
  border-radius: ${theme.radii.lg};
  box-shadow: ${theme.shadows.glass};
  backdrop-filter: ${theme.glass.blur};
  -webkit-backdrop-filter: ${theme.glass.blur};
  animation: ${fadeInUp} 0.7s ease both;
`

const CardTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
  margin-bottom: 12px;
`

const CardText = styled.p`
  color: ${theme.colors.slate[400]};
  margin-bottom: 8px;
`

const PathHint = styled.p`
  font-size: 11px;
  color: ${theme.colors.slate[600]};
  margin-bottom: 16px;
  font-family: ${theme.fonts.mono};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Countdown = styled.p`
  font-size: 11px;
  color: ${theme.colors.slate[500]};
  margin-bottom: 24px;
`

const CountdownValue = styled.span`
  color: ${theme.colors.gold};
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`

const SearchForm = styled.form`
  position: relative;
  margin-bottom: 24px;
`

const SearchIcon = styled(Search)`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: ${theme.colors.slate[500]};
`

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 40px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(22, 42, 74, 0.6);
  color: ${theme.colors.slate[200]};
  font-size: 14px;
  outline: none;
  transition: border-color ${theme.transitions.normal};

  &::placeholder {
    color: ${theme.colors.slate[500]};
  }

  &:focus {
    border-color: rgba(200, 148, 42, 0.5);
  }
`

const SearchButton = styled.button`
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid rgba(200, 148, 42, 0.4);
  background: rgba(200, 148, 42, 0.2);
  color: ${theme.colors.gold};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background ${theme.transitions.normal};

  &:hover {
    background: rgba(200, 148, 42, 0.3);
  }
`

const QuickLinks = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;

  ${media.sm} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

const QuickLinkCard = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.03);
  text-decoration: none;
  transition: border-color ${theme.transitions.normal}, background ${theme.transitions.normal}, transform ${theme.transitions.normal};

  &:hover {
    border-color: rgba(200, 148, 42, 0.3);
    background: rgba(200, 148, 42, 0.05);
    transform: translateY(-2px);
  }
`

const QuickIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(200, 148, 42, 0.1);
  border: 1px solid rgba(200, 148, 42, 0.2);

  svg {
    width: 20px;
    height: 20px;
    color: ${theme.colors.gold};
  }
`

const QuickLabel = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${theme.colors.slate[200]};
`

const QuickDesc = styled.span`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
  text-align: center;
`

function useSuggestedLinks(pathname: string): SuggestedLink[] {
  const defaultLinks: SuggestedLink[] = [
    { to: '/', icon: Map, label: 'מפת חלקות', desc: 'צפה בכל החלקות על המפה' },
    { to: '/areas', icon: MapPin, label: 'סקירת אזורים', desc: 'השוואת ערים ואזורים' },
    { to: '/calculator', icon: Calculator, label: 'מחשבון השקעה', desc: 'חשב תשואה צפויה' },
  ]

  if (!pathname || pathname === '/') return defaultLinks

  const lower = pathname.toLowerCase()

  if (lower.includes('plot') || lower.includes('gush') || lower.includes('parcel')) {
    return [
      { to: '/', icon: Map, label: 'מפת חלקות', desc: 'חפש חלקות על המפה האינטראקטיבית' },
      { to: '/areas', icon: MapPin, label: 'סקירת אזורים', desc: 'עיין באזורים לפי עיר' },
      { to: '/favorites', icon: Heart, label: 'מועדפים', desc: 'צפה בחלקות שמורות' },
    ]
  }

  if (lower.includes('area') || lower.includes('city')) {
    return [
      { to: '/areas', icon: MapPin, label: 'סקירת אזורים', desc: 'כל הערים והאזורים' },
      { to: '/', icon: Map, label: 'מפת חלקות', desc: 'צפה בכל החלקות על המפה' },
      { to: '/calculator', icon: Calculator, label: 'מחשבון השקעה', desc: 'חשב תשואה צפויה' },
    ]
  }

  if (lower.includes('price') || lower.includes('compare') || lower.includes('calc')) {
    return [
      { to: '/calculator', icon: Calculator, label: 'מחשבון השקעה', desc: 'חשב תשואה צפויה' },
      { to: '/compare', icon: BarChart3, label: 'השוואת חלקות', desc: 'השווה בין חלקות' },
      { to: '/', icon: Map, label: 'מפת חלקות', desc: 'צפה בכל החלקות על המפה' },
    ]
  }

  return defaultLinks
}

export default function NotFound() {
  useMetaTags({
    title: 'הדף לא נמצא — LandMap Israel',
    description: 'הדף שחיפשת לא קיים. חזרו למפת הקרקעות או חפשו חלקה ספציפית.',
  })

  const [query, setQuery] = useState('')
  const [countdown, setCountdown] = useState(15)
  const navigate = useNavigate()
  const location = useLocation()
  const quickLinks = useSuggestedLinks(location.pathname)

  useEffect(() => {
    if (countdown <= 0) {
      navigate('/', { replace: true })
      return
    }
    const timer = setTimeout(() => setCountdown((current) => current - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown, navigate])

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (query.trim()) {
      navigate(`/?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <Page>
      <PublicNav />

      <Main>
        <TitleWrap>
          <TitleText>404</TitleText>
          <TitleGlow>404</TitleGlow>
        </TitleWrap>

        <Card>
          <CardTitle>הדף לא נמצא</CardTitle>
          <CardText>מצטערים, הדף שחיפשת לא קיים או שהקישור שגוי.</CardText>
          {location.pathname !== '/' && <PathHint>{location.pathname}</PathHint>}
          <Countdown>
            מפנים לעמוד הראשי בעוד <CountdownValue>{countdown}</CountdownValue> שניות...
          </Countdown>

          <SearchForm onSubmit={handleSearch}>
            <SearchIcon />
            <SearchInput
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חיפוש גוש, חלקה, עיר..."
              autoFocus
            />
            {query.trim() && <SearchButton type="submit">חפש</SearchButton>}
          </SearchForm>

          <QuickLinks>
            {quickLinks.map(({ to, icon: Icon, label, desc }) => (
              <QuickLinkCard key={to} to={to}>
                <QuickIcon>
                  <Icon />
                </QuickIcon>
                <QuickLabel>{label}</QuickLabel>
                <QuickDesc>{desc}</QuickDesc>
              </QuickLinkCard>
            ))}
          </QuickLinks>
        </Card>
      </Main>

      <PublicFooter />
    </Page>
  )
}
