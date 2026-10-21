// Sample data shaped like ZeptoMail's "Get All Email Logs" response,
// plus a few UI-only fields (type, mode, campaign) the backend will add later.

let seed = 42
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)]

const FIRST = ['Aarav', 'Priya', 'Rohan', 'Sneha', 'Vikram', 'Neha', 'Amit', 'Kavya', 'Rahul', 'Isha', 'Arjun', 'Meera', 'Karan', 'Pooja', 'Sanjay', 'Divya']
const DOMAINS = ['acme.com', 'globex.in', 'initech.co', 'umbrella.org', 'hooli.io', 'stark.biz', 'wayne.com', 'gmail.com', 'outlook.com']
// Reason names are ZeptoMail's own bounce errors. Which status each belongs to
// is a guess here: ZeptoMail's page does not map them.
const FAILURE_REASONS = {
  hard_bounce: ['Unknown user', 'Inactive mailbox', 'Invalid DNS records'],
  soft_bounce: ['Over quota', 'Temporary error', 'Grey listed', 'Host not reachable'],
  failed: ['Policy rejection', 'Flagged as spam', 'Black listed', 'Too many recipients'],
}

// Sample server messages, in the style of the diagnostic_message ZeptoMail sends with a bounce
const DIAGNOSTICS = {
  'Unknown user': '550 5.1.1 The email account that you tried to reach does not exist.',
  'Inactive mailbox': '550 5.2.1 The email account that you tried to reach is disabled.',
  'Invalid DNS records': '550 5.4.4 Unable to resolve the recipient domain.',
  'Over quota': '552 5.2.2 The email account that you tried to reach is over quota.',
  'Temporary error': '451 4.3.0 Temporary local problem, please try later.',
  'Grey listed': '450 4.2.0 Greylisted, please try again in a few minutes.',
  'Host not reachable': '421 4.4.1 Connection timed out.',
  'Policy rejection': '554 5.7.1 Message rejected due to local policy.',
  'Flagged as spam': '550 5.7.1 Message looks like spam.',
  'Black listed': '554 5.7.1 Service unavailable; client host blocked.',
  'Too many recipients': '452 4.5.3 Too many recipients.',
}

const MODULES = ['GST', 'TDS', 'ITR']

// Made-up identifiers in the real formats. PAN: AAAPA9999A. GSTIN: 2-digit state + PAN + entity + Z + check.
const AZ = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const letter = () => AZ[Math.floor(rand() * AZ.length)]
const digits = (n) => Array.from({ length: n }, () => Math.floor(rand() * 10)).join('')
const fakePan = () => `${letter()}${letter()}${letter()}${pick(['P', 'C', 'F'])}${letter()}${digits(4)}${letter()}`
const fakeGstin = () => `${pick(['27', '29', '07', '24', '33'])}${fakePan()}1Z${pick([...'0123456789ABCDEFGHJK'])}`

// Bulk sends, by module. `event` is what triggered the send; `subject` is each email's own subject line.
const CAMPAIGNS = {
  GST: [
    { event: 'GSTR-1 filing reminder', subject: 'GSTR-1 for Sep 2026 is due on 11 Oct', mode: 'automated', from: 'gst@kdkclient.com' },
    { event: 'GSTR-3B filing reminder', subject: 'GSTR-3B for Sep 2026 is due on 20 Oct', mode: 'automated', from: 'gst@kdkclient.com' },
    { event: 'GSTR-2A / 2B reconciliation ready', subject: 'GSTR-2B for Sep 2026 is available', mode: 'automated', from: 'gst@kdkclient.com' },
    { event: 'GST notice received', subject: 'Notice received on the GST portal', mode: 'manual', from: 'gst@kdkclient.com' },
  ],
  TDS: [
    { event: 'Form 16 issued', subject: 'Form 16 for FY 2025-26', mode: 'automated', from: 'tds@kdkclient.com' },
    { event: 'Form 16A issued', subject: 'Form 16A for Q2 FY 2026-27', mode: 'automated', from: 'tds@kdkclient.com' },
    { event: 'TDS return (24Q / 26Q) due', subject: 'TDS return for Q2 is due on 31 Oct', mode: 'automated', from: 'tds@kdkclient.com' },
    { event: 'TDS challan payment reminder', subject: 'TDS payment for Sep 2026 is due on 7 Oct', mode: 'manual', from: 'tds@kdkclient.com' },
  ],
  ITR: [
    { event: 'ITR-V acknowledgement received', subject: 'ITR-V acknowledgement for AY 2026-27', mode: 'automated', from: 'itr@kdkclient.com' },
    { event: 'Documents pending for ITR', subject: 'Documents pending for your ITR filing', mode: 'automated', from: 'itr@kdkclient.com' },
    { event: 'Advance tax due date', subject: 'Advance tax instalment is due on 15 Dec', mode: 'manual', from: 'itr@kdkclient.com' },
    { event: 'Tax computation shared', subject: 'Your tax computation for AY 2026-27', mode: 'manual', from: 'itr@kdkclient.com' },
    { event: 'Form 26AS / AIS available', subject: 'Your Form 26AS and AIS are ready to review', mode: 'manual', from: 'itr@kdkclient.com' },
  ],
}

// Reminder notifications from the Compliance Tracker: one bulk send per step of the reminder plan.
const REMINDER_STEPS = [
  { step: 'First reminder', mode: 'automated', subject: 'Reminder: {form} for {period} (due {due})' },
  { step: 'Follow-up', mode: 'automated', subject: 'Follow-up: {form} for {period} (due {due})' },
  { step: 'Due today', mode: 'automated', subject: 'Due today: {form} for {period}' },
  { step: 'Missed', mode: 'automated', subject: 'Overdue: {form} for {period}' },
  { step: 'Escalation', mode: 'automated', subject: 'Overdue: {form} for {period} (second notice)' },
  { step: 'Final notice', mode: 'automated', subject: 'Overdue: {form} for {period} (final notice)' },
  { step: 'Manual chase', mode: 'manual', subject: 'Overdue: {form} for {period}' },
  { step: 'Task completed', mode: 'automated', subject: 'Completed: {form} for {period}' },
]
const REMINDER_FORMS = {
  GST: [{ form: 'GSTR-3B', period: 'Sep 2026', due: '20 Oct' }, { form: 'GSTR-1', period: 'Sep 2026', due: '11 Oct' }],
  TDS: [{ form: 'TDS return 26Q', period: 'Q2 FY 2026-27', due: '31 Oct' }, { form: 'TDS payment', period: 'Sep 2026', due: '7 Oct' }],
  ITR: [{ form: 'ITR', period: 'AY 2026-27', due: '31 Jul' }, { form: 'Advance tax', period: 'Q3 FY 2026-27', due: '15 Dec' }],
}
for (const mod of Object.keys(CAMPAIGNS)) {
  const base = CAMPAIGNS[mod]
  const reminders = REMINDER_STEPS.flatMap((s, i) => {
    const f = REMINDER_FORMS[mod][i % REMINDER_FORMS[mod].length]
    const fill = (t) => t.replace('{form}', f.form).replace('{period}', f.period).replace('{due}', f.due)
    return [{ event: `${s.step}: ${f.form}`, subject: fill(s.subject), mode: s.mode, from: base[0].from }]
  })
  // interleave so the list reads as a mix of notices and reminders
  CAMPAIGNS[mod] = Array.from({ length: Math.max(base.length, reminders.length) * 2 }, (_, i) => (i % 2 ? reminders : base)[Math.floor(i / 2) % (i % 2 ? reminders : base).length])
}
const STAFF = ['Kartik K.', 'Anita Shah', 'Rohit Mehta', 'Priyanka D.', 'System']
const SINGLE_SUBJECTS = [
  ['Your Form 16 is attached', 'manual', 'TDS', 'Form 16 shared'], ['GSTR-3B filed: acknowledgement', 'automated', 'GST', 'GSTR-3B filed'],
  ['ITR-V acknowledgement attached', 'automated', 'ITR', 'ITR-V acknowledgement received'], ['Query on your TDS challan', 'manual', 'TDS', 'Client query'],
  ['Reply to GST notice: documents needed', 'manual', 'GST', 'GST notice reply'], ['Your Form 26AS summary', 'automated', 'ITR', 'Form 26AS / AIS available'],
  ['Your tax computation is ready', 'manual', 'ITR', 'Tax computation shared'], ['Payment received: thank you', 'automated', '', 'Payment received'],
]

function pickStatus(isOld) {
  const r = rand()
  if (r < 0.82) return 'delivered'
  if (r < 0.88) return 'soft_bounce'
  if (r < 0.93) return 'hard_bounce'
  if (r < 0.97) return 'failed'
  return isOld ? 'delivered' : 'processing'
}

function buildEvents(status, sentAt) {
  const t = (s) => new Date(sentAt.getTime() + s * 1000).toISOString()
  const ev = [{ type: 'processed', label: 'Sent', time: t(0) }]
  if (status === 'delivered') ev.push({ type: 'delivered', label: 'Delivered', time: t(3 + Math.floor(rand() * 20)) })
  else if (status === 'processing') { /* still on its way: no further step yet */ }
  else ev.push({ type: status, label: `${status === 'soft_bounce' ? 'Soft bounce' : status === 'hard_bounce' ? 'Hard bounce' : 'Failed'}: ${pick(FAILURE_REASONS[status])}`, time: t(5 + Math.floor(rand() * 40)) })
  return ev
}

function makeEmail({ idx, requestId, sentAt, subject, from, type, mode, campaign, agent, attachments, sentBy, module, triggeredAt, triggerEvent }) {
  const name = pick(FIRST)
  const to = `${name.toLowerCase()}${Math.floor(rand() * 900 + 100)}@${pick(DOMAINS)}`
  const ageDays = (Date.now() - sentAt.getTime()) / 864e5
  const status = pickStatus(ageDays > 1)
  const events = buildEvents(status, sentAt)
  const reason = ['soft_bounce', 'hard_bounce', 'failed'].includes(status) ? events[events.length - 1].label.replace(/^[^:]+: /, '') : ''
  // CC / BCC addresses, as in ZeptoMail's email_info
  const ccs = (type === 'single' ? rand() < 0.3 : rand() < 0.08) ? Array.from({ length: 1 + Math.floor(rand() * 2) }, () => `${pick(FIRST).toLowerCase()}.cc${Math.floor(rand() * 90 + 10)}@${pick(DOMAINS)}`) : []
  const bccs = type === 'single' && rand() < 0.15 ? [`archive@${to.split('@')[1]}`] : []
  const opened = status === 'delivered' && rand() < 0.55 ? new Date(sentAt.getTime() + (60 + Math.floor(rand() * 7200)) * 1000).toISOString() : ''
  events.unshift({ type: 'triggered', label: 'Triggered', time: triggeredAt.toISOString() })
  if (opened) events.push({ type: 'opened', label: 'Opened', time: opened })
  return {
    email_reference: `ref-${requestId.slice(4)}-${String(idx).padStart(4, '0')}`,
    sent_time: sentAt.toISOString(),
    triggered_time: triggeredAt.toISOString(),
    trigger_event: triggerEvent || '',
    module,
    subject, from, to,
    request_id: requestId,
    mailagent_key: agent,
    status,
    type, mode, campaign,
    client_reference: type === 'bulk' ? `CAMP-${requestId.slice(-4).toUpperCase()}` : '',
    delivered_time: events.find((x) => x.type === 'delivered')?.time || '',
    attachment_count: attachments,
    cc: ccs,
    bcc: bccs,
    processed_time: sentAt.toISOString(),
    opened_time: opened,
    diagnostic_message: DIAGNOSTICS[reason] || '',
    sent_by: sentBy,
    events,
    status_detail: reason || events[events.length - 1].label,
  }
}

function generate() {
  const out = []
  const now = Date.now()
  let reqNo = 1000
  const agent = '2d6f.5a1c7b9e0f3d4a8b'

  for (let c = 0; c < 48; c++) {
    const mod = MODULES[c % 3]
    const tpl = CAMPAIGNS[mod][Math.floor(c / 3) % CAMPAIGNS[mod].length]
    const requestId = `req-${(reqNo++).toString(16)}${Math.floor(rand() * 1e4)}`
    const sentAt = new Date(now - (c * 1.2 + rand()) * 864e5)
    const attachments = rand() < 0.5 ? 0 : 1 + Math.floor(rand() * 2)
    const sentBy = tpl.mode === 'automated' ? 'System' : pick(STAFF.slice(0, 4))
    const size = c === 1 ? 3200 : c === 4 ? 1450 : c === 9 ? 820 : c === 20 ? 2100 : 25 + Math.floor(rand() * 180)
    for (let i = 0; i < size; i++) {
      // each email in a bulk send has its own subject and its own attachment count
      // the client's PAN (TDS, ITR) or GSTIN (GST) is normally part of the subject
      const subj = `${tpl.subject} \u2013 ${mod === 'GST' ? 'GSTIN' : 'PAN'} ${mod === 'GST' ? fakeGstin() : fakePan()}`
      out.push(makeEmail({
        idx: i, requestId, sentAt: new Date(sentAt.getTime() + i * 700), module: mod, triggeredAt: new Date(sentAt.getTime() - (30 + ((c * 7) % 50)) * 1000),
        subject: subj, from: tpl.from, triggerEvent: tpl.event,
        type: 'bulk', mode: tpl.mode, attachments: attachments === 0 && rand() < .7 ? 0 : Math.floor(rand() * 4), sentBy, campaign: tpl.event, agent,
      }))
    }
  }
  for (let s = 0; s < 700; s++) {
    const [baseSubject, mode, singleModule, singleEvent] = pick(SINGLE_SUBJECTS)
    const subject = /Form|ITR|TDS|26AS/.test(baseSubject) ? `${baseSubject} \u2013 PAN ${fakePan()}` : /GST/.test(baseSubject) ? `${baseSubject} \u2013 GSTIN ${fakeGstin()}` : `${baseSubject} (Ref ${Math.floor(rand() * 9000 + 1000)})`
    const requestId = `req-${(reqNo++).toString(16)}${Math.floor(rand() * 1e4)}`
    const sentAt = new Date(now - rand() * 59 * 864e5)
    out.push(makeEmail({
      idx: 0, requestId, sentAt, module: singleModule, triggerEvent: singleEvent, triggeredAt: new Date(sentAt.getTime() - (2 + (s % 5)) * 1000),
      subject, from: mode === 'automated' ? 'noreply@kdkclient.com' : 'team@kdkclient.com',
      type: 'single', mode, campaign: '', agent,
      attachments: rand() < 0.6 ? 0 : 1 + Math.floor(rand() * 3), sentBy: mode === 'automated' ? 'System' : pick(STAFF.slice(0, 4)),
    }))
  }
  // Display IDs. KDK creates these; ZeptoMail only knows request_id / email_reference.
  // Bulk send: BL-101. Its emails: BL-101-1, BL-101-2 ... Single email: EM-1001.
  const bulkIds = [...new Set(out.filter((e) => e.type === 'bulk').map((e) => e.request_id))] // newest first
  const bulkNo = Object.fromEntries(bulkIds.map((rid, i) => [rid, 101 + (bulkIds.length - 1 - i)]))
  const seq = {}
  for (const e of out) {
    if (e.type !== 'bulk') continue
    seq[e.request_id] = (seq[e.request_id] || 0) + 1
    e.bulk_id = `BL-${bulkNo[e.request_id]}`
    e.log_id = `${e.bulk_id}-${seq[e.request_id]}`
  }
  out.filter((e) => e.type === 'single')
    .sort((a, b) => new Date(a.sent_time) - new Date(b.sent_time))
    .forEach((e, i) => { e.log_id = `EM-${1001 + i}`; e.bulk_id = '' })

  return out.sort((a, b) => new Date(b.sent_time) - new Date(a.sent_time))
}

export const MOCK_LOGS = generate()
