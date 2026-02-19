import { useEffect, useState } from 'react'
import { Shield } from 'lucide-react'
import styled, { keyframes } from 'styled-components'
import { theme, media } from '../styles/theme'

const CONSENT_KEY = 'landmap_cookie_consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY)
    if (!consent) {
      const timer = window.setTimeout(() => setVisible(true), 4000)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [])

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setVisible(false)
  }

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <Wrapper dir="rtl">
      <Card>
        <HeaderRow>
          <IconBadge>
            <Shield aria-hidden />
          </IconBadge>
          <HeaderContent>
            <Title>פרטיות ועוגיות</Title>
            <Description>
              אנו משתמשים בעוגיות לשיפור חוויית השימוש, ניתוח תעבורה ושמירת העדפות.
              בלחיצה על ״אישור״ אתה מסכים ל
              <PrivacyLink href="/privacy">מדיניות הפרטיות</PrivacyLink>
              שלנו.
            </Description>
          </HeaderContent>
        </HeaderRow>
        <Actions>
          <PrimaryButton type="button" onClick={accept}>
            אישור
          </PrimaryButton>
          <SecondaryButton type="button" onClick={decline}>
            רק הכרחיות
          </SecondaryButton>
        </Actions>
      </Card>
    </Wrapper>
  )
}

const slideUp = keyframes`
  from {
    transform: translateY(12px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`

const Wrapper = styled.div`
  position: fixed;
  left: 1rem;
  right: 1rem;
  bottom: 1rem;
  z-index: 80;
  animation: ${slideUp} 0.35s ease;

  ${media.sm} {
    left: auto;
    right: 1rem;
    max-width: 24rem;
  }
`

const Card = styled.div`
  background: rgba(22, 42, 74, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.xl};
  box-shadow: 0 24px 40px rgba(0, 0, 0, 0.4);
  padding: 1.25rem;
`

const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`

const IconBadge = styled.div`
  width: 32px;
  height: 32px;
  border-radius: ${theme.radii.md};
  background: rgba(200, 148, 42, 0.15);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 16px;
    height: 16px;
    color: ${theme.colors.gold};
  }
`

const HeaderContent = styled.div`
  flex: 1;
  min-width: 0;
`

const Title = styled.h3`
  margin: 0 0 0.25rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: ${theme.colors.slate[200]};
`

const Description = styled.p`
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.6;
  color: ${theme.colors.slate[400]};
`

const PrivacyLink = styled.a`
  color: ${theme.colors.gold};
  text-decoration: none;
  margin: 0 2px;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
  }
`

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
`

const PrimaryButton = styled.button`
  flex: 1;
  border: none;
  border-radius: ${theme.radii.lg};
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: ${theme.colors.navy};
  background: ${theme.gradients.gold};
  transition: ${theme.transitions.normal};

  &:hover,
  &:focus-visible {
    box-shadow: 0 12px 20px rgba(200, 148, 42, 0.2);
  }
`

const SecondaryButton = styled.button`
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.lg};
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  color: ${theme.colors.slate[400]};
  background: rgba(255, 255, 255, 0.05);
  transition: ${theme.transitions.fast};

  &:hover,
  &:focus-visible {
    background: rgba(255, 255, 255, 0.1);
  }
`
