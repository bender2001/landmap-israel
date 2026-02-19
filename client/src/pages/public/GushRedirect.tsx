import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import styled from 'styled-components'
import { MapPin, Search, ArrowLeft } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import { useMetaTags } from '../../hooks/useSEO'
import { theme } from '../../styles/theme'

type RouteParams = {
  block?: string
  parcel?: string
}

const Page = styled.div`
  min-height: 100vh;
  background: ${theme.colors.navy};
  display: flex;
  align-items: center;
  justify-content: center;
  direction: rtl;
`

const LoadingCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px 32px;
  border-radius: 16px;
  background: rgba(22, 42, 74, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
`

const LoadingSpinner = styled(Spinner)`
  width: 40px;
  height: 40px;
  color: ${theme.colors.gold};
`

const LoadingText = styled.span`
  font-size: 14px;
  color: ${theme.colors.slate[400]};
`

const ErrorPage = styled(Page)`
  flex-direction: column;
  padding: 0 16px;
`

const ErrorCard = styled.div`
  width: 100%;
  max-width: 420px;
  text-align: center;
  padding: 32px;
  border-radius: 16px;
  background: ${theme.glass.bg};
  border: ${theme.glass.border};
  box-shadow: ${theme.shadows.glass};
  backdrop-filter: ${theme.glass.blur};
  -webkit-backdrop-filter: ${theme.glass.blur};
`

const ErrorIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;

  svg {
    width: 32px;
    height: 32px;
    color: #fbbf24;
  }
`

const ErrorTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
  margin-bottom: 8px;
`

const ErrorMeta = styled.p`
  font-size: 14px;
  color: ${theme.colors.slate[400]};
  margin-bottom: 8px;
`

const ErrorMetaValue = styled.span`
  font-weight: 700;
  color: ${theme.colors.gold};
`

const ErrorHint = styled.p`
  font-size: 12px;
  color: ${theme.colors.slate[500]};
  margin-bottom: 24px;
`

const ErrorActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const PrimaryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 12px;
  background: linear-gradient(90deg, ${theme.colors.gold}, ${theme.colors.goldBright});
  color: ${theme.colors.navy};
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  transition: box-shadow ${theme.transitions.normal};

  &:hover {
    box-shadow: 0 12px 24px rgba(200, 148, 42, 0.3);
  }
`

const SecondaryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  color: ${theme.colors.slate[400]};
  text-decoration: none;
  transition: color ${theme.transitions.normal};

  &:hover {
    color: ${theme.colors.gold};
  }
`

export default function GushRedirect() {
  const { block, parcel } = useParams<RouteParams>()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useMetaTags({
    title: `גוש ${block ?? ''} חלקה ${parcel ?? ''} — LandMap Israel`,
    description: `מחפש גוש ${block ?? ''} חלקה ${parcel ?? ''}...`,
  })

  useEffect(() => {
    let cancelled = false

    const resolve = async () => {
      try {
        const res = await fetch(`/api/plots/by-gush/${encodeURIComponent(block ?? '')}/${encodeURIComponent(parcel ?? '')}`)
        if (cancelled) return

        if (res.ok) {
          const data = await res.json() as { id?: string }
          if (data.id) {
            navigate(`/plot/${data.id}`, { replace: true })
            return
          }
        }

        const errorData = res.status === 404
          ? { message: `לא נמצאה חלקה: גוש ${block} חלקה ${parcel}` }
          : { message: 'שגיאה בחיפוש החלקה' }

        setError(errorData.message)
      } catch {
        if (!cancelled) setError('שגיאה בחיבור לשרת')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    resolve()
    return () => { cancelled = true }
  }, [block, parcel, navigate])

  if (isLoading) {
    return (
      <Page>
        <LoadingCard>
          <LoadingSpinner />
          <LoadingText>מחפש גוש {block} חלקה {parcel}...</LoadingText>
        </LoadingCard>
      </Page>
    )
  }

  if (error) {
    return (
      <ErrorPage>
        <ErrorCard>
          <ErrorIcon>
            <MapPin />
          </ErrorIcon>
          <ErrorTitle>לא נמצאה חלקה</ErrorTitle>
          <ErrorMeta>
            גוש <ErrorMetaValue>{block}</ErrorMetaValue> חלקה <ErrorMetaValue>{parcel}</ErrorMetaValue>
          </ErrorMeta>
          <ErrorHint>ייתכן שהחלקה לא פורסמה עדיין, או שמספרי הגוש/חלקה שגויים.</ErrorHint>
          <ErrorActions>
            <PrimaryLink to={`/?q=${block ?? ''}`}>
              <Search size={16} />
              חפש גוש {block} במפה
            </PrimaryLink>
            <SecondaryLink to="/">
              <ArrowLeft size={16} />
              חזרה למפה הראשית
            </SecondaryLink>
          </ErrorActions>
        </ErrorCard>
      </ErrorPage>
    )
  }

  return null
}
