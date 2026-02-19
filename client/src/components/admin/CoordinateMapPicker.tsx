import { useState, useCallback } from 'react'
import { MapContainer, TileLayer, Polygon, useMapEvents } from 'react-leaflet'
import { Undo2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import styled from 'styled-components'
import { theme } from '../../styles/theme'
import 'leaflet/dist/leaflet.css'

interface ClickHandlerProps {
  onAdd: (latlng: [number, number]) => void
}

function ClickHandler({ onAdd }: ClickHandlerProps) {
  useMapEvents({
    click(e) {
      onAdd([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

interface CoordinateMapPickerProps {
  value?: [number, number][]
  onChange: (coords: [number, number][]) => void
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const Label = styled.label`
  font-size: 12px;
  color: ${theme.colors.slate[400]};
  font-family: ${theme.fonts.primary};
`

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const IconButton = styled.button<{ $variant?: 'undo' | 'clear' }>`
  padding: 6px;
  border-radius: ${theme.radii.sm};
  border: none;
  background: transparent;
  color: ${theme.colors.slate[400]};
  cursor: pointer;
  transition: color ${theme.transitions.fast}, background ${theme.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: ${({ $variant }) => $variant === 'clear' ? theme.colors.red : theme.colors.gold};
    background: ${({ $variant }) =>
      $variant === 'clear'
        ? 'rgba(239,68,68,0.1)'
        : `rgba(200,148,42,0.1)`};
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    pointer-events: none;
  }
`

const MapWrapper = styled.div`
  border-radius: ${theme.radii.xl};
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  height: 280px;
`

const ToggleButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: ${theme.colors.slate[500]};
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: ${theme.fonts.primary};
  transition: color ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.slate[300]};
  }
`

const RawPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const RawTextarea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  background: rgba(22, 42, 74, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.xl};
  color: ${theme.colors.slate[200]};
  font-size: 12px;
  font-family: ${theme.fonts.mono};
  resize: none;
  outline: none;
  transition: border-color ${theme.transitions.fast};
  box-sizing: border-box;

  &::placeholder {
    color: ${theme.colors.slate[500]};
  }

  &:focus {
    border-color: rgba(200, 148, 42, 0.5);
  }
`

const ApplyButton = styled.button`
  padding: 6px 12px;
  font-size: 12px;
  background: rgba(200, 148, 42, 0.15);
  color: ${theme.colors.gold};
  border: none;
  border-radius: ${theme.radii.sm};
  cursor: pointer;
  font-family: ${theme.fonts.primary};
  transition: background ${theme.transitions.fast};
  align-self: flex-start;

  &:hover {
    background: rgba(200, 148, 42, 0.25);
  }
`

export default function CoordinateMapPicker({ value = [], onChange }: CoordinateMapPickerProps) {
  const [showRaw, setShowRaw] = useState(false)
  const [rawText, setRawText] = useState('')

  const points: [number, number][] = Array.isArray(value) ? value : []

  const addPoint = useCallback((latlng: [number, number]) => {
    onChange([...points, latlng])
  }, [points, onChange])

  const undoLast = useCallback(() => {
    if (points.length > 0) {
      onChange(points.slice(0, -1))
    }
  }, [points, onChange])

  const clearAll = useCallback(() => {
    onChange([])
  }, [onChange])

  const handleRawApply = useCallback(() => {
    try {
      const parsed = JSON.parse(rawText)
      if (Array.isArray(parsed) && parsed.every((p) => Array.isArray(p) && p.length === 2)) {
        onChange(parsed as [number, number][])
        setShowRaw(false)
      }
    } catch { /* ignore parse errors */ }
  }, [rawText, onChange])

  const center: [number, number] = points.length > 0
    ? [
        points.reduce((s, p) => s + p[0], 0) / points.length,
        points.reduce((s, p) => s + p[1], 0) / points.length,
      ]
    : [31.7683, 35.2137]

  const zoom = points.length > 0 ? 15 : 8

  return (
    <Wrapper>
      <Header>
        <Label>לחץ על המפה להוספת נקודות ({points.length} נקודות)</Label>
        <Controls>
          <IconButton
            type="button"
            onClick={undoLast}
            disabled={points.length === 0}
            title="בטל אחרון"
          >
            <Undo2 size={14} />
          </IconButton>
          <IconButton
            type="button"
            $variant="clear"
            onClick={clearAll}
            disabled={points.length === 0}
            title="נקה הכל"
          >
            <Trash2 size={14} />
          </IconButton>
        </Controls>
      </Header>

      <MapWrapper>
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          <ClickHandler onAdd={addPoint} />
          {points.length >= 3 && (
            <Polygon
              positions={points}
              pathOptions={{
                color: theme.colors.gold,
                fillColor: theme.colors.gold,
                fillOpacity: 0.2,
                weight: 2,
              }}
            />
          )}
        </MapContainer>
      </MapWrapper>

      <ToggleButton
        type="button"
        onClick={() => {
          setShowRaw(!showRaw)
          if (!showRaw) setRawText(JSON.stringify(points, null, 2))
        }}
      >
        {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        עריכת JSON ידנית
      </ToggleButton>

      {showRaw && (
        <RawPanel>
          <RawTextarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={4}
            dir="ltr"
          />
          <ApplyButton type="button" onClick={handleRawApply}>
            החל JSON
          </ApplyButton>
        </RawPanel>
      )}
    </Wrapper>
  )
}
