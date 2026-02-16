import { resend } from '../config/email.js'

export async function sendLeadNotification(lead) {
  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) {
    console.log('[email] Skipping — no API key or admin email configured')
    return
  }

  const plot = lead.plots
  const plotInfo = plot
    ? `גוש ${plot.block_number} | חלקה ${plot.number} | ${plot.city}`
    : 'לא צוין'

  await resend.emails.send({
    from: 'LandMap <notifications@landmap.co.il>',
    to: process.env.ADMIN_EMAIL,
    subject: `ליד חדש — ${lead.name} | ${plotInfo}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0A1628; color: #E5B94E; padding: 20px; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 22px;">ליד חדש ב-LandMap</h1>
        </div>
        <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280;">שם:</td><td style="padding: 8px 0; font-weight: bold;">${lead.name}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">טלפון:</td><td style="padding: 8px 0; font-weight: bold;"><a href="tel:${lead.phone}">${lead.phone}</a></td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">אימייל:</td><td style="padding: 8px 0; font-weight: bold;"><a href="mailto:${lead.email}">${lead.email}</a></td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">חלקה:</td><td style="padding: 8px 0; font-weight: bold;">${plotInfo}</td></tr>
            ${lead.message ? `<tr><td style="padding: 8px 0; color: #6b7280;">הודעה:</td><td style="padding: 8px 0;">${lead.message}</td></tr>` : ''}
          </table>
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/admin/leads"
             style="display: inline-block; margin-top: 16px; padding: 10px 24px; background: #C8942A; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
            צפה בפאנל ניהול
          </a>
        </div>
      </div>
    `,
  })
}
