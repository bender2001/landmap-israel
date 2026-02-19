import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Map, Calculator, BarChart3, Heart, Info, Phone, FileText, Shield, MapPin, CreditCard } from 'lucide-react'
import styled from 'styled-components'
import { media, theme } from '../styles/theme'

type FooterLink = {
  to: string
  label: string
  icon: LucideIcon
}

type FooterColumn = {
  title: string
  links: FooterLink[]
}

const footerLinks: FooterColumn[] = [
  {
    title: 'עמודים',
    links: [
      { to: '/about', label: 'אודות', icon: Info },
      { to: '/contact', label: 'צור קשר', icon: Phone },
      { to: '/areas', label: 'סקירת אזורים', icon: MapPin },
      { to: '/pricing', label: 'מסלולים ומחירים', icon: CreditCard },
    ],
  },
  {
    title: 'כלים',
    links: [
      { to: '/calculator', label: 'מחשבון השקעה', icon: Calculator },
      { to: '/compare', label: 'השוואת חלקות', icon: BarChart3 },
      { to: '/favorites', label: 'מועדפים', icon: Heart },
    ],
  },
  {
    title: 'משפטי',
    links: [
      { to: '/terms', label: 'תנאי שימוש', icon: FileText },
      { to: '/privacy', label: 'מדיניות פרטיות', icon: Shield },
    ],
  },
]

export default function PublicFooter() {
  return (
    <Footer dir="rtl">
      <FooterInner>
        <FooterGrid>
          <BrandBlock>
            <BrandLink to="/">
              <BrandEmoji aria-hidden>🏗️</BrandEmoji>
              <BrandText>LandMap</BrandText>
            </BrandLink>
            <BrandDescription>הפלטפורמה הדיגיטלית להשקעות קרקע בישראל.</BrandDescription>
            <PrimaryLink to="/">
              <Map aria-hidden />
              למפה
            </PrimaryLink>
          </BrandBlock>

          {footerLinks.map((col) => (
            <FooterColumnWrap key={col.title}>
              <ColumnTitle>{col.title}</ColumnTitle>
              <ColumnList>
                {col.links.map((link) => (
                  <li key={link.to}>
                    <ColumnLink to={link.to}>
                      <link.icon aria-hidden />
                      {link.label}
                    </ColumnLink>
                  </li>
                ))}
              </ColumnList>
            </FooterColumnWrap>
          ))}
        </FooterGrid>

        <SocialSection>
          <SocialRow>
            <SocialLink
              href="https://wa.me/972526331157?text=%D7%A9%D7%9C%D7%95%D7%9D%2C%20%D7%90%D7%A0%D7%99%20%D7%9E%D7%A2%D7%95%D7%A0%D7%99%D7%99%D7%9F%20%D7%91%D7%A7%D7%A8%D7%A7%D7%A2%D7%95%D7%AA%20%D7%9C%D7%94%D7%A9%D7%A7%D7%A2%D7%94"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              $tone="whatsapp"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </SocialLink>
            <SocialLink
              href="https://t.me/LandMapIsraelBot"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram"
              $tone="telegram"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </SocialLink>
          </SocialRow>
        </SocialSection>

        <BottomBar>
          <span>© {new Date().getFullYear()} LandMap Israel. כל הזכויות שמורות.</span>
          <BottomLinks>
            <Link to="/terms">תנאי שימוש</Link>
            <Link to="/privacy">פרטיות</Link>
          </BottomLinks>
        </BottomBar>
      </FooterInner>
    </Footer>
  )
}

const Footer = styled.footer`
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: ${theme.colors.navy};
`

const FooterInner = styled.div`
  max-width: 64rem;
  margin: 0 auto;
  padding: 3rem 1rem 2.5rem;
`

const FooterGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  ${media.sm} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  ${media.lg} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

const BrandBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const BrandLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: ${theme.colors.white};
`

const BrandEmoji = styled.span`
  font-size: 1.25rem;
`

const BrandText = styled.span`
  font-size: 1.125rem;
  font-weight: 700;
`

const BrandDescription = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${theme.colors.slate[500]};
  line-height: 1.6;
`

const PrimaryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: ${theme.radii.md};
  font-size: 0.875rem;
  font-weight: 700;
  text-decoration: none;
  color: ${theme.colors.navy};
  background: ${theme.gradients.gold};
  transition: ${theme.transitions.normal};

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover,
  &:focus-visible {
    box-shadow: 0 12px 24px rgba(200, 148, 42, 0.3);
  }
`

const FooterColumnWrap = styled.div``

const ColumnTitle = styled.h3`
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: ${theme.colors.slate[300]};
`

const ColumnList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
`

const ColumnLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  text-decoration: none;
  color: ${theme.colors.slate[500]};
  transition: ${theme.transitions.fast};

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover,
  &:focus-visible {
    color: ${theme.colors.gold};
  }
`

const SocialSection = styled.div`
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`

const SocialRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`

const SocialLink = styled.a<{ $tone: 'whatsapp' | 'telegram' }>`
  width: 36px;
  height: 36px;
  border-radius: ${theme.radii.lg};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: ${({ $tone }) => ($tone === 'whatsapp' ? '#25D366' : '#229ED9')};
  background: ${({ $tone }) => ($tone === 'whatsapp' ? 'rgba(37, 211, 102, 0.1)' : 'rgba(34, 158, 217, 0.1)')};
  border: 1px solid ${({ $tone }) => ($tone === 'whatsapp' ? 'rgba(37, 211, 102, 0.2)' : 'rgba(34, 158, 217, 0.2)')};
  transition: ${theme.transitions.normal};

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover,
  &:focus-visible {
    background: ${({ $tone }) => ($tone === 'whatsapp' ? 'rgba(37, 211, 102, 0.2)' : 'rgba(34, 158, 217, 0.2)')};
    transform: scale(1.08);
  }
`

const BottomBar = styled.div`
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: ${theme.colors.slate[600]};
  ${media.sm} {
    flex-direction: row;
  }
`

const BottomLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  a {
    text-decoration: none;
    color: inherit;
    transition: ${theme.transitions.fast};
  }

  a:hover,
  a:focus-visible {
    color: ${theme.colors.gold};
  }
`
