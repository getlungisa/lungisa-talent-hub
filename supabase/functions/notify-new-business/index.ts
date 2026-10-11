import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface BusinessRow {
  id: string
  name: string
  user_id: string
  status: string
  contact_email: string
  contact_name: string | null
  whatsapp_number: string | null
  area: string | null
  number_of_sites: number | null
  roles_hired: string | null
  website_or_social: string | null
  created_at: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function renderHtml(b: BusinessRow, reviewUrl: string | null): string {
  const palette = {
    background: '#f9f8f6',
    card: '#ffffff',
    text: '#1b1e33',
    secondary: '#5a5d70',
    primary: '#2b3a8c',
  }
  const ts = new Date(b.created_at).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Johannesburg',
  }) + ' SAST'
  const val = (v: string | number | null) =>
    v === null || v === undefined || String(v).trim() === '' ? 'Not specified' : escapeHtml(String(v))
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:${palette.secondary};width:140px;vertical-align:top;">${label}</td><td style="padding:6px 0;">${value}</td></tr>`
  const reviewLink = reviewUrl
    ? `<p style="margin:24px 0 0;font-size:14px;"><a href="${escapeHtml(reviewUrl)}" style="color:${palette.primary};text-decoration:none;font-weight:600;">Review in admin</a></p>`
    : ''

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${palette.background};font-family:'Schibsted Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${palette.text};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${palette.background};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${palette.card};border-radius:14px;padding:32px 28px;">
        <tr><td>
          <h1 style="margin:0 0 24px;font-size:22px;color:${palette.primary};font-weight:600;">New business signed up</h1>
          <p style="margin:0 0 4px;font-size:16px;font-weight:600;">${escapeHtml(b.name)}</p>
          <p style="margin:0 0 20px;font-size:14px;color:${palette.secondary};"><a href="mailto:${escapeHtml(b.contact_email)}" style="color:${palette.secondary};text-decoration:none;">${escapeHtml(b.contact_email)}</a></p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.5;">
            ${row('Contact name', val(b.contact_name))}
            ${row('WhatsApp', val(b.whatsapp_number))}
            ${row('Area', val(b.area))}
            ${row('Number of sites', val(b.number_of_sites))}
            ${row('Roles hired', val(b.roles_hired))}
            ${row('Website / social', val(b.website_or_social))}
            ${row('Status', val(b.status))}
            ${row('Signed up', escapeHtml(ts))}
          </table>
          ${reviewLink}
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:${palette.secondary};">Sent by Lungisa Ltd</p>
    </td></tr>
  </table>
</body></html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    if (!RESEND_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error('notify-new-business: missing configuration')
      return json({ error: 'Function not configured' }, 500)
    }

    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (!token) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json().catch(() => null) as { businessId?: string } | null
    const businessId = body?.businessId
    if (!businessId || typeof businessId !== 'string') {
      return json({ error: 'Missing businessId' }, 400)
    }

    // Business details come from the database, never from the caller.
    const { data: business, error: bizErr } = await admin
      .from('businesses')
      .select(
        'id, name, user_id, status, contact_email:"contact email", contact_name, whatsapp_number, area, number_of_sites, roles_hired, website_or_social, created_at',
      )
      .eq('id', businessId)
      .maybeSingle()
    if (bizErr) {
      console.error('notify-new-business: lookup error', bizErr)
      return json({ error: 'Lookup failed' }, 500)
    }
    if (!business || (business as BusinessRow).user_id !== userData.user.id) {
      return json({ error: 'Not found' }, 404)
    }
    const b = business as BusinessRow

    const origin = req.headers.get('origin')
    const reviewUrl = origin && /^https?:\/\//.test(origin) ? `${origin}/admin/businesses` : null

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Lungisa <hi@lungisa.co>',
        to: ['neil@riseventurelab.co'],
        reply_to: b.contact_email || undefined,
        subject: `New business signed up: ${b.name.replace(/[\r\n]+/g, ' ')}`,
        html: renderHtml(b, reviewUrl),
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('notify-new-business: Resend error', res.status, data)
      return json({ error: 'Resend failed', status: res.status }, 502)
    }
    return json({ ok: true, id: (data as { id?: string })?.id }, 200)
  } catch (err) {
    console.error('notify-new-business: unexpected error', err)
    return json({ error: 'Unexpected error' }, 500)
  }
})
