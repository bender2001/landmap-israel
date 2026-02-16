import { anthropic } from '../config/claude.js'
import { supabaseAdmin } from '../config/supabase.js'

const SYSTEM_PROMPT = `אתה יועץ השקעות דיגיטלי מקצועי בתחום הנדל"ן והקרקעות בישראל, עובד עבור פלטפורמת LandMap Israel.

הנחיות:
- ענה תמיד בעברית
- היה מקצועי אך נגיש
- התבסס על נתוני החלקה שסופקו לך
- הזהר מלתת ייעוץ השקעות מחייב — הדגש שמדובר במידע כללי בלבד
- אל תחשוף מידע על מוכרים או בעלי קרקע
- עודד את המשתמש ליצור קשר דרך הפלטפורמה לפרטים נוספים
- השתמש בנתונים ספציפיים מהחלקה (מחיר, שטח, תוכניות, ועדות) בתשובותיך`

export async function processMessage(sessionKey, plotId, userMessage) {
  // Fetch plot context if available
  let plotContext = ''
  if (plotId) {
    const { data: plot } = await supabaseAdmin
      .from('plots')
      .select('*')
      .eq('id', plotId)
      .single()

    if (plot) {
      plotContext = `\n\nנתוני החלקה הנוכחית:
- גוש: ${plot.block_number}, חלקה: ${plot.number}
- עיר: ${plot.city}
- שטח: ${plot.size_sqm} מ"ר
- מחיר: ₪${plot.total_price.toLocaleString()}
- שווי צפוי: ₪${(plot.projected_value || 0).toLocaleString()}
- שלב תכנוני: ${plot.zoning_stage}
- בשלות: ${plot.ripeness || 'לא צוין'}
- תיאור: ${plot.description || ''}
- הקשר אזורי: ${plot.area_context || ''}
- ועדות: ${JSON.stringify(plot.committees || {})}
- תקן 22: ${JSON.stringify(plot.standard22 || {})}`
    }
  }

  // Get chat history from session
  const { data: history } = await supabaseAdmin
    .from('chat_sessions')
    .select('messages')
    .eq('session_key', sessionKey)
    .single()

  const messages = history?.messages || []
  messages.push({ role: 'user', content: userMessage })

  // Call Claude
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20250514',
    max_tokens: 800,
    system: SYSTEM_PROMPT + plotContext,
    messages: messages.slice(-10), // Keep last 10 messages for context
  })

  const assistantMessage = response.content[0].text
  messages.push({ role: 'assistant', content: assistantMessage })

  // Upsert chat session
  await supabaseAdmin
    .from('chat_sessions')
    .upsert({
      session_key: sessionKey,
      plot_id: plotId || null,
      messages,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'session_key' })

  return assistantMessage
}
