import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'
import {
  ArrowRight,
  Save,
  Upload,
  Trash2,
  ImageIcon,
  FileText,
} from 'lucide-react'
import { adminDocuments, adminImages, adminPlots } from '../../api/admin'
import { statusLabels, zoningLabels } from '../../utils/constants'
import Spinner from '../../components/ui/Spinner'
import CoordinateMapPicker from '../../components/admin/CoordinateMapPicker'
import { useToast } from '../../components/ui/ToastContainer'
import { theme, media } from '../../styles/theme'

type PlotFormState = {
  block_number: string
  number: string
  city: string
  status: string
  zoning_stage: string
  total_price: string
  projected_value: string
  size_sqm: string
  readiness_estimate: string
  description: string
  area_context: string
  nearby_development: string
  distance_to_sea: string
  distance_to_park: string
  distance_to_hospital: string
  density_units_per_dunam: string
  tax_authority_value: string
  coordinates: string
  is_published: boolean
}

type PlotPayload = Omit<PlotFormState, 'block_number' | 'number' | 'total_price' | 'projected_value' | 'size_sqm' | 'distance_to_sea' | 'distance_to_park' | 'distance_to_hospital' | 'density_units_per_dunam' | 'tax_authority_value' | 'coordinates'> & {
  block_number: number
  number: number
  total_price: number
  projected_value: number
  size_sqm: number
  distance_to_sea: number | null
  distance_to_park: number | null
  distance_to_hospital: number | null
  density_units_per_dunam: number | null
  tax_authority_value: number | null
  coordinates?: unknown
}

type PlotImage = {
  id: number | string
  url: string
  alt?: string | null
}

type PlotDocument = {
  id: number | string
  name: string
  size_bytes?: number | null
}

type PlotExisting = Partial<Omit<PlotFormState, 'coordinates'>> & {
  id: number | string
  coordinates?: unknown
  plot_images?: PlotImage[]
  plot_documents?: PlotDocument[]
}

const emptyForm: PlotFormState = {
  block_number: '',
  number: '',
  city: '',
  status: 'available',
  zoning_stage: 'agricultural',
  total_price: '',
  projected_value: '',
  size_sqm: '',
  readiness_estimate: '',
  description: '',
  area_context: '',
  nearby_development: '',
  distance_to_sea: '',
  distance_to_park: '',
  distance_to_hospital: '',
  density_units_per_dunam: '',
  tax_authority_value: '',
  coordinates: '',
  is_published: false,
}

export default function PlotForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [form, setForm] = useState<PlotFormState>(emptyForm)
  const [coordsArray, setCoordsArray] = useState<Array<[number, number]>>([])
  const [error, setError] = useState('')

  const { data: existing, isLoading } = useQuery<PlotExisting>({
    queryKey: ['admin', 'plot', id],
    queryFn: () => adminPlots.get(id as string),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      setForm({
        block_number: existing.block_number?.toString() ?? '',
        number: existing.number?.toString() ?? '',
        city: existing.city ?? '',
        status: existing.status ?? 'available',
        zoning_stage: existing.zoning_stage ?? 'agricultural',
        total_price: existing.total_price?.toString() ?? '',
        projected_value: existing.projected_value?.toString() ?? '',
        size_sqm: existing.size_sqm?.toString() ?? '',
        readiness_estimate: existing.readiness_estimate ?? '',
        description: existing.description ?? '',
        area_context: existing.area_context ?? '',
        nearby_development: existing.nearby_development ?? '',
        distance_to_sea: existing.distance_to_sea?.toString() ?? '',
        distance_to_park: existing.distance_to_park?.toString() ?? '',
        distance_to_hospital: existing.distance_to_hospital?.toString() ?? '',
        density_units_per_dunam: existing.density_units_per_dunam?.toString() ?? '',
        tax_authority_value: existing.tax_authority_value?.toString() ?? '',
        coordinates: existing.coordinates ? JSON.stringify(existing.coordinates) : '',
        is_published: existing.is_published ?? false,
      })
      if (Array.isArray(existing.coordinates)) {
        setCoordsArray(existing.coordinates as Array<[number, number]>)
      }
    }
  }, [existing])

  const saveMutation = useMutation({
    mutationFn: (data: PlotPayload) =>
      isEdit ? adminPlots.update(id as string, data) : adminPlots.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plots'] })
      navigate('/admin/plots')
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'שגיאה בשמירה'
      setError(message)
    },
  })

  const uploadImage = useMutation({
    mutationFn: ({ file, alt }: { file: File; alt: string }) =>
      adminImages.upload(id as string, file, alt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plot', id] })
      toast('תמונה הועלתה', 'success')
    },
    onError: () => toast('שגיאה בהעלאת תמונה', 'error'),
  })

  const deleteImage = useMutation({
    mutationFn: (imgId: number | string) => adminImages.delete(imgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plot', id] })
      toast('תמונה נמחקה', 'success')
    },
  })

  const uploadDoc = useMutation({
    mutationFn: ({ file, name }: { file: File; name: string }) =>
      adminDocuments.upload(id as string, file, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plot', id] })
      toast('מסמך הועלה', 'success')
    },
    onError: () => toast('שגיאה בהעלאת מסמך', 'error'),
  })

  const deleteDoc = useMutation({
    mutationFn: (docId: number | string) => adminDocuments.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plot', id] })
      toast('מסמך נמחק', 'success')
    },
  })

  const handleChange = <K extends keyof PlotFormState>(key: K, value: PlotFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleCoordsChange = (newCoords: Array<[number, number]>) => {
    setCoordsArray(newCoords)
    setForm((prev) => ({ ...prev, coordinates: JSON.stringify(newCoords) }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const payload: PlotPayload = {
      ...form,
      block_number: Number(form.block_number) || 0,
      number: Number(form.number) || 0,
      total_price: Number(form.total_price) || 0,
      projected_value: Number(form.projected_value) || 0,
      size_sqm: Number(form.size_sqm) || 0,
      distance_to_sea: form.distance_to_sea ? Number(form.distance_to_sea) : null,
      distance_to_park: form.distance_to_park ? Number(form.distance_to_park) : null,
      distance_to_hospital: form.distance_to_hospital ? Number(form.distance_to_hospital) : null,
      density_units_per_dunam: form.density_units_per_dunam ? Number(form.density_units_per_dunam) : null,
      tax_authority_value: form.tax_authority_value ? Number(form.tax_authority_value) : null,
    }

    try {
      if (form.coordinates) {
        payload.coordinates = JSON.parse(form.coordinates)
      }
    } catch {
      setError('פורמט קואורדינטות שגוי (JSON)')
      return
    }

    saveMutation.mutate(payload)
  }

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) uploadImage.mutate({ file, alt: '' })
    event.target.value = ''
  }

  const handleDocUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) uploadDoc.mutate({ file, name: file.name })
    event.target.value = ''
  }

  if (isEdit && isLoading) {
    return (
      <LoadingWrap>
        <SpinnerIcon />
      </LoadingWrap>
    )
  }

  const images = existing?.plot_images || []
  const documents = existing?.plot_documents || []

  return (
    <Page dir="rtl">
      <BackButton type="button" onClick={() => navigate('/admin/plots')}>
        <ArrowRight size={16} />
        חזרה לרשימה
      </BackButton>

      <PageTitle>{isEdit ? 'עריכת חלקה' : 'חלקה חדשה'}</PageTitle>

      {error && (
        <ErrorBox>
          <ErrorText>{error}</ErrorText>
        </ErrorBox>
      )}

      <Form onSubmit={handleSubmit}>
        <SectionCard>
          <SectionTitle>פרטים בסיסיים</SectionTitle>
          <GridTwo>
            <Field label="מספר גוש" type="number" value={form.block_number} onChange={(value) => handleChange('block_number', value)} />
            <Field label="מספר חלקה" type="number" value={form.number} onChange={(value) => handleChange('number', value)} />
            <Field label="עיר" value={form.city} onChange={(value) => handleChange('city', value)} />
            <Field label="שטח (מ&quot;ר)" type="number" value={form.size_sqm} onChange={(value) => handleChange('size_sqm', value)} />
          </GridTwo>
          <GridTwo>
            <SelectField label="סטטוס" value={form.status} options={statusLabels} onChange={(value) => handleChange('status', value)} />
            <SelectField label="שלב ייעוד" value={form.zoning_stage} options={zoningLabels} onChange={(value) => handleChange('zoning_stage', value)} />
          </GridTwo>
        </SectionCard>

        <SectionCard>
          <SectionTitle>נתונים פיננסיים</SectionTitle>
          <GridTwo>
            <Field label="מחיר מבוקש (₪)" type="number" value={form.total_price} onChange={(value) => handleChange('total_price', value)} />
            <Field label="שווי צפוי (₪)" type="number" value={form.projected_value} onChange={(value) => handleChange('projected_value', value)} />
            <Field label="שווי רשות מיסים (₪)" type="number" value={form.tax_authority_value} onChange={(value) => handleChange('tax_authority_value', value)} />
            <Field label="צפי מוכנות" value={form.readiness_estimate} onChange={(value) => handleChange('readiness_estimate', value)} placeholder="3-5 שנים" />
          </GridTwo>
        </SectionCard>

        <SectionCard>
          <SectionTitle>פרטים נוספים</SectionTitle>
          <TextArea label="תיאור" value={form.description} onChange={(value) => handleChange('description', value)} />
          <TextArea label="הקשר אזורי" value={form.area_context} onChange={(value) => handleChange('area_context', value)} />
          <Field label="פיתוח סמוך" value={form.nearby_development} onChange={(value) => handleChange('nearby_development', value)} />
          <GridThree>
            <Field label="מרחק מהים (מ')" type="number" value={form.distance_to_sea} onChange={(value) => handleChange('distance_to_sea', value)} />
            <Field label="מרחק מפארק (מ')" type="number" value={form.distance_to_park} onChange={(value) => handleChange('distance_to_park', value)} />
            <Field label="מרחק מביה&quot;ח (מ')" type="number" value={form.distance_to_hospital} onChange={(value) => handleChange('distance_to_hospital', value)} />
          </GridThree>
          <Field label="צפיפות (יח&quot;ד/דונם)" type="number" value={form.density_units_per_dunam} onChange={(value) => handleChange('density_units_per_dunam', value)} />
        </SectionCard>

        <SectionCard>
          <SectionTitle>קואורדינטות מגרש</SectionTitle>
          <CoordinateMapPicker value={coordsArray} onChange={handleCoordsChange} />
        </SectionCard>

        {isEdit && (
          <SectionCard>
            <SectionHeader>
              <SectionTitle>
                <ImageIcon size={16} color={theme.colors.gold} />
                תמונות ({images.length})
              </SectionTitle>
              <UploadLabel>
                <Upload size={14} />
                העלה תמונה
                <HiddenInput type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} />
              </UploadLabel>
            </SectionHeader>
            {images.length ? (
              <ImageGrid>
                {images.map((img) => (
                  <ImageCard key={img.id}>
                    <img src={img.url} alt={img.alt || ''} />
                    <DeleteIcon type="button" onClick={() => deleteImage.mutate(img.id)}>
                      <Trash2 size={12} />
                    </DeleteIcon>
                  </ImageCard>
                ))}
              </ImageGrid>
            ) : (
              <EmptyNote>אין תמונות. העלה תמונות לחלקה.</EmptyNote>
            )}
          </SectionCard>
        )}

        {isEdit && (
          <SectionCard>
            <SectionHeader>
              <SectionTitle>
                <FileText size={16} color={theme.colors.gold} />
                מסמכים ({documents.length})
              </SectionTitle>
              <UploadLabel>
                <Upload size={14} />
                העלה מסמך
                <HiddenInput type="file" accept="application/pdf,image/*" onChange={handleDocUpload} />
              </UploadLabel>
            </SectionHeader>
            {documents.length ? (
              <DocumentList>
                {documents.map((doc) => (
                  <DocumentItem key={doc.id}>
                    <DocumentInfo>
                      <FileText size={16} color={`${theme.colors.gold}99`} />
                      <div>
                        <DocumentName>{doc.name}</DocumentName>
                        {doc.size_bytes && (
                          <DocumentMeta>{(doc.size_bytes / 1024).toFixed(0)} KB</DocumentMeta>
                        )}
                      </div>
                    </DocumentInfo>
                    <DocumentDelete type="button" onClick={() => deleteDoc.mutate(doc.id)}>
                      <Trash2 size={14} />
                    </DocumentDelete>
                  </DocumentItem>
                ))}
              </DocumentList>
            ) : (
              <EmptyNote>אין מסמכים. העלה מסמכים לחלקה.</EmptyNote>
            )}
          </SectionCard>
        )}

        <SectionCard>
          <PublishToggle>
            <Checkbox
              type="checkbox"
              checked={form.is_published}
              onChange={(event) => handleChange('is_published', event.target.checked)}
            />
            <span>פרסם חלקה (גלוי לציבור)</span>
          </PublishToggle>
        </SectionCard>

        <SubmitButton type="submit" disabled={saveMutation.isPending}>
          <Save size={16} />
          {saveMutation.isPending ? 'שומר...' : isEdit ? 'עדכן חלקה' : 'צור חלקה'}
        </SubmitButton>
      </Form>
    </Page>
  )
}

type FieldProps = {
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function Field({ label, type = 'text', value, onChange, placeholder }: FieldProps) {
  return (
    <FieldBlock>
      <FieldLabel>{label}</FieldLabel>
      <FieldInput
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </FieldBlock>
  )
}

type SelectFieldProps = {
  label: string
  value: string
  options: Record<string, string>
  onChange: (value: string) => void
}

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <FieldBlock>
      <FieldLabel>{label}</FieldLabel>
      <SelectInput value={value} onChange={(event) => onChange(event.target.value)}>
        {Object.entries(options).map(([key, labelText]) => (
          <option key={key} value={key}>
            {labelText}
          </option>
        ))}
      </SelectInput>
    </FieldBlock>
  )
}

type TextAreaProps = {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}

function TextArea({ label, value, onChange, rows = 3 }: TextAreaProps) {
  return (
    <FieldBlock>
      <FieldLabel>{label}</FieldLabel>
      <TextAreaInput
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
      />
    </FieldBlock>
  )
}

const Page = styled.div`
  padding: 24px;
  max-width: 48rem;
  margin: 0 auto;
`

const LoadingWrap = styled.div`
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`

const SpinnerIcon = styled(Spinner)`
  width: 40px;
  height: 40px;
  color: ${theme.colors.gold};
`

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: ${theme.colors.slate[400]};
  margin-bottom: 16px;
  transition: ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.gold};
  }
`

const PageTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
  margin-bottom: 24px;
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
  gap: 24px;
`

const SectionCard = styled.div`
  background: ${theme.glass.bg};
  border: ${theme.glass.border};
  backdrop-filter: ${theme.glass.blur};
  border-radius: ${theme.radii.xl};
  box-shadow: ${theme.shadows.glass};
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const SectionTitle = styled.h2`
  font-size: 0.875rem;
  font-weight: 700;
  color: ${theme.colors.slate[300]};
  display: flex;
  align-items: center;
  gap: 8px;
`

const GridTwo = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  ${media.mobile} {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
`

const GridThree = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  ${media.tablet} {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
`

const FieldBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const FieldLabel = styled.label`
  font-size: 0.75rem;
  color: ${theme.colors.slate[400]};
`

const FieldInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  background: rgba(22, 42, 74, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.xl};
  color: ${theme.colors.slate[200]};
  font-size: 0.875rem;
  transition: ${theme.transitions.fast};

  &::placeholder {
    color: ${theme.colors.slate[500]};
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.gold}80;
  }
`

const SelectInput = styled.select`
  width: 100%;
  padding: 10px 12px;
  background: rgba(22, 42, 74, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.xl};
  color: ${theme.colors.slate[200]};
  font-size: 0.875rem;
  transition: ${theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${theme.colors.gold}80;
  }
`

const TextAreaInput = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  background: rgba(22, 42, 74, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.xl};
  color: ${theme.colors.slate[200]};
  font-size: 0.875rem;
  resize: none;
  transition: ${theme.transitions.fast};

  &::placeholder {
    color: ${theme.colors.slate[500]};
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.gold}80;
  }
`

const UploadLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 0.75rem;
  background: ${theme.colors.gold}26;
  color: ${theme.colors.gold};
  border-radius: ${theme.radii.md};
  cursor: pointer;
  transition: ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.gold}40;
  }
`

const HiddenInput = styled.input`
  display: none;
`

const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  ${media.tablet} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  ${media.mobile} {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
`

const ImageCard = styled.div`
  position: relative;
  border-radius: ${theme.radii.xl};
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);

  img {
    width: 100%;
    height: 96px;
    object-fit: cover;
    display: block;
  }
`

const DeleteIcon = styled.button`
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 6px;
  border-radius: ${theme.radii.md};
  background: rgba(239, 68, 68, 0.8);
  color: ${theme.colors.white};
  opacity: 0;
  transition: ${theme.transitions.fast};

  ${ImageCard}:hover & {
    opacity: 1;
  }
`

const DocumentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const DocumentItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: ${theme.radii.xl};
  background: rgba(22, 42, 74, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
`

const DocumentInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`

const DocumentName = styled.p`
  font-size: 0.875rem;
  color: ${theme.colors.slate[300]};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const DocumentMeta = styled.p`
  font-size: 0.625rem;
  color: ${theme.colors.slate[500]};
`

const DocumentDelete = styled.button`
  padding: 6px;
  border-radius: ${theme.radii.md};
  color: ${theme.colors.slate[400]};
  transition: ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.red};
    background: rgba(239, 68, 68, 0.1);
  }
`

const EmptyNote = styled.p`
  text-align: center;
  color: ${theme.colors.slate[500]};
  font-size: 0.75rem;
  padding: 12px 0;
`

const PublishToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 0.875rem;
  color: ${theme.colors.slate[200]};
`

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: ${theme.colors.gold};
`

const SubmitButton = styled.button`
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
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
