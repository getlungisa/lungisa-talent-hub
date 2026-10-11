import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const ownerEmail = Deno.env.get('OWNER_ALERT_EMAIL')?.trim()
    if (!ownerEmail) {
      console.error('notify-new-business: OWNER_ALERT_EMAIL missing or blank; skipping')
      return json({ ok: false, skipped: 'owner_email_not_configured' })
    }
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      console.error('notify-new-business: RESEND_API_KEY missing; skipping')
      return json({ error: 'RESEND_API_KEY not configured' }, 500)
    }

    const body = await req.json().catch(() => null)
    const businessId = body?.businessId
    if (typeof businessId !== 'string' || !businessId) {
      return json({ error: 'Missing businessId' }, 400)
    }

    const url = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Caller must be the owner of the business.
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: userData } = await admin.auth.getUser(token)
    const uid = userData?.user?.id
    if (!uid) return json({ error: 'Unauthorized' }, 401)

    // Atomic claim: UPDATE businesses SET owner_alerted_at = now()
    // WHERE id = $1 AND status = 'pending' AND owner_alerted_at IS NULL
    const { data: claimed, error: claimErr } = await admin
      .from('businesses')
      .update({ owner_alerted_at: new Date().toISOString() })
      .eq('id', businessId)
      .eq('status', 'pending')
      .is('owner_alerted_at', null)
      .or(`user_id.eq.${uid},secondary_user_id.eq.${uid}`)
      .select('id, name, contact_name, whatsapp_number, area, number_of_sites, roles_hired, website_or_social, created_at, "contact email"')
    if (claimErr) {
      console.error('notify-new-business: claim error', claimErr)
      return json({ error: 'Claim failed' }, 500)
    }
    if (!claimed || claimed.length === 0) {
      return json({ ok: true, skipped: 'not_claimable' })
    }
    const b = claimed[0] as Record<string, unknown>
    const f = (k: string) => escapeHtml(String(b[k] ?? '—'))

    const html = `<!doctype html><html><body style="font-family:sans-serif;color:#1b1e33;">
<h2>New business pending approval</h2>
<p><strong>${f('name')}</strong></p>
<ul>
<li>Contact: ${f('contact_name')} (${f('contact email')})</li>
<li>WhatsApp: ${f('whatsapp_number')}</li>
<li>Area: ${f('area')}</li>
<li>Sites: ${f('number_of_sites')}</li>
<li>Roles hired: ${f('roles_hired')}</li>
<li>Website/social: ${f('website_or_social')}</li>
</ul></body></html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + resendKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Lungisa <hi@lungisa.co>',
        to: [ownerEmail],
        subject: `New business pending approval: ${String(b['name'] ?? '')}`.replace(/[\r\n]+/g, ' '),
        html,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      console.error('notify-new-business: Resend error', res.status, data)
      // Release the claim so a later attempt can retry.
      await admin.from('businesses').update({ owner_alerted_at: null }).eq('id', businessId)
      return json({ error: 'Resend failed', status: res.status }, 502)
    }
    return json({ ok: true })
  } catch (err) {
    console.error('notify-new-business: unexpected error', err)
    return json({ error: 'Unexpected error' }, 500)
  }
})
