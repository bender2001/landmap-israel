import styled, { keyframes } from 'styled-components'
import { theme } from '../../styles/theme'

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const Wrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`

const Svg = styled.svg<{ $size: number }>`
  width: ${({ $size }) => `${$size}px`};
  height: ${({ $size }) => `${$size}px`};
  animation: ${spin} 1s linear infinite;
`

const Track = styled.circle`
  opacity: 0.2;
`

const Stroke = styled.path`
  color: ${theme.colors.gold};
`

interface SpinnerProps {
  size?: number
  className?: string
}

export default function Spinner({ size = 32, className }: SpinnerProps) {
  return (
    <Wrap className={className}>
      <Svg $size={size} viewBox="0 0 24 24" fill="none">
        <Track cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <Stroke d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </Svg>
    </Wrap>
  )
}
