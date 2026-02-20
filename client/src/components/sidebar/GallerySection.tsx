/**
 * GallerySection - Image grid + lightbox trigger
 */
import styled from 'styled-components'
import { Maximize2 } from 'lucide-react'
import { theme as themeTokens } from '../../styles/theme'

const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 8px;
`

const ImageThumb = styled.button`
  aspect-ratio: 1;
  border-radius: ${({ theme }) => theme.radii.xl};
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  background: none;
  padding: 0;
  &:hover { border-color: rgba(200, 148, 42, 0.4); }
  &:hover img { transform: scale(1.05); }
  &:hover .overlay { background: rgba(0, 0, 0, 0.2); }
  &:hover .zoom-icon { opacity: 0.7; }
  img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
`

const ImageOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  transition: background 0.2s;
`

const ImageZoomIcon = styled(Maximize2)`
  width: 20px;
  height: 20px;
  color: white;
  opacity: 0;
  transition: opacity 0.2s;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
`

const ImageFirstLabel = styled.span`
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 8px;
  font-weight: 700;
  color: white;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  padding: 2px 6px;
  border-radius: 4px;
`

const ViewAllImagesBtn = styled.button`
  width: 100%;
  padding: 8px;
  text-align: center;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.gold};
  font-weight: 500;
  background: rgba(200, 148, 42, 0.05);
  border: 1px solid rgba(200, 148, 42, 0.15);
  border-radius: ${({ theme }) => theme.radii.xl};
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: rgba(200, 148, 42, 0.1); }
`

interface GallerySectionProps {
  images: any[]
  onOpenLightbox: (index: number) => void
}

export default function GallerySection({ images, onOpenLightbox }: GallerySectionProps) {
  return (
    <>
      <ImageGrid>
        {images.map((img: any, i: number) => (
          <ImageThumb
            key={img.id || i}
            onClick={() => onOpenLightbox(i)}
            onMouseEnter={() => {
              const link = document.createElement('link')
              link.rel = 'preload'
              link.as = 'image'
              link.href = img.url
              document.head.appendChild(link)
            }}
          >
            <img src={img.url} alt={img.alt || `תמונה ${i + 1}`} loading="lazy" decoding="async" />
            <ImageOverlay className="overlay"><ImageZoomIcon className="zoom-icon" /></ImageOverlay>
            {i === 0 && images.length > 1 && <ImageFirstLabel>ראשית</ImageFirstLabel>}
          </ImageThumb>
        ))}
      </ImageGrid>
      {images.length > 6 && (
        <ViewAllImagesBtn onClick={() => onOpenLightbox(0)}>
          צפה בכל {images.length} התמונות \u2192
        </ViewAllImagesBtn>
      )}
    </>
  )
}
