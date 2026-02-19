import { useState, useCallback, useRef, useEffect, memo } from 'react'
import styled from 'styled-components'
import { useDataSaver } from '../../hooks/useInfra'
import { theme, media } from '../../styles/theme'

type CarouselImage = {
  id?: string | number
  url: string
  alt?: string
}

type CardImageCarouselProps = {
  images?: CarouselImage[]
  blockNum?: string | number
  color: string
  isCompared?: boolean
  onImageCountClick?: (count: number) => void
  priority?: boolean
}

const CardImageCarousel = memo(function CardImageCarousel({
  images,
  blockNum,
  color,
  isCompared,
  onImageCountClick,
  priority = false,
}: CardImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loadErrors, setLoadErrors] = useState<Set<number>>(new Set())
  const touchRef = useRef({ startX: 0, startY: 0 })
  const dataSaver = useDataSaver()

  const count = images?.length || 0

  const goTo = useCallback((idx: number, event?: React.MouseEvent<HTMLElement>) => {
    if (event) event.stopPropagation()
    setCurrentIndex(idx)
  }, [])

  const goNext = useCallback(
    (event?: React.MouseEvent<HTMLElement>) => {
      if (event) event.stopPropagation()
      setCurrentIndex((prev) => (prev + 1) % count)
    },
    [count]
  )

  const goPrev = useCallback(
    (event?: React.MouseEvent<HTMLElement>) => {
      if (event) event.stopPropagation()
      setCurrentIndex((prev) => (prev - 1 + count) % count)
    },
    [count]
  )

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (count <= 1) return
      event.stopPropagation()
      const rect = event.currentTarget.getBoundingClientRect()
      const clickX = event.clientX - rect.left
      const isRightHalf = clickX > rect.width / 2
      if (isRightHalf) {
        goPrev(event)
      } else {
        goNext(event)
      }
    },
    [count, goNext, goPrev]
  )

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (count <= 1) return
      touchRef.current = {
        startX: event.touches[0].clientX,
        startY: event.touches[0].clientY,
      }
    },
    [count]
  )

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (count <= 1) return
      const dx = event.changedTouches[0].clientX - touchRef.current.startX
      const dy = event.changedTouches[0].clientY - touchRef.current.startY
      if (Math.abs(dx) < 30 || Math.abs(dx) < Math.abs(dy)) return
      event.stopPropagation()
      if (dx < 0) {
        goPrev()
      } else {
        goNext()
      }
    },
    [count, goNext, goPrev]
  )

  const handleImgError = useCallback((idx: number) => {
    setLoadErrors((prev) => new Set(prev).add(idx))
  }, [])

  if (!images || count === 0) {
    return <AccentBar style={{ background: isCompared ? theme.colors.purple : color }} />
  }

  if (count === 1) {
    const img = images[0]
    return (
      <Thumb>
        {loadErrors.has(0) ? (
          <Fallback style={{ background: `linear-gradient(135deg, ${color}25, ${color}08)` }}>
            <span>🏗️</span>
          </Fallback>
        ) : (
          <ThumbImage
            src={img.url}
            alt={img.alt || `גוש ${blockNum}`}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            {...(priority ? { fetchPriority: 'high' } : {})}
            onError={() => handleImgError(0)}
          />
        )}
        <ThumbOverlay />
        <AccentBar
          style={{
            background: isCompared ? theme.colors.purple : color,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          }}
        />
      </Thumb>
    )
  }

  const currentImg = images[currentIndex]

  useEffect(() => {
    if (count <= 1 || dataSaver) return
    const nextIdx = (currentIndex + 1) % count
    const prevIdx = (currentIndex - 1 + count) % count
    ;[nextIdx, prevIdx].forEach((idx) => {
      if (!loadErrors.has(idx) && images[idx]?.url) {
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.href = images[idx].url
        link.as = 'image'
        document.head.appendChild(link)
        setTimeout(() => {
          try {
            document.head.removeChild(link)
          } catch (error) {
            console.warn('Failed to remove prefetch link', error)
          }
        }, 10000)
      }
    })
  }, [currentIndex, count, images, loadErrors, dataSaver])

  return (
    <CarouselRoot
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="group"
      aria-roledescription="carousel"
      aria-label={`${count} תמונות`}
    >
      {loadErrors.has(currentIndex) ? (
        <Fallback style={{ background: `linear-gradient(135deg, ${color}25, ${color}08)` }}>
          <span>🏗️</span>
        </Fallback>
      ) : (
        <ThumbImage
          $animated
          key={currentImg.id || currentIndex}
          src={currentImg.url}
          alt={currentImg.alt || `גוש ${blockNum} — תמונה ${currentIndex + 1}`}
          loading={priority || currentIndex === 0 ? 'eager' : 'lazy'}
          decoding="async"
          {...(priority && currentIndex === 0 ? { fetchPriority: 'high' } : {})}
          onError={() => handleImgError(currentIndex)}
        />
      )}

      <ThumbOverlay />

      <Dots aria-hidden="true">
        {images.slice(0, 5).map((_, i) => (
          <Dot key={i} type="button" $active={i === currentIndex} onClick={(event) => goTo(i, event)}>
            <VisuallyHidden>תמונה {i + 1}</VisuallyHidden>
          </Dot>
        ))}
        {count > 5 && <DotMore>+{count - 5}</DotMore>}
      </Dots>

      <PhotoCount
        onClick={() => onImageCountClick?.(count)}
        role={onImageCountClick ? 'button' : undefined}
        tabIndex={onImageCountClick ? 0 : -1}
      >
        📷 {currentIndex + 1}/{count}
      </PhotoCount>

      <Arrows aria-hidden="true">
        <ArrowZone $variant="prev" />
        <ArrowZone $variant="next" />
      </Arrows>

      <AccentBar
        style={{
          background: isCompared ? theme.colors.purple : color,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }}
      />
    </CarouselRoot>
  )
})

export default CardImageCarousel

const ThumbImage = styled.img<{ $animated?: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
  animation: ${({ $animated }) => ($animated ? 'carousel-fade-in 0.25s ease-out' : 'none')};

  @keyframes carousel-fade-in {
    from {
      opacity: 0.6;
      transform: scale(1.02);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`

const Arrows = styled.div`
  position: absolute;
  inset: 0;
  z-index: 8;
  display: flex;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
`

const AccentBar = styled.div`
  height: 3px;
`

const Thumb = styled.div`
  position: relative;
  width: 100%;
  height: 72px;
  overflow: hidden;

  &:hover ${ThumbImage} {
    transform: scale(1.08);
  }

  ${media.mobile} {
    height: 68px;
  }
`

const CarouselRoot = styled(Thumb)`
  cursor: pointer;
  touch-action: pan-y;

  &:hover ${Arrows} {
    opacity: 1;
  }
`

const ThumbOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 40%, rgba(8, 18, 35, 0.85) 100%);
  pointer-events: none;
`

const Fallback = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  span {
    font-size: 20px;
    opacity: 0.5;
  }
`

const Dots = styled.div`
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 12;
  display: flex;
  align-items: center;
  gap: 4px;
  pointer-events: auto;
`

const Dot = styled.button<{ $active: boolean }>`
  width: ${({ $active }) => ($active ? '7px' : '5px')};
  height: ${({ $active }) => ($active ? '7px' : '5px')};
  border-radius: 50%;
  background: ${({ $active }) => ($active ? theme.colors.white : 'rgba(255, 255, 255, 0.4)')};
  border: none;
  padding: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  box-shadow: ${({ $active }) => ($active ? '0 0 4px rgba(255, 255, 255, 0.4)' : 'none')};

  &:hover {
    background: rgba(255, 255, 255, 0.8);
  }
`

const DotMore = styled.span`
  font-size: 7px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
  line-height: 1;
`

const PhotoCount = styled.span`
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  font-size: 8px;
  font-weight: 700;
  color: ${theme.colors.white};
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  border-radius: 6px;
  line-height: 1;
`

const ArrowZone = styled.div<{ $variant: 'prev' | 'next' }>`
  flex: 1;
  background: ${({ $variant }) =>
    $variant === 'prev'
      ? 'linear-gradient(to left, transparent, rgba(0, 0, 0, 0.08))'
      : 'linear-gradient(to right, transparent, rgba(0, 0, 0, 0.08))'};
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`
