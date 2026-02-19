import styled, { keyframes } from 'styled-components'
import { theme } from '../../styles/theme'

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`

const Panel = styled.div`
  background: ${theme.glass.bg};
  backdrop-filter: ${theme.glass.blur};
  border: ${theme.glass.border};
  border-radius: ${theme.radii.lg};
  box-shadow: ${theme.shadows.glass};
  overflow: hidden;
  animation: ${pulse} 1.5s ease-in-out infinite;
`

const Scroll = styled.div`
  overflow-x: auto;
`

const Table = styled.table`
  width: 100%;
  font-size: 14px;
  border-collapse: collapse;
`

const HeadRow = styled.tr`
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`

const BodyRow = styled.tr`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`

const Cell = styled.td`
  padding: 12px 16px;
`

const HeadCell = styled.th`
  padding: 12px 16px;
  text-align: right;
`

const Line = styled.div<{ $width: number }>`
  height: 12px;
  width: ${({ $width }) => `${$width}%`};
  border-radius: ${theme.radii.full};
  background: rgba(255, 255, 255, 0.05);
`

interface TableSkeletonProps {
  rows?: number
  cols?: number
}

export default function TableSkeleton({ rows = 8, cols = 6 }: TableSkeletonProps) {
  return (
    <Panel>
      <Scroll>
        <Table>
          <thead>
            <HeadRow>
              {Array.from({ length: cols }).map((_, i) => (
                <HeadCell key={i}>
                  <Line $width={40} />
                </HeadCell>
              ))}
            </HeadRow>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <BodyRow key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <Cell key={c}>
                    <Line $width={40 + Math.random() * 40} />
                  </Cell>
                ))}
              </BodyRow>
            ))}
          </tbody>
        </Table>
      </Scroll>
    </Panel>
  )
}
