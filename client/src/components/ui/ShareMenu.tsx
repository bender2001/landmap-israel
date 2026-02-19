import { useState, useRef, useEffect, useCallback } from 'react'
import { Share2, MessageCircle, Send, Copy, Check, Mail, QrCode, X, Download, Printer } from 'lucide-react'
import styled, { keyframes } from 'styled-components'
import { theme } from '../../styles/theme'

// ─── Inline: QRCodeModal (was ui/QRCodeModal.tsx) ───────────────────────
const qrFadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const qrBounceIn = keyframes`
  from { opacity: 0; transform: translateY(6px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`

const QRBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  animation: ${qrFadeIn} 0.2s ease;
`

const QRModalWrap = styled.div`
  position: fixed;
  inset: 0;
  z-index: 201;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  pointer-events: none;
`

const QRCard = styled.div`
  pointer-events: auto;
  background: ${theme.colors.navy};
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.xxl};
  box-shadow: ${theme.shadows.elevated};
  max-width: 420px;
  width: 100%;
  overflow: hidden;
  animation: ${qrBounceIn} 0.25s ease;
`

const QRHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 12px;
  direction: rtl;
`

const QRTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const QRIconBox = styled.div`
  width: 36px;
  height: 36px;
  border-radius: ${theme.radii.lg};
  background: ${theme.colors.gold}26;
  display: flex;
  align-items: center;
  justify-content: center;
`

const QRTitle = styled.h3`
  font-size: 14px;
  font-weight: 700;
  color: ${theme.colors.slate[200]};
  margin: 0;
`

const QRSubtitle = styled.p`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
  margin: 2px 0 0;
`

const QRCloseButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: ${theme.radii.md};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${theme.colors.slate[400]};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background ${theme.transitions.normal}, color ${theme.transitions.normal};

  &:hover {
    color: ${theme.colors.white};
    background: rgba(255, 255, 255, 0.1);
  }
`

const QRBody = styled.div`
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
`

const QRCenterText = styled.p`
  font-size: 12px;
  font-weight: 600;
  color: ${theme.colors.slate[300]};
  margin: 0 0 4px;
  direction: rtl;
`

const QRSubText = styled.p`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
  margin: 0 0 12px;
  direction: rtl;
`

const QRBox = styled.div`
  position: relative;
  width: 240px;
  height: 240px;
  border-radius: ${theme.radii.lg};
  overflow: hidden;
  background: rgba(22, 42, 74, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
`

const QRSpinner = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid ${theme.colors.gold}4d;
  border-top-color: ${theme.colors.gold};
  animation: spin 1s linear infinite;

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`

const QRUrlBox = styled.div`
  margin-top: 12px;
  width: 100%;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: ${theme.radii.md};
  border: 1px solid rgba(255, 255, 255, 0.05);
`

const QRUrlText = styled.p`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
  font-family: ${theme.fonts.mono};
  word-break: break-all;
  text-align: center;
  direction: ltr;
  margin: 0;
`

const QRActions = styled.div`
  padding: 0 20px 20px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  direction: rtl;
`

const QRActionButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  border-radius: ${theme.radii.lg};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${theme.colors.slate[400]};
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: background ${theme.transitions.normal}, color ${theme.transitions.normal}, border ${theme.transitions.normal};

  &:hover {
    background: ${theme.colors.gold}1a;
    border-color: ${theme.colors.gold}33;
    color: ${theme.colors.gold};
  }
`

const QRTip = styled.div`
  padding: 0 20px 20px;
  direction: rtl;
`

const QRTipBox = styled.div`
  background: ${theme.colors.gold}0d;
  border: 1px solid ${theme.colors.gold}1f;
  border-radius: ${theme.radii.lg};
  padding: 8px 12px;
`

const QRTipText = styled.p`
  margin: 0;
  font-size: 10px;
  color: ${theme.colors.gold};
  line-height: 1.5;
`

function qrCodeUrl(data: string, size = 300) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=png&margin=8&qzone=2&color=C8942A&bgcolor=0F172A`
}

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  url: string
  title?: string
  subtitle?: string
}

function QRCodeModal({ isOpen, onClose, url, title, subtitle }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const timer = window.setTimeout(() => closeButtonRef.current?.focus(), 100)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      setCopied(false)
      setImageLoaded(false)
    }
  }, [isOpen])

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }, [url])

  const handleDownload = useCallback(async () => {
    try {
      const highResUrl = qrCodeUrl(url, 600)
      const response = await fetch(highResUrl)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `landmap-qr-${title ? title.replace(/[^a-zA-Z\u05D0-\u05EA0-9]/g, '-').slice(0, 40) : 'plot'}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(qrCodeUrl(url, 600), '_blank')
    }
  }, [url, title])

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="utf-8">
        <title>QR Code — ${title || 'LandMap Israel'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; background: white; }
          .card { text-align: center; max-width: 350px; }
          .brand { font-size: 1.2rem; font-weight: 700; color: #C8942A; margin-bottom: 0.5rem; }
          .title { font-size: 1rem; font-weight: 600; color: #1e293b; margin-bottom: 0.25rem; }
          .subtitle { font-size: 0.8rem; color: #64748b; margin-bottom: 1rem; }
          img { width: 280px; height: 280px; margin: 0 auto; display: block; }
          .url { font-size: 0.7rem; color: #94a3b8; word-break: break-all; margin-top: 1rem; direction: ltr; }
          .cta { font-size: 0.9rem; color: #334155; margin-top: 0.75rem; font-weight: 500; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="brand">🏗️ LandMap Israel</div>
          ${title ? `<div class="title">${title}</div>` : ''}
          ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
          <img src="${qrCodeUrl(url, 600).replace(/&bgcolor=0F172A/, '&bgcolor=FFFFFF').replace(/&color=C8942A/, '&color=1e293b')}" alt="QR Code" />
          <div class="cta">📱 סרקו לפרטי ההשקעה</div>
          <div class="url">${url}</div>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    const img = printWindow.document.querySelector('img')
    if (img) {
      img.onload = () => {
        printWindow.focus()
        printWindow.print()
      }
    } else {
      printWindow.focus()
      printWindow.print()
    }
  }, [url, title, subtitle])

  if (!isOpen) return null

  const imgSrc = qrCodeUrl(url, 300)

  return (
    <>
      <QRBackdrop onClick={onClose} />
      <QRModalWrap role="dialog" aria-modal="true" aria-label={`קוד QR עבור ${title || 'חלקה'}`}>
        <QRCard onClick={(e) => e.stopPropagation()}>
          <QRHeader>
            <QRTitleRow>
              <QRIconBox>
                <QrCode size={20} color={theme.colors.gold} />
              </QRIconBox>
              <div>
                <QRTitle>קוד QR לשיתוף</QRTitle>
                <QRSubtitle>סרקו עם הטלפון לצפייה בפרטים</QRSubtitle>
              </div>
            </QRTitleRow>
            <QRCloseButton ref={closeButtonRef} onClick={onClose} aria-label="סגור">
              <X size={16} />
            </QRCloseButton>
          </QRHeader>

          <QRBody>
            {title && <QRCenterText>{title}</QRCenterText>}
            {subtitle && <QRSubText>{subtitle}</QRSubText>}
            <QRBox>
              {!imageLoaded && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QRSpinner />
                </div>
              )}
              <img
                src={imgSrc}
                alt={`קוד QR עבור ${title || url}`}
                style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
                onLoad={() => setImageLoaded(true)}
                loading="eager"
                crossOrigin="anonymous"
              />
            </QRBox>
            <QRUrlBox>
              <QRUrlText>{url.length > 60 ? url.slice(0, 57) + '...' : url}</QRUrlText>
            </QRUrlBox>
          </QRBody>

          <QRActions>
            <QRActionButton onClick={handleDownload}>
              <Download size={16} />
              הורד PNG
            </QRActionButton>
            <QRActionButton onClick={handlePrint}>
              <Printer size={16} />
              הדפס
            </QRActionButton>
            <QRActionButton onClick={handleCopyUrl}>
              {copied ? <Check size={16} color={theme.colors.emerald} /> : <Copy size={16} />}
              {copied ? 'הועתק!' : 'העתק URL'}
            </QRActionButton>
          </QRActions>

          <QRTip>
            <QRTipBox>
              <QRTipText>💡 <strong>טיפ:</strong> הדפס את הקוד על שילוט בשטח, פלאיירים, או כרטיסי ביקור — משקיעים יוכלו לסרוק ולצפות בפרטי ההשקעה מהטלפון.</QRTipText>
            </QRTipBox>
          </QRTip>
        </QRCard>
      </QRModalWrap>
    </>
  )
}

const Wrapper = styled.div`
  position: relative;
`

const Trigger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: ${theme.radii.lg};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${theme.colors.slate[400]};
  font-size: 14px;
  transition: background ${theme.transitions.normal};

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`

const Menu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 30;
  min-width: 180px;
  background: ${theme.colors.navyMid};
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.lg};
  box-shadow: ${theme.shadows.elevated};
  overflow: hidden;
  direction: rtl;
`

const MenuItem = styled.a<{ $bg: string; $color: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  font-size: 14px;
  color: ${({ $color }) => $color};
  background: ${({ $bg }) => $bg};
  text-decoration: none;
  transition: background ${theme.transitions.normal};

  &:hover {
    background: ${({ $bg }) => $bg.replace('0.1', '0.2')};
  }
`

const MenuButton = styled.button<{ $bg: string; $color: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 16px;
  font-size: 14px;
  color: ${({ $color }) => $color};
  background: ${({ $bg }) => $bg};
  border: none;
  text-align: right;
  cursor: pointer;
  transition: background ${theme.transitions.normal};

  &:hover {
    background: ${({ $bg }) => $bg.replace('0.05', '0.15')};
  }
`

const Divider = styled.div`
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
`

interface ShareMenuProps {
  plotTitle: string
  plotPrice: string
  plotUrl: string
  className?: string
}

export default function ShareMenu({ plotTitle, plotPrice, plotUrl, className }: ShareMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const shareText = `${plotTitle}\n${plotPrice}\n${plotUrl}`

  const handleCopy = () => {
    navigator.clipboard.writeText(plotUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleNativeShare = async () => {
    if (!navigator.share) return false
    try {
      await navigator.share({
        title: plotTitle,
        text: `${plotTitle}\n${plotPrice}`,
        url: plotUrl,
      })
      setIsOpen(false)
      return true
    } catch {
      return false
    }
  }

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  const shareOptions = [
    {
      label: 'WhatsApp',
      icon: MessageCircle,
      color: '#22C55E',
      bg: 'rgba(34, 197, 94, 0.1)',
      href: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    },
    {
      label: 'Telegram',
      icon: Send,
      color: '#60A5FA',
      bg: 'rgba(59, 130, 246, 0.1)',
      href: `https://t.me/share/url?url=${encodeURIComponent(plotUrl)}&text=${encodeURIComponent(plotTitle)}`,
    },
    {
      label: 'אימייל',
      icon: Mail,
      color: '#A78BFA',
      bg: 'rgba(139, 92, 246, 0.1)',
      href: `mailto:?subject=${encodeURIComponent(plotTitle)}&body=${encodeURIComponent(shareText)}`,
    },
  ]

  return (
    <Wrapper className={className} ref={menuRef}>
      <Trigger
        onClick={async () => {
          if (canNativeShare) {
            const shared = await handleNativeShare()
            if (shared) return
          }
          setIsOpen(prev => !prev)
        }}
      >
        <Share2 size={16} />
        <span style={{ display: 'none' }} className="share-label">שתף</span>
      </Trigger>

      {isOpen && (
        <Menu>
          {shareOptions.map(opt => (
            <MenuItem key={opt.label} href={opt.href} target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)} $bg={opt.bg} $color={opt.color}>
              <opt.icon size={16} />
              {opt.label}
            </MenuItem>
          ))}

          {canNativeShare && (
            <>
              <Divider />
              <MenuButton onClick={() => { handleNativeShare() }} $bg={`${theme.colors.gold}0d`} $color={theme.colors.gold}>
                <Share2 size={16} />
                שתף באפליקציה...
              </MenuButton>
            </>
          )}

          <Divider />
          <MenuButton onClick={() => { setShowQR(true); setIsOpen(false) }} $bg={`${theme.colors.gold}0d`} $color={theme.colors.gold}>
            <QrCode size={16} />
            קוד QR להדפסה
          </MenuButton>

          <Divider />
          <MenuButton onClick={() => { handleCopy(); setIsOpen(false) }} $bg="rgba(255, 255, 255, 0.05)" $color={theme.colors.slate[300]}>
            {copied ? <Check size={16} color={theme.colors.emerald} /> : <Copy size={16} />}
            {copied ? 'הועתק!' : 'העתק קישור'}
          </MenuButton>
        </Menu>
      )}

      {showQR && (
        <QRCodeModal isOpen={showQR} onClose={() => setShowQR(false)} url={plotUrl} title={plotTitle} subtitle={plotPrice} />
      )}
    </Wrapper>
  )
}
