// Local-time date helpers. Dates travel as "YYYY-MM-DD" strings.
const pad = (n) => String(n).padStart(2, '0')
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

// ZeptoMail keeps logs for 60 days
export const RETENTION_DAYS = 60

export const PRESETS = [
  { id: 'today', label: 'Today', days: [0, 0] },
  { id: 'yesterday', label: 'Yesterday', days: [1, 1] },
  { id: '7', label: 'Last 7 days', days: [6, 0] },
  { id: '30', label: 'Last 30 days', days: [29, 0] },
  { id: '60', label: 'Last 60 days', days: [59, 0] },
]

export function presetRange(id) {
  const p = PRESETS.find((x) => x.id === id)
  const today = startOfDay(new Date())
  return { preset: id, from: ymd(addDays(today, -p.days[0])), to: ymd(addDays(today, -p.days[1])) }
}

const short = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
export function describeRange(r) {
  const p = PRESETS.find((x) => x.id === r.preset)
  if (p) return p.label
  const a = parseYmd(r.from), b = parseYmd(r.to)
  return r.from === r.to ? `${short(a)} ${a.getFullYear()}` : `${short(a)} – ${short(b)} ${b.getFullYear()}`
}
