/**
 * PlotNotes - Personal notes editor for a plot
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { StickyNote, Trash2, Check } from 'lucide-react'
import { NOTE_TAGS } from '../../hooks/useUserData'
import { theme as themeTokens } from '../../styles/theme'

const Wrapper = styled.div`
  background: rgba(22, 42, 74, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${themeTokens.radii.lg};
  padding: 12px;
  transition: border ${themeTokens.transitions.normal};
  direction: rtl;
  &:hover { border-color: rgba(255, 255, 255, 0.1); }
`
const Header = styled.div`display: flex; align-items: center; gap: 8px; margin-bottom: 8px;`
const Title = styled.span`font-size: 11px; font-weight: 600; color: ${themeTokens.colors.slate[400]};`
const DeleteButton = styled.button`margin-right: auto; color: ${themeTokens.colors.slate[600]}; background: transparent; border: none; padding: 2px; cursor: pointer; transition: color ${themeTokens.transitions.normal}; &:hover { color: ${themeTokens.colors.red}; }`
const Tags = styled.div`display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;`
const TagButton = styled.button<{ $active: boolean; $color?: string }>`
  display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px;
  border-radius: ${themeTokens.radii.md}; font-size: 9px; font-weight: 600;
  border: 1px solid ${({ $active, $color }) => ($active && $color ? `${$color}40` : 'rgba(255,255,255,0.05)')};
  color: ${({ $active, $color }) => ($active && $color ? $color : themeTokens.colors.slate[500])};
  background: ${({ $active, $color }) => ($active && $color ? `${$color}15` : 'rgba(255,255,255,0.02)')};
  transition: background ${themeTokens.transitions.normal}, color ${themeTokens.transitions.normal};
  &:hover { background: ${({ $active, $color }) => ($active && $color ? `${$color}25` : 'rgba(255,255,255,0.05)')}; color: ${({ $active, $color }) => ($active && $color ? $color : themeTokens.colors.slate[300])}; }
`
const Textarea = styled.textarea`
  width: 100%; background: rgba(10, 22, 40, 0.6); border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${themeTokens.radii.md}; padding: 8px 12px; font-size: 12px;
  color: ${themeTokens.colors.slate[200]}; resize: none; outline: none;
  transition: border ${themeTokens.transitions.normal};
  &::placeholder { color: ${themeTokens.colors.slate[600]}; }
  &:focus { border-color: ${themeTokens.colors.gold}4d; }
`
const Footer = styled.div`display: flex; align-items: center; justify-content: space-between;`
const Counter = styled.span`font-size: 9px; color: ${themeTokens.colors.slate[600]};`
const Actions = styled.div`display: flex; align-items: center; gap: 6px;`
const Cancel = styled.button`padding: 4px 10px; font-size: 10px; color: ${themeTokens.colors.slate[400]}; background: transparent; border: none; cursor: pointer; transition: color ${themeTokens.transitions.normal}; &:hover { color: ${themeTokens.colors.slate[200]}; }`
const Save = styled.button`
  display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; font-size: 10px; font-weight: 700;
  color: ${themeTokens.colors.gold}; background: ${themeTokens.colors.gold}26; border: 1px solid ${themeTokens.colors.gold}40;
  border-radius: ${themeTokens.radii.md}; cursor: pointer; transition: background ${themeTokens.transitions.normal};
  &:hover { background: ${themeTokens.colors.gold}40; }
`
const Prompt = styled.button<{ $hasText: boolean }>`
  width: 100%; text-align: right; padding: 8px 12px; border-radius: ${themeTokens.radii.md};
  border: 1px dashed ${({ $hasText }) => ($hasText ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)')};
  background: ${({ $hasText }) => ($hasText ? 'rgba(255,255,255,0.02)' : 'transparent')};
  color: ${({ $hasText }) => ($hasText ? themeTokens.colors.slate[300] : themeTokens.colors.slate[600])};
  font-size: 12px; cursor: pointer; transition: border ${themeTokens.transitions.normal}, color ${themeTokens.transitions.normal}, background ${themeTokens.transitions.normal};
  &:hover { border-color: ${themeTokens.colors.gold}33; color: ${themeTokens.colors.slate[400]}; background: rgba(255,255,255,0.04); }
`
const Timestamp = styled.div`font-size: 8px; color: ${themeTokens.colors.slate[700]}; margin-top: 4px; text-align: left; direction: ltr;`

interface NoteApi {
  getNote: (plotId: string | number) => { text?: string; tags?: string[]; updatedAt?: string | number } | null
  setNote: (plotId: string | number, text: string) => void
  removeNote: (plotId: string | number) => void
  toggleTag: (plotId: string | number, tagId: string) => void
}

interface PlotNotesProps {
  plotId: string | number
  notes: NoteApi
}

export default function PlotNotes({ plotId, notes }: PlotNotesProps) {
  const note = notes.getNote(plotId)
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(note?.text || '')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const hasContent = !!(note && (note.text || note.tags?.length))

  useEffect(() => { const current = notes.getNote(plotId); setText(current?.text || ''); setIsEditing(false) }, [plotId, notes])

  const handleStartEdit = useCallback(() => { setIsEditing(true); requestAnimationFrame(() => textareaRef.current?.focus()) }, [])
  const handleSave = useCallback(() => { notes.setNote(plotId, text.trim()); setIsEditing(false) }, [plotId, text, notes])
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSave() }
    if (e.key === 'Escape') { setText(note?.text || ''); setIsEditing(false) }
  }, [handleSave, note?.text])
  const handleDelete = useCallback(() => { notes.removeNote(plotId); setText(''); setIsEditing(false) }, [plotId, notes])

  const activeTags = note?.tags || []

  return (
    <Wrapper>
      <Header>
        <StickyNote size={14} color={`${themeTokens.colors.amber}b3`} />
        <Title>הערות אישיות</Title>
        {hasContent && <DeleteButton onClick={handleDelete} title="מחק הערה"><Trash2 size={12} /></DeleteButton>}
      </Header>
      <Tags>
        {NOTE_TAGS.map(tag => {
          const isActive = activeTags.includes(tag.id)
          return <TagButton key={tag.id} onClick={() => notes.toggleTag(plotId, tag.id)} $active={isActive} $color={tag.color}>{tag.label}</TagButton>
        })}
      </Tags>
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Textarea ref={textareaRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown} placeholder={'רשום הערה... (למשל: דיברתי עם עו"ד, נסח נקי)'} rows={3} maxLength={500} />
          <Footer>
            <Counter>{text.length}/500 \u00B7 Ctrl+Enter לשמירה</Counter>
            <Actions>
              <Cancel onClick={() => { setText(note?.text || ''); setIsEditing(false) }}>ביטול</Cancel>
              <Save onClick={handleSave}><Check size={12} />שמור</Save>
            </Actions>
          </Footer>
        </div>
      ) : (
        <Prompt onClick={handleStartEdit} $hasText={!!note?.text}>{note?.text || '\u270F️ הוסף הערה אישית...'}</Prompt>
      )}
      {note?.updatedAt && <Timestamp>{new Date(note.updatedAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Timestamp>}
    </Wrapper>
  )
}
