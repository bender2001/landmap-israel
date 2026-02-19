import { useState, useCallback, memo } from 'react'
import styled, { keyframes } from 'styled-components'
import { Eye, EyeOff, ExternalLink, MapPin, RotateCcw } from 'lucide-react'
import { theme } from '../../styles/theme'

interface StreetViewPanelProps {
  lat?: number
  lng?: number
  heading?: number
  className?: string
}

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const Card = styled.div`
  border-radius: ${theme.radii.lg};
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.02);
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const HeaderTitle = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${theme.colors.slate[300]};
`

const LoadingTag = styled.span`
  font-size: 9px;
  color: ${theme.colors.slate[600]};
  animation: pulse 1.6s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
`

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const IconButton = styled.button`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
  background: transparent;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: ${theme.transitions.normal};

  &:hover {
    color: ${theme.colors.gold};
  }
`

const LinkButton = styled.a`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: ${theme.transitions.normal};

  &:hover {
    color: ${theme.colors.gold};
  }
`

const PanelBody = styled.div<{ $expanded: boolean }>`
  position: relative;
  background: rgba(22, 42, 74, 0.6);
  height: ${({ $expanded }) => ($expanded ? '320px' : '180px')};
  transition: ${theme.transitions.smooth};
`

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(22, 42, 74, 0.8);
  z-index: 1;
`

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${theme.radii.full};
  border: 2px solid rgba(200, 148, 42, 0.2);
  border-top-color: ${theme.colors.gold};
  animation: ${spin} 1s linear infinite;
  margin: 0 auto 8px;
`

const LoadingText = styled.span`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
`

const Footer = styled.div`
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.01);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 9px;
  color: ${theme.colors.slate[600]};
`

const ErrorCard = styled.div`
  border-radius: ${theme.radii.lg};
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 16px;
`

const ErrorHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`

const ErrorTitle = styled.span`
  font-size: 12px;
  color: ${theme.colors.slate[400]};
`

const ErrorContent = styled.div`
  text-align: center;
  padding: 16px 0;
`

const ErrorText = styled.p`
  font-size: 11px;
  color: ${theme.colors.slate[500]};
  margin: 8px 0 12px;
`

const ErrorLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: ${theme.colors.gold};
  transition: ${theme.transitions.normal};

  &:hover {
    color: ${theme.colors.goldBright};
  }
`

const StreetViewPanel = memo(function StreetViewPanel({
  lat,
  lng,
  heading = 0,
  className = '',
}: StreetViewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const toggleExpand = useCallback(() => setIsExpanded(prev => !prev), [])

  if (!lat || !lng || !isFinite(lat) || !isFinite(lng)) return null

  const streetViewUrl = `https://www.google.com/maps/embed?pb=!4v${Date.now()}!6m8!1m7!1s!2m2!1d${lat}!2d${lng}!3f${heading}!4f0!5f0.7820865974627469`
  const fallbackLink = `https://www.google.com/maps?q=${lat},${lng}&layer=c&cbll=${lat},${lng}`

  if (hasError) {
    return (
      <ErrorCard className={className}>
        <ErrorHeader>
          <HeaderLeft>
            <Eye size={16} color={theme.colors.slate[500]} />
            <ErrorTitle>Street View</ErrorTitle>
          </HeaderLeft>
          <IconButton
            onClick={() => {
              setHasError(false)
              setIsLoaded(false)
            }}
          >
            <RotateCcw size={12} /> נסה שוב
          </IconButton>
        </ErrorHeader>
        <ErrorContent>
          <EyeOff size={32} color={theme.colors.slate[600]} />
          <ErrorText>Street View לא זמין בנקודה זו</ErrorText>
          <ErrorLink href={fallbackLink} target="_blank" rel="noopener noreferrer">
            <MapPin size={12} /> פתח במפות Google <ExternalLink size={12} />
          </ErrorLink>
        </ErrorContent>
      </ErrorCard>
    )
  }

  return (
    <Card className={className}>
      <Header>
        <HeaderLeft>
          <Eye size={16} color={theme.colors.gold} />
          <HeaderTitle>Street View</HeaderTitle>
          {!isLoaded && <LoadingTag>טוען...</LoadingTag>}
        </HeaderLeft>
        <HeaderRight>
          <LinkButton href={fallbackLink} target="_blank" rel="noopener noreferrer" title="פתח ב-Google Maps">
            <ExternalLink size={12} />
          </LinkButton>
          <IconButton onClick={toggleExpand}>{isExpanded ? 'מזער' : 'הרחב'}</IconButton>
        </HeaderRight>
      </Header>

      <PanelBody $expanded={isExpanded}>
        {!isLoaded && (
          <LoadingOverlay>
            <div style={{ textAlign: 'center' }}>
              <Spinner />
              <LoadingText>טוען Street View...</LoadingText>
            </div>
          </LoadingOverlay>
        )}
        <iframe
          src={streetViewUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Street View של החלקה"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      </PanelBody>

      <Footer>
        <span style={{ fontFamily: theme.fonts.mono }} dir="ltr">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </span>
        <span>גרור כדי להסתובב</span>
      </Footer>
    </Card>
  )
})

export default StreetViewPanel
