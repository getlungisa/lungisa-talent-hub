import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface Payload {
  businessName: string
  contactEmail: string
  role: string
  timing: string
  mustHaves?: string | null
  createdAt: string
  dashboardUrl?: string | null
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderHtml(p: Payload): string {
  const palette = {
    background: '#f9f8f6',
    card: '#ffffff',
    text: '#1b1e33',
    secondary: '#5a5d70',
    primary: '#2b3a8c',
  }
  const ts = new Date(p.createdAt).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Johannesburg',
  }) + ' SAST'
  const must = p.mustHaves && p.mustHaves.trim().length > 0
    ? escapeHtml(p.mustHaves)
    : 'Not specified'
  const dashboardLink = p.dashboardUrl
    ? `<p style="margin:24px 0 0;font-size:14px;"><a href="${escapeHtml(p.dashboardUrl)}" style="color:${accent};text-decoration:none;font-weight:600;">View in dashboard</a></p>`
    : ''

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${palette.background};font-family:'Schibsted Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${palette.text};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${palette.background};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${palette.card};border-radius:14px;padding:32px 28px;">
        <tr><td>
          <h1 style="margin:0 0 24px;font-size:22px;color:${palette.primary};font-weight:600;">New need submitted</h1>
          <p style="margin:0 0 4px;font-size:16px;font-weight:600;">${escapeHtml(p.businessName)}</p>
          <p style="margin:0 0 20px;font-size:14px;color:${palette.secondary};"><a href="mailto:${escapeHtml(p.contactEmail)}" style="color:${palette.secondary};text-decoration:none;">${escapeHtml(p.contactEmail)}</a></p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.5;">
            <tr><td style="padding:6px 0;color:${palette.secondary};width:120px;">Role</td><td style="padding:6px 0;">${escapeHtml(p.role)}</td></tr>
            <tr><td style="padding:6px 0;color:${palette.secondary};">Timing</td><td style="padding:6px 0;">${escapeHtml(p.timing)}</td></tr>
            <tr><td style="padding:6px 0;color:${palette.secondary};vertical-align:top;">Must-haves</td><td style="padding:6px 0;">${must}</td></tr>
            <tr><td style="padding:6px 0;color:${palette.secondary};">Submitted</td><td style="padding:6px 0;">${escapeHtml(ts)}</td></tr>
          </table>
          ${dashboardLink}
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
    if (!RESEND_API_KEY) {
      console.error('notify-new-need: RESEND_API_KEY missing')
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const body = (await req.json()) as Payload
    if (!body?.businessName || !body?.role || !body?.timing || !body?.createdAt) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const subject = `New need from ${body.businessName}: ${body.role}`
    const html = renderHtml(body)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Lungisa <hi@lungisa.co>',
        to: ['neil@riseventurelab.co'],
        reply_to: body.contactEmail || undefined,
        subject,
        html,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('notify-new-need: Resend error', res.status, data)
      return new Response(JSON.stringify({ error: 'Resend failed', status: res.status, data }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, id: (data as any)?.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-new-need: unexpected error', err)
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
