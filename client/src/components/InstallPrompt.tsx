import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import styled, { keyframes } from 'styled-components'
import { theme, media } from '../styles/theme'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('landmap_pwa_dismissed')) return undefined
    if (window.matchMedia('(display-mode: standalone)').matches) return undefined

    const handler = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      window.setTimeout(() => setShow(true), 30000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShow(false)
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem('landmap_pwa_dismissed', '1')
  }

  if (!show) return null

  return (
    <Wrapper dir="rtl">
      <Card>
        <Header>
          <AppIcon>🗺️</AppIcon>
          <HeaderText>
            <h3>התקן את LandMap</h3>
            <p>גישה מהירה למפת הקרקעות ישירות ממסך הבית — גם אופליין</p>
          </HeaderText>
          <CloseButton type="button" onClick={handleDismiss}>
            <X aria-hidden />
          </CloseButton>
        </Header>
        <Actions>
          <PrimaryButton type="button" onClick={handleInstall}>
            <Download aria-hidden />
            התקן עכשיו
          </PrimaryButton>
          <SecondaryButton type="button" onClick={handleDismiss}>
            לא עכשיו
          </SecondaryButton>
        </Actions>
      </Card>
    </Wrapper>
  )
}

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`

const Wrapper = styled.div`
  position: fixed;
  bottom: 5rem;
  left: 1rem;
  right: 1rem;
  z-index: 90;
  animation: ${slideUp} 0.35s ease;

  ${media.sm} {
    bottom: 1rem;
    left: auto;
    right: 1rem;
    width: 20rem;
  }
`

const Card = styled.div`
  background: rgba(22, 42, 74, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(200, 148, 42, 0.2);
  border-radius: ${theme.radii.xl};
  padding: 1rem;
  box-shadow: 0 24px 40px rgba(0, 0, 0, 0.4);
`

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
`

const AppIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${theme.radii.lg};
  background: ${theme.gradients.gold};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  flex-shrink: 0;
`

const HeaderText = styled.div`
  flex: 1;
  min-width: 0;

  h3 {
    margin: 0 0 2px;
    font-size: 0.875rem;
    font-weight: 700;
    color: ${theme.colors.slate[200]};
  }

  p {
    margin: 0;
    font-size: 12px;
    color: ${theme.colors.slate[400]};
    line-height: 1.5;
  }
`

const CloseButton = styled.button`
  width: 24px;
  height: 24px;
  border-radius: ${theme.radii.md};
  border: none;
  background: rgba(255, 255, 255, 0.05);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.slate[500]};
  transition: ${theme.transitions.fast};
  flex-shrink: 0;

  svg {
    width: 12px;
    height: 12px;
  }

  &:hover,
  &:focus-visible {
    background: rgba(255, 255, 255, 0.1);
  }
`

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
`

const PrimaryButton = styled.button`
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-radius: ${theme.radii.lg};
  border: none;
  background: ${theme.gradients.gold};
  color: ${theme.colors.navy};
  font-size: 12px;
  font-weight: 700;
  transition: ${theme.transitions.normal};

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover,
  &:focus-visible {
    box-shadow: 0 12px 20px rgba(200, 148, 42, 0.3);
  }
`

const SecondaryButton = styled.button`
  padding: 0.625rem 1rem;
  border-radius: ${theme.radii.lg};
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: ${theme.colors.slate[400]};
  font-size: 12px;
  transition: ${theme.transitions.fast};

  &:hover,
  &:focus-visible {
    background: rgba(255, 255, 255, 0.1);
  }
`
