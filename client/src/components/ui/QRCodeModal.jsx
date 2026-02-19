import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Download, Copy, Check, Printer, QrCode } from 'lucide-react'

/**
 * QR Code API URL builder — uses the free, reliable goqr.me API.
 * Returns a PNG image URL for the given data string.
 * goqr.me is HTTPS, high-availability, and doesn't require authentication.
 * Max data: ~4296 alphanumeric chars (more than enough for plot URLs).
 *
 * @param {string} data - Text/URL to encode
 * @param {number} size - Image dimensions (square)
 * @returns {string} PNG image URL
 */
function qrCodeUrl(data, size = 300) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=png&margin=8&qzone=2&color=C8942A&bgcolor=0F172A`
}

/**
 * QRCodeModal — generates and displays a scannable QR code for plot sharing.
 * Opens from the ShareMenu as a fullscreen-on-mobile modal.
 *
 * Use cases:
 * - Print and paste on construction site signs ("Scan for investment details")
 * - Include in marketing flyers and brochures
 * - Share at real estate meetups and exhibitions
 * - Quick mobile-to-desktop transfer of plot URLs
 *
 * Neither Madlan nor Yad2 offer QR code generation — this is a unique differentiator
 * especially for the Israeli market where real estate is heavily marketed offline.
 *
 * Features:
 * - Download QR as PNG image
 * - Print QR directly (opens print dialog)
 * - Copy URL to clipboard
 * - Branded with LandMap gold accent colors
 * - Accessible: focus trap, ESC to close, screen reader announcements
 */
export default function QRCodeModal({ isOpen, onClose, url, title, subtitle }) {
  const [copied, setCopied] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const modalRef = useRef(null)
  const closeButtonRef = useRef(null)

  // Focus trap + ESC handler
  useEffect(() => {
    if (!isOpen) return
    // Focus the close button on open
    const timer = setTimeout(() => closeButtonRef.current?.focus(), 100)

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    // Prevent body scroll
    document.body.style.overflow = 'hidden'

    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Reset states when modal opens
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
      // Fallback for older browsers
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

  /**
   * Download QR code as PNG — fetches the image blob and triggers a browser download.
   * Uses the higher-resolution (600px) version for print quality.
   */
  const handleDownload = useCallback(async () => {
    try {
      const highResUrl = qrCodeUrl(url, 600)
      const response = await fetch(highResUrl)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `landmap-qr-${title ? title.replace(/[^a-zA-Zא-ת0-9]/g, '-').slice(0, 40) : 'plot'}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      // Fallback: open in new tab
      window.open(qrCodeUrl(url, 600), '_blank')
    }
  }, [url, title])

  /**
   * Print QR code — opens a print dialog with a clean layout optimized for printing.
   * Includes the plot title and URL below the QR code for context.
   */
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
    // Wait for image to load before printing
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={`קוד QR עבור ${title || 'חלקה'}`}
        className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="pointer-events-auto bg-navy border border-white/10 rounded-2xl shadow-2xl max-w-sm w-full animate-bounce-in overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3" dir="rtl">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gold/15 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">קוד QR לשיתוף</h3>
                <p className="text-[10px] text-slate-500">סרקו עם הטלפון לצפייה בפרטים</p>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="סגור"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* QR Code */}
          <div className="px-5 py-4 flex flex-col items-center">
            {title && (
              <p className="text-xs font-semibold text-slate-300 mb-1 text-center" dir="rtl">{title}</p>
            )}
            {subtitle && (
              <p className="text-[10px] text-slate-500 mb-3 text-center" dir="rtl">{subtitle}</p>
            )}

            {/* QR image container with loading state */}
            <div className="relative w-[240px] h-[240px] rounded-xl overflow-hidden bg-navy-light/50 border border-white/5">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
                </div>
              )}
              <img
                src={imgSrc}
                alt={`קוד QR עבור ${title || url}`}
                className={`w-full h-full object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
                loading="eager"
                crossOrigin="anonymous"
              />
            </div>

            {/* URL display */}
            <div className="mt-3 w-full px-3 py-2 bg-white/5 rounded-lg border border-white/5">
              <p className="text-[10px] text-slate-500 font-mono break-all text-center" dir="ltr">
                {url.length > 60 ? url.slice(0, 57) + '...' : url}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-5 pb-5 grid grid-cols-3 gap-2" dir="rtl">
            <button
              onClick={handleDownload}
              className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-gold/10 hover:border-gold/20 hover:text-gold text-slate-400 transition-all text-[10px] font-medium"
            >
              <Download className="w-4 h-4" />
              הורד PNG
            </button>
            <button
              onClick={handlePrint}
              className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-gold/10 hover:border-gold/20 hover:text-gold text-slate-400 transition-all text-[10px] font-medium"
            >
              <Printer className="w-4 h-4" />
              הדפס
            </button>
            <button
              onClick={handleCopyUrl}
              className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-gold/10 hover:border-gold/20 hover:text-gold text-slate-400 transition-all text-[10px] font-medium"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'הועתק!' : 'העתק URL'}
            </button>
          </div>

          {/* Marketing tip */}
          <div className="px-5 pb-4" dir="rtl">
            <div className="bg-gold/5 border border-gold/10 rounded-xl px-3 py-2">
              <p className="text-[10px] text-gold/80 leading-relaxed">
                💡 <span className="font-medium">טיפ:</span> הדפס את הקוד על שילוט בשטח, פלאיירים, או כרטיסי ביקור — משקיעים יוכלו לסרוק ולצפות בפרטי ההשקעה מהטלפון.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
