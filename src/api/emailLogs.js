import { MOCK_LOGS } from './mockData.js'

// Flip to false once the backend proxy for ZeptoMail is ready.
// The proxy should forward GET https://cpaas.zoho.com/v1.1/email with the
// "Zoho-oauthtoken" header, so the token never reaches the browser.
const USE_MOCK = true
const API_URL = '/api/email-logs'

export const STATUSES = {
  delivered: { label: 'Delivered', tone: 'green' },
  processing: { label: 'Pending', tone: 'blue' },
  soft_bounce: { label: 'Soft bounce', tone: 'amber' },
  hard_bounce: { label: 'Hard bounce', tone: 'red' },
  failed: { label: 'Failed', tone: 'gray' },
}

// The 18 bounce errors listed on ZeptoMail's "Bounce error categories" page.
// One plain sentence per reason, from the descriptions on that page.
const REASON_HELP = {
  'Host not reachable': 'The client\'s email server refused the connection or did not respond.',
  'Relaying error': 'The message could not be passed on between mail servers.',
  'Protocol error': 'A secure connection (TLS) could not be set up with the client\'s server.',
  'Routing error': 'The client\'s server could not route the email to their domain, often a DNS or router setting.',
  'Connection refused error': 'The client\'s server refused the connection, often because of the sender\'s reputation or weak DNS setup.',
  'Temporary error': 'A temporary problem that may clear up when sending is tried again.',
  'Policy rejection': 'The email did not meet the client\'s email policy or limits.',
  'Over quota': 'The client\'s mailbox is full.',
  'Bad configuration': 'A setting on the client\'s email server made it reject incoming mail.',
  'Too many recipients': 'The email had more recipients than the limit set for the send.',
  'Black listed': 'The client\'s server treats the sender as suspicious and blocks its mail.',
  'Grey listed': 'The client\'s server is rejecting mail from a new sender for now.',
  'Sender IP error': 'The client\'s server blocked the sending IP because of its reputation.',
  'Flagged as spam': 'The client\'s filters treated the email as spam.',
  'Virus detected': 'The client\'s filters flagged a link or attachment as a possible virus.',
  'Unknown user': 'No mailbox exists for this address in the client\'s domain.',
  'Inactive mailbox': 'The client\'s mailbox exists but is not in use.',
  'Invalid DNS records': 'The client\'s email server cannot deliver mail because of DNS problems on their side.',
}
const FALLBACK_HELP = {
  hard_bounce: 'The email could not be delivered, and this is treated as permanent.',
  soft_bounce: 'The email could not be delivered this time. It is tried again, and becomes a hard bounce if it still fails.',
  failed: 'The email could not be sent.',
  processing: 'The email is on its way. Delivery to the client has not been confirmed yet.',
}
export const helpFor = (email) => REASON_HELP[email.status_detail] || FALLBACK_HELP[email.status] || ''

const pad = (n) => String(n).padStart(2, '0')
// ZeptoMail wants dd/MM/yyyy, hh:mm a
function zohoDate(d) {
  const h = d.getHours()
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(h % 12 || 12)}:${pad(d.getMinutes())} ${h >= 12 ? 'PM' : 'AM'}`
}

export function buildParams(f, offset, limit) {
  const p = { offset, limit }
  if (f.requestId) p.request_id = f.requestId
  if (f.from) p.date_from = zohoDate(new Date(f.from + 'T00:00:00'))
  if (f.to) p.date_to = zohoDate(new Date(f.to + 'T23:59:00'))
  return p
}

// Only the date range goes to ZeptoMail. Status, mode and bulk/single are
// filtered in the browser so the summary cards can always show the full picture.
function matches(e, f) {
  const t = new Date(e.sent_time).getTime()
  if (f.from && t < new Date(f.from + 'T00:00:00').getTime()) return false
  if (f.to && t > new Date(f.to + 'T23:59:59').getTime()) return false
  return true
}

// Returns every email in the range. The real API is paged (offset/limit), so we
// loop until a short page comes back. Grouping needs the full set per request.
export async function fetchEmailLogs(filters) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 350))
    return MOCK_LOGS.filter((e) => matches(e, filters))
  }
  return fetchAllPages(filters)
}

// All emails of one bulk send, for its dedicated page
export async function fetchRequest(requestId) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300))
    return MOCK_LOGS.filter((e) => e.request_id === requestId)
  }
  return fetchAllPages({ requestId })
}

async function fetchAllPages(filters) {
  const all = []
  const limit = 500
  for (let offset = 0; ; offset += limit) {
    const qs = new URLSearchParams(buildParams(filters, offset, limit))
    const res = await fetch(`${API_URL}?${qs}`)
    const json = await res.json()
    if (!res.ok || json.status === 'failure') throw new Error(json.error?.message || 'Could not load email logs')
    all.push(...json.data)
    if (json.data.length < limit) break
  }
  return all
}

// Group emails by request_id. One request = one send action from the user.
export function groupByRequest(emails) {
  const map = new Map()
  for (const e of emails) {
    let g = map.get(e.request_id)
    if (!g) {
      g = { request_id: e.request_id, bulk_id: e.bulk_id, trigger_event: e.trigger_event, module: e.module, triggered_time: e.triggered_time, type: e.type, mode: e.mode, subject: e.subject, from: e.from,
        campaign: e.campaign, sent_time: e.sent_time, sent_by: e.sent_by, attachment_count: 0, emails: [], counts: {} }
      map.set(e.request_id, g)
    }
    g.emails.push(e)
    g.attachment_count += e.attachment_count // total across the whole bulk send
    g.counts[e.status] = (g.counts[e.status] || 0) + 1
    if (e.sent_time < g.sent_time) g.sent_time = e.sent_time
  }
  return [...map.values()].sort((a, b) => new Date(b.sent_time) - new Date(a.sent_time))
}

export function countStatuses(emails) {
  const c = { total: emails.length }
  for (const e of emails) c[e.status] = (c[e.status] || 0) + 1
  return c
}
