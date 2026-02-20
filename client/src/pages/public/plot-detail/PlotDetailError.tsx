import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import PublicNav from '../../../components/PublicNav'

/* ── Styled ── */
const PageWrap = styled.div`
  min-height: 100vh;
  width: 100%;
  background: ${({ theme }) => theme.colors.navy};
  direction: rtl;
`

const ErrorWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 0 16px;
`

const ErrorContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  max-width: 448px;
  text-align: center;
`

const ErrorIconBox = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
`

const ErrorTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
`

const ErrorDesc = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.slate[400]};
  line-height: 1.6;
  max-width: 320px;
`

const ErrorActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
`

const RetryBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: linear-gradient(to right, ${({ theme }) => theme.colors.gold}, ${({ theme }) => theme.colors.goldBright});
  color: ${({ theme }) => theme.colors.navy};
  font-weight: 700;
  font-size: 14px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover { box-shadow: 0 4px 20px rgba(200, 148, 42, 0.3); }
`

const GhostBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.slate[300]};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
`

const SearchMapLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(200, 148, 42, 0.1);
  border: 1px solid rgba(200, 148, 42, 0.2);
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.gold};
  font-size: 14px;
  text-decoration: none;
  transition: all 0.2s ease;
  &:hover { background: rgba(200, 148, 42, 0.15); }
`

const PlotIdHint = styled.p`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.slate[600]};
  margin-top: 8px;
`

/* ── Props ── */
interface PlotDetailErrorProps {
  id?: string
  error?: any
  isLoading: boolean
}

/* ── Component ── */
export default function PlotDetailError({ id, error, isLoading }: PlotDetailErrorProps) {
  const navigate = useNavigate()
  const is404 = error?.status === 404 || (!error && !isLoading)
  const isNetworkError = error && !error.status

  return (
    <PageWrap>
      <PublicNav />
      <meta name="robots" content="noindex, nofollow" />
      <ErrorWrap>
        <ErrorContent>
          <ErrorIconBox>{is404 ? '\uD83D\uDD0D' : '\u26A0\uFE0F'}</ErrorIconBox>
          <ErrorTitle>
            {is404 ? '\u05D7\u05DC\u05E7\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4' : '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD'}
          </ErrorTitle>
          <ErrorDesc>
            {is404
              ? '\u05D9\u05D9\u05EA\u05DB\u05DF \u05E9\u05D4\u05D7\u05DC\u05E7\u05D4 \u05D4\u05D5\u05E1\u05E8\u05D4 \u05DE\u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05D0\u05D5 \u05E9\u05D4\u05E7\u05D9\u05E9\u05D5\u05E8 \u05E9\u05D2\u05D5\u05D9. \u05E0\u05E1\u05D4 \u05DC\u05D7\u05E4\u05E9 \u05D0\u05EA \u05D4\u05D7\u05DC\u05E7\u05D4 \u05D9\u05E9\u05D9\u05E8\u05D5\u05EA.'
              : isNetworkError
                ? '\u05D1\u05E2\u05D9\u05D9\u05EA \u05D7\u05D9\u05D1\u05D5\u05E8 \u05DC\u05E9\u05E8\u05EA \u2014 \u05D1\u05D3\u05D5\u05E7 \u05D0\u05EA \u05D7\u05D9\u05D1\u05D5\u05E8 \u05D4\u05D0\u05D9\u05E0\u05D8\u05E8\u05E0\u05D8 \u05D5\u05E0\u05E1\u05D4 \u05E9\u05E0\u05D9\u05EA.'
                : `\u05D4\u05E9\u05E8\u05EA \u05D4\u05E9\u05D9\u05D1 \u05E2\u05DD \u05E9\u05D2\u05D9\u05D0\u05D4${error?.status ? ` (${error.status})` : ''}. \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1 \u05D1\u05E2\u05D5\u05D3 \u05E8\u05D2\u05E2.`
            }
          </ErrorDesc>
          <ErrorActions>
            {!is404 && (
              <RetryBtn onClick={() => window.location.reload()}>
                \uD83D\uDD04 \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1
              </RetryBtn>
            )}
            <GhostBtn onClick={() => window.history.length > 2 ? navigate(-1) : navigate('/')}>
              <ArrowRight style={{ width: 16, height: 16 }} />
              {window.history.length > 2 ? '\u05D7\u05D6\u05E8\u05D4' : '\u05DC\u05DE\u05E4\u05D4'}
            </GhostBtn>
            <SearchMapLink to="/">
              \uD83D\uDDFA\uFE0F \u05D7\u05E4\u05E9 \u05D1\u05DE\u05E4\u05D4
            </SearchMapLink>
          </ErrorActions>
          {id && <PlotIdHint>\u05DE\u05D6\u05D4\u05D4 \u05D7\u05DC\u05E7\u05D4: {id}</PlotIdHint>}
        </ErrorContent>
      </ErrorWrap>
    </PageWrap>
  )
}
