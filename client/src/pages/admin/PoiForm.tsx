import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'
import { adminPois } from '../../api/admin'
import { ArrowRight, Save } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/ToastContainer'
import { theme, media } from '../../styles/theme'

const iconOptions: string[] = ['📍', '🏥', '🏫', '🏪', '🏬', '🏗️', '🌳', '🏖️', '🚉', '🅿️', '⛽', '🏛️', '🕌', '⛪', '🕍', '🏟️']
const typeOptions: string[] = ['general', 'hospital', 'school', 'shopping', 'transport', 'park', 'beach', 'religious', 'government']

interface PoiFormData {
  name: string
  type: string
  icon: string
  lat: string
  lng: string
  description: string
}

interface PoiFormErrors {
  [key: string]: string
}

interface ExistingPoi {
  name?: string
  type?: string
  icon?: string
  lat?: number
  lng?: number
  description?: string
  coordinates?: { lat?: number; latitude?: number; lng?: number; longitude?: number } | number[]
  [key: string]: any
}

interface PoiSavePayload {
  name: string
  type: string
  icon: string
  lat: number
  lng: number
  description: string | null
}

export default function PoiForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const isEdit = Boolean(id)

  const [formData, setFormData] = useState<PoiFormData>({
    name: '',
    type: 'general',
    icon: '📍',
    lat: '',
    lng: '',
    description: '',
  })
  const [errors, setErrors] = useState<PoiFormErrors>({})

  // Load existing POI for editing
  const { data: existingPoi, isLoading: loadingPoi } = useQuery<ExistingPoi>({
    queryKey: ['admin', 'pois', id],
    queryFn: () => adminPois.get(id!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existingPoi) {
      // Extract lat/lng — prefer flat fields, fall back to coordinates JSONB
      let lat = existingPoi.lat
      let lng = existingPoi.lng
      if (lat == null || lng == null) {
        const coords = existingPoi.coordinates
        if (coords) {
          if (typeof coords === 'object' && !Array.isArray(coords)) {
            lat = coords.lat ?? coords.latitude ?? lat
            lng = coords.lng ?? coords.longitude ?? lng
          } else if (Array.isArray(coords) && coords.length >= 2) {
            lat = coords[0]
            lng = coords[1]
          }
        }
      }
      setFormData({
        name: existingPoi.name || '',
        type: existingPoi.type || 'general',
        icon: existingPoi.icon || '📍',
        lat: lat != null ? lat.toString() : '',
        lng: lng != null ? lng.toString() : '',
        description: existingPoi.description || '',
      })
    }
  }, [existingPoi])

  const saveMutation = useMutation({
    mutationFn: (data: PoiSavePayload) => isEdit ? adminPois.update(id!, data) : adminPois.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pois'] })
      toast(isEdit ? 'נקודת עניין עודכנה' : 'נקודת עניין נוצרה', 'success')
      navigate('/admin/pois')
    },
    onError: () => toast('שגיאה בשמירה', 'error'),
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const newErrors: PoiFormErrors = {}
    if (!formData.name.trim()) newErrors.name = 'שדה חובה'
    if (!formData.lat || isNaN(parseFloat(formData.lat))) newErrors.lat = 'נדרש מספר תקין'
    if (!formData.lng || isNaN(parseFloat(formData.lng))) newErrors.lng = 'נדרש מספר תקין'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    saveMutation.mutate({
      name: formData.name.trim(),
      type: formData.type,
      icon: formData.icon,
      lat: parseFloat(formData.lat),
      lng: parseFloat(formData.lng),
      description: formData.description.trim() || null,
    })
  }

  if (isEdit && loadingPoi) {
    return (
      <LoadingWrap>
        <SpinnerStyled size={40} />
      </LoadingWrap>
    )
  }

  return (
    <Page dir="rtl">
      <BackButton type="button" onClick={() => navigate('/admin/pois')}>
        <ArrowRight size={16} />
        חזרה לרשימה
      </BackButton>

      <Title>{isEdit ? 'עריכת נקודת עניין' : 'נקודת עניין חדשה'}</Title>

      <FormCard onSubmit={handleSubmit}>
        {/* Name */}
        <FieldBlock>
          <FieldLabel>שם</FieldLabel>
          <FieldInput
            type="text"
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('name', e.target.value)}
            placeholder="שם נקודת העניין"
          />
          {errors.name && <ErrorMsg>{errors.name}</ErrorMsg>}
        </FieldBlock>

        {/* Type */}
        <FieldBlock>
          <FieldLabel>סוג</FieldLabel>
          <SelectInput
            value={formData.type}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('type', e.target.value)}
          >
            {typeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </SelectInput>
        </FieldBlock>

        {/* Icon picker */}
        <FieldBlock>
          <FieldLabel>אייקון</FieldLabel>
          <IconGrid>
            {iconOptions.map((icon) => (
              <IconButton
                key={icon}
                type="button"
                $active={formData.icon === icon}
                onClick={() => handleChange('icon', icon)}
              >
                {icon}
              </IconButton>
            ))}
          </IconGrid>
        </FieldBlock>

        {/* Coordinates */}
        <CoordsGrid>
          <FieldBlock>
            <FieldLabel>Latitude</FieldLabel>
            <FieldInput
              type="text"
              dir="ltr"
              value={formData.lat}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('lat', e.target.value)}
              placeholder="32.0853"
            />
            {errors.lat && <ErrorMsg>{errors.lat}</ErrorMsg>}
          </FieldBlock>
          <FieldBlock>
            <FieldLabel>Longitude</FieldLabel>
            <FieldInput
              type="text"
              dir="ltr"
              value={formData.lng}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('lng', e.target.value)}
              placeholder="34.7818"
            />
            {errors.lng && <ErrorMsg>{errors.lng}</ErrorMsg>}
          </FieldBlock>
        </CoordsGrid>

        {/* Description */}
        <FieldBlock>
          <FieldLabel>תיאור (אופציונלי)</FieldLabel>
          <TextAreaInput
            rows={3}
            value={formData.description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('description', e.target.value)}
            placeholder="תיאור נקודת העניין..."
          />
        </FieldBlock>

        {/* Submit */}
        <SubmitButton type="submit" disabled={saveMutation.isPending}>
          <Save size={16} />
          {saveMutation.isPending ? 'שומר...' : isEdit ? 'עדכן' : 'צור'}
        </SubmitButton>
      </FormCard>
    </Page>
  )
}

/* ── Styled components ─────────────────────────────────── */

const LoadingWrap = styled.div`
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`

const SpinnerStyled = styled(Spinner)`
  color: ${theme.colors.primary};
`

const Page = styled.div`
  padding: ${theme.space.md};
  max-width: 42rem;
  margin: 0 auto;

  ${media.sm} {
    padding: ${theme.space.lg};
  }
`

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${theme.space.sm};
  font-size: 0.875rem;
  color: ${theme.colors.textSecondary};
  background: none;
  border: none;
  cursor: pointer;
  margin-bottom: ${theme.space.lg};
  transition: color ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.primary};
  }
`

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${theme.colors.text};
  margin-bottom: ${theme.space.lg};
`

const FormCard = styled.form`
  background: ${theme.colors.bg};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.xl};
  box-shadow: ${theme.shadows.card};
  padding: ${theme.space.lg};
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const FieldBlock = styled.div`
  display: flex;
  flex-direction: column;
`

const FieldLabel = styled.label`
  font-size: 0.75rem;
  color: ${theme.colors.textSecondary};
  margin-bottom: 6px;
  display: block;
`

const inputStyles = `
  width: 100%;
  padding: 12px 16px;
  background: ${theme.colors.bgSecondary};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.xl};
  color: ${theme.colors.text};
  font-size: 0.875rem;
  transition: border-color ${theme.transitions.fast};

  &::placeholder {
    color: ${theme.colors.textTertiary};
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px ${theme.colors.primaryLight};
  }
`

const FieldInput = styled.input`
  ${inputStyles}
`

const SelectInput = styled.select`
  ${inputStyles}
`

const TextAreaInput = styled.textarea`
  ${inputStyles}
  resize: none;
`

const IconGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.space.sm};
`

const IconButton = styled.button<{ $active: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: ${theme.radii.lg};
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  background: ${({ $active }) =>
    $active ? theme.colors.primaryLight : theme.colors.bgTertiary};
  border: 2px solid ${({ $active }) =>
    $active ? theme.colors.primary : theme.colors.borderLight};
  transform: ${({ $active }) => ($active ? 'scale(1.1)' : 'scale(1)')};

  &:hover {
    background: ${({ $active }) =>
      $active ? theme.colors.primaryLight : theme.colors.bgSecondary};
  }
`

const CoordsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.space.md};
`

const ErrorMsg = styled.p`
  font-size: 0.75rem;
  color: ${theme.colors.danger};
  margin-top: ${theme.space.xs};
`

const SubmitButton = styled.button`
  width: 100%;
  padding: 14px;
  background: ${theme.gradients.primary};
  border: none;
  border-radius: ${theme.radii.xl};
  color: ${theme.colors.white};
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.space.sm};
  transition: box-shadow ${theme.transitions.smooth};

  &:hover:not(:disabled) {
    box-shadow: ${theme.shadows.xl};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`
