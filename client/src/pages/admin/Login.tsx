import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Lock, Mail, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { theme, media } from '../../styles/theme'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email, password)
      navigate('/admin', { replace: true })
    } catch {
      setError('אימייל או סיסמה שגויים')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Page dir="rtl">
      <CardWrap>
        <LogoBlock>
          <LogoIcon>🏗️</LogoIcon>
          <BrandTitle>
            <BrandText>LandMap Israel</BrandText>
          </BrandTitle>
          <BrandSubtitle>כניסה לפאנל ניהול</BrandSubtitle>
        </LogoBlock>

        <Card>
          <GoldAccent />

          {error && (
            <ErrorBox>
              <ErrorText>{error}</ErrorText>
            </ErrorBox>
          )}

          <Form onSubmit={handleSubmit}>
            <Field>
              <Label>אימייל</Label>
              <InputWrap>
                <Mail size={16} />
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@landmap.co.il"
                  dir="ltr"
                  required
                />
              </InputWrap>
            </Field>

            <Field>
              <Label>סיסמה</Label>
              <InputWrap>
                <Lock size={16} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="הכנס סיסמה"
                  dir="ltr"
                  required
                />
                <ToggleVisibility
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </ToggleVisibility>
              </InputWrap>
            </Field>

            <SubmitButton type="submit" disabled={isLoading}>
              {isLoading ? 'מתחבר...' : 'כניסה'}
            </SubmitButton>
          </Form>
        </Card>
      </CardWrap>
    </Page>
  )
}

const Page = styled.div`
  min-height: 100vh;
  background: ${theme.colors.navy};
  display: flex;
  align-items: center;
  justify-content: center;
`

const CardWrap = styled.div`
  width: 100%;
  max-width: 360px;
  margin: 0 16px;
`

const LogoBlock = styled.div`
  text-align: center;
  margin-bottom: 32px;
`

const LogoIcon = styled.span`
  font-size: 2.5rem;
`

const BrandTitle = styled.h1`
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 12px;
`

const BrandText = styled.span`
  color: ${theme.colors.slate[100]};
`

const BrandSubtitle = styled.p`
  font-size: 0.875rem;
  color: ${theme.colors.slate[400]};
  margin-top: 4px;
`

const Card = styled.div`
  background: ${theme.glass.bg};
  border: ${theme.glass.border};
  backdrop-filter: ${theme.glass.blur};
  border-radius: ${theme.radii.xl};
  box-shadow: ${theme.shadows.glass};
  padding: 24px;
  position: relative;
`

const GoldAccent = styled.div`
  height: 2px;
  margin: -24px -24px 24px;
  border-radius: ${theme.radii.xl} ${theme.radii.xl} 0 0;
  background: ${theme.gradients.goldBar};
`

const ErrorBox = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: ${theme.radii.xl};
  padding: 12px 16px;
  margin-bottom: 16px;
`

const ErrorText = styled.p`
  color: ${theme.colors.red};
  font-size: 0.875rem;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Label = styled.label`
  font-size: 0.75rem;
  color: ${theme.colors.slate[400]};
`

const InputWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(22, 42, 74, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.xl};
  color: ${theme.colors.slate[400]};

  svg {
    flex-shrink: 0;
  }
`

const Input = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  color: ${theme.colors.slate[200]};
  font-size: 0.875rem;
  text-align: right;

  &::placeholder {
    color: ${theme.colors.slate[500]};
  }

  &:focus {
    outline: none;
  }
`

const ToggleVisibility = styled.button`
  position: absolute;
  left: 12px;
  color: ${theme.colors.slate[400]};
  transition: ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.slate[300]};
  }
`

const SubmitButton = styled.button`
  width: 100%;
  padding: 12px;
  border-radius: ${theme.radii.xl};
  background: ${theme.gradients.gold};
  color: ${theme.colors.navy};
  font-weight: 700;
  transition: ${theme.transitions.smooth};

  &:hover:not(:disabled) {
    box-shadow: 0 12px 30px rgba(200, 148, 42, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`
