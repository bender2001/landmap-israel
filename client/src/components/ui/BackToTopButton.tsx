import { useState, useEffect, useCallback } from 'react'
import { ArrowUp } from 'lucide-react'
import styled, { keyframes } from 'styled-components'
import { theme } from '../../styles/theme'

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

const Button = styled.button`
  position: fixed;
  bottom: 80px;
  right: 16px;
  z-index: 50;
  width: 40px;
  height: 40px;
  border-radius: ${theme.radii.md};
  background: ${theme.colors.gold}33;
  border: 1px solid ${theme.colors.gold}4d;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
  transition: transform ${theme.transitions.normal}, background ${theme.transitions.normal};
  animation: ${fadeIn} 0.25s ease;

  &:hover {
    background: ${theme.colors.gold}4d;
    transform: scale(1.1);
  }
`

const Icon = styled(ArrowUp)`
  width: 16px;
  height: 16px;
  color: ${theme.colors.gold};
`

interface BackToTopButtonProps {
  threshold?: number
}

export default function BackToTopButton({ threshold = 400 }: BackToTopButtonProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > threshold)
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [threshold])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  if (!visible) return null

  return (
    <Button onClick={scrollToTop} aria-label="חזרה למעלה" title="חזרה למעלה">
      <Icon />
    </Button>
  )
}
