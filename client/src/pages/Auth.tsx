import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Mail, Lock, User, Briefcase, ArrowLeft } from 'lucide-react'
import { t, fadeInUp, fadeInScale, mobile, gradientShift } from '../theme'
import { useAuth } from '../hooks'
import { GoldButton, GhostButton, useToast } from '../components/UI'
import type { Role } from '../types'

/* ── styled ── */
const Wrap = styled.div`display:flex;min-height:100vh;direction:rtl;${mobile}{flex-direction:column;}`

const Hero = styled.div`
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;
  padding:48px 32px;position:relative;overflow:hidden;
  background:linear-gradient(135deg,${t.bg} 0%,#0d1526 50%,${t.bg} 100%);
  ${mobile}{min-height:220px;flex:none;}
`
const Orb = styled.div`position:absolute;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(212,168,75,0.1),transparent 70%);top:15%;left:10%;pointer-events:none;`
const Orb2 = styled.div`position:absolute;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(212,168,75,0.07),transparent 70%);bottom:20%;right:15%;pointer-events:none;`
const Brand = styled.h1`
  font-size:clamp(32px,5vw,48px);font-weight:900;font-family:${t.font};
  background:linear-gradient(135deg,${t.gold} 0%,${t.goldBright} 40%,${t.gold} 80%);
  background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;
  animation:${gradientShift} 4s ease infinite;z-index:1;
`
const Tagline = styled.p`color:${t.textSec};font-size:16px;text-align:center;max-width:340px;z-index:1;animation:${fadeInUp} 0.5s ease-out 0.2s both;`

const FormSide = styled.div`
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:48px 32px;background:${t.lBg};${mobile}{padding:32px 20px;}
`
const FormCard = styled.div`
  width:100%;max-width:400px;animation:${fadeInScale} 0.5s ease-out;
`
const Tabs = styled.div`display:flex;gap:0;margin-bottom:32px;border-bottom:2px solid ${t.lBorder};`
const Tab = styled.button<{$active:boolean}>`
  flex:1;padding:12px 0;font-size:15px;font-weight:${pr=>pr.$active?700:500};font-family:${t.font};
  color:${pr=>pr.$active?t.gold:t.lTextSec};background:none;border:none;cursor:pointer;
  border-bottom:2px solid ${pr=>pr.$active?t.gold:'transparent'};margin-bottom:-2px;transition:all ${t.tr};
  &:hover{color:${t.gold};}
`
const Form = styled.form`display:flex;flex-direction:column;gap:16px;`
const InputWrap = styled.div`
  position:relative;display:flex;align-items:center;background:#fff;
  border:1px solid ${t.lBorder};border-radius:${t.r.md};transition:all ${t.tr};
  &:focus-within{border-color:${t.gold};box-shadow:0 0 0 3px ${t.goldDim};}
`
const InputIcon = styled.span`display:flex;align-items:center;padding:0 12px;color:${t.lTextSec};`
const Input = styled.input`
  flex:1;padding:12px 0;border:none;outline:none;font-size:14px;font-family:${t.font};
  color:${t.lText};background:transparent;&::placeholder{color:#94A3B8;}
`
const Select = styled.select`
  flex:1;padding:12px 0;border:none;outline:none;font-size:14px;font-family:${t.font};
  color:${t.lText};background:transparent;appearance:none;cursor:pointer;
`
const Submit = styled(GoldButton)`width:100%;padding:14px;font-size:15px;border-radius:${t.r.md};margin-top:8px;`
const Err = styled.p`color:${t.err};font-size:13px;text-align:center;`
const Footer = styled.p`font-size:13px;color:${t.lTextSec};text-align:center;margin-top:24px;`
const FooterLink = styled.button`background:none;border:none;color:${t.gold};font-weight:600;cursor:pointer;font-family:${t.font};font-size:13px;&:hover{text-decoration:underline;}`

export default function Auth() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('user')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { login, register } = useAuth()
  const { toast } = useToast()
  const nav = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('נא למלא את כל השדות'); return }
    if (tab === 'register' && !name) { setError('נא להזין שם'); return }
    setLoading(true)
    try {
      if (tab === 'login') {
        await login(email, password)
        toast('התחברת בהצלחה', 'success')
      } else {
        await register(email, password, name, role)
        toast('נרשמת בהצלחה', 'success')
      }
      nav(role === 'business' ? '/dashboard' : role === 'admin' ? '/dashboard' : '/explore')
    } catch (err: any) {
      setError(err?.message || 'שגיאה, נסה שוב')
      toast('שגיאה בהתחברות', 'error')
    } finally { setLoading(false) }
  }

  return (
    <Wrap>
      <Hero>
        <Orb /><Orb2 />
        <Brand>LandMap</Brand>
        <Tagline>פלטפורמת השקעות הקרקע המובילה בישראל. נתונים בזמן אמת, ניתוח AI ומפה אינטראקטיבית.</Tagline>
      </Hero>

      <FormSide>
        <FormCard>
          <Tabs>
            <Tab $active={tab === 'login'} onClick={() => { setTab('login'); setError('') }}>התחברות</Tab>
            <Tab $active={tab === 'register'} onClick={() => { setTab('register'); setError('') }}>הרשמה</Tab>
          </Tabs>

          <Form onSubmit={handleSubmit}>
            {tab === 'register' && (
              <InputWrap>
                <InputIcon><User size={18} /></InputIcon>
                <Input placeholder="שם מלא" value={name} onChange={e => setName(e.target.value)} />
              </InputWrap>
            )}
            <InputWrap>
              <InputIcon><Mail size={18} /></InputIcon>
              <Input type="email" placeholder="אימייל" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </InputWrap>
            <InputWrap>
              <InputIcon><Lock size={18} /></InputIcon>
              <Input type="password" placeholder="סיסמה" value={password} onChange={e => setPassword(e.target.value)} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} />
            </InputWrap>
            {tab === 'register' && (
              <InputWrap>
                <InputIcon><Briefcase size={18} /></InputIcon>
                <Select value={role} onChange={e => setRole(e.target.value as Role)}>
                  <option value="user">משתמש פרטי</option>
                  <option value="business">בעל עסק</option>
                </Select>
              </InputWrap>
            )}
            {error && <Err>{error}</Err>}
            <Submit type="submit" disabled={loading}>
              {loading ? 'טוען...' : tab === 'login' ? 'התחבר' : 'הרשם'}
            </Submit>
          </Form>

          <Footer>
            {tab === 'login' ? (
              <>אין לך חשבון? <FooterLink onClick={() => { setTab('register'); setError('') }}>הרשם עכשיו</FooterLink></>
            ) : (
              <>כבר יש לך חשבון? <FooterLink onClick={() => { setTab('login'); setError('') }}>התחבר</FooterLink></>
            )}
          </Footer>
        </FormCard>
      </FormSide>
    </Wrap>
  )
}
