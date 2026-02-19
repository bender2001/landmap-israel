import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import styled from 'styled-components'
import { theme } from '../../styles/theme'

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
`

const IconButton = styled.button`
  position: absolute;
  z-index: 10;
  width: 40px;
  height: 40px;
  border-radius: ${theme.radii.lg};
  background: rgba(255, 255, 255, 0.1);
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.white};
  transition: background ${theme.transitions.normal};

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`

const Counter = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  padding: 6px 12px;
  border-radius: ${theme.radii.md};
  background: rgba(255, 255, 255, 0.1);
  color: ${theme.colors.white};
  font-size: 14px;
`

const ImageFrame = styled.div`
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  align-items: center;
  justify-content: center;
`

const Image = styled.img<{ $zoom: number }>`
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
  transition: transform ${theme.transitions.smooth};
  transform: scale(${({ $zoom }) => $zoom});
  user-select: none;
`

const ArrowButton = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: ${theme.radii.full};
  background: rgba(255, 255, 255, 0.1);
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.white};
  transition: background ${theme.transitions.normal};

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`

interface LightboxImage {
  url?: string
  src?: string
  alt?: string
}

interface ImageLightboxProps {
  images?: Array<string | LightboxImage>
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
}

export default function ImageLightbox({ images = [], initialIndex = 0, isOpen, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
      setZoom(1)
    }
  }, [isOpen, initialIndex])

  const goNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % images.length)
    setZoom(1)
  }, [images.length])

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length)
    setZoom(1)
  }, [images.length])

  const toggleZoom = useCallback(() => {
    setZoom(prev => (prev === 1 ? 2 : 1))
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (e.key === 'ArrowLeft') goNext()
        else goPrev()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose, goNext, goPrev])

  if (!isOpen || images.length === 0) return null

  const currentImage = images[currentIndex]
  const src = typeof currentImage === 'string' ? currentImage : currentImage?.url || currentImage?.src
  const alt = typeof currentImage === 'string' ? '' : currentImage?.alt || ''

  return (
    <Overlay onClick={onClose}>
      <IconButton style={{ top: 16, left: 16 }} onClick={onClose}>
        <X size={20} />
      </IconButton>
      <Counter>
        {currentIndex + 1} / {images.length}
      </Counter>
      <IconButton style={{ top: 16, left: 64 }} onClick={(e) => { e.stopPropagation(); toggleZoom() }}>
        {zoom > 1 ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
      </IconButton>

      <ImageFrame onClick={(e) => e.stopPropagation()}>
        <Image src={src} alt={alt} draggable={false} $zoom={zoom} />
      </ImageFrame>

      {images.length > 1 && (
        <>
          <ArrowButton style={{ right: 16 }} onClick={(e) => { e.stopPropagation(); goPrev() }}>
            <ChevronRight size={24} />
          </ArrowButton>
          <ArrowButton style={{ left: 16 }} onClick={(e) => { e.stopPropagation(); goNext() }}>
            <ChevronLeft size={24} />
          </ArrowButton>
        </>
      )}
    </Overlay>
  )
}
