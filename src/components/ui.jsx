import { useEffect, useRef, useState } from 'react'
import { STATUSES } from '../api/emailLogs.js'

export function StatusBadge({ status }) {
  const s = STATUSES[status] || { label: status, tone: 'gray' }
  return <span className={`badge badge-${s.tone}`}>{s.label}</span>
}

export const ModuleTag = ({ module }) => (module ? <span className={`modtag mod-${module}`}>{module}</span> : <span className="muted">—</span>)

export const ModeTag = ({ mode }) => <span className={`tag tag-${mode}`}>{mode === 'automated' ? 'Automated' : 'Manual'}</span>

// Person with a round initials avatar. "System" gets a neutral cog instead.
const initials = (name) => name.replace(/\(.*\)/, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
const hue = (name) => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 5, 0)
export function SentBy({ name }) {
  if (!name) return <span className="muted">—</span>
  const system = /^system/i.test(name)
  return (
    <span className="by">
      {system ? (
        <span className="avatar av-sys" aria-hidden="true">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M9.2 1 3 9.1h4l-.9 5.9L13 6.6H8.9z" /></svg>
        </span>
      ) : <span className={`avatar av-${hue(name)}`} aria-hidden="true">{initials(name)}</span>}
      <span>{name}</span>
    </span>
  )
}

const FMT = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
export const fmtDate = (iso) => new Date(iso).toLocaleString('en-GB', FMT)
// Full timestamp with seconds, or a dash when there is none
export const fmtFull = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { ...FMT, second: '2-digit' }) : '—')

// "21 Oct, 10:13:05": no year when it is this year. Used where every row is from the same period.
export const fmtShortSec = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  const o = { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }
  if (d.getFullYear() !== new Date().getFullYear()) o.year = 'numeric'
  return d.toLocaleString('en-GB', o)
}

// Date and time without seconds, for lists where seconds mean nothing
export const fmtNoSec = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', FMT) : '—')

export const AttachCell = ({ n }) => (n ? <span className="attach"><Icon name="paperclip" size={14} />{n}</span> : <span className="muted">—</span>)

export function Pager({ page, total, pageSize, onPage, onSize, sizes, info }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null
  return (
    <nav className="pager">
      <span className="muted small">{(page * pageSize + 1).toLocaleString()}–{Math.min(total, (page + 1) * pageSize).toLocaleString()} of {total.toLocaleString()}{info && <><span className="dotsep" />{info}</>}</span>
      {sizes && (
        <Popover width={150} up button={({ onClick, open }) => (
          <button className="fbtn2" onClick={onClick} aria-expanded={open} aria-label="Rows per page">
            {pageSize} per page<span className="chev"><Icon name="chevron" size={14} /></span>
          </button>
        )}>
          {(close) => <OptionList options={sizes.map((n) => ({ value: n, label: `${n} per page` }))} value={pageSize} onChange={onSize} close={close} />}
        </Popover>
      )}
      <button className="btn ghost" disabled={page === 0} onClick={() => onPage(0)} aria-label="First page">«</button>
      <button className="btn ghost" disabled={page === 0} onClick={() => onPage(page - 1)}>Previous</button>
      <span className="small">Page {page + 1} of {pages.toLocaleString()}</span>
      <button className="btn ghost" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>Next</button>
      <button className="btn ghost" disabled={page + 1 >= pages} onClick={() => onPage(pages - 1)} aria-label="Last page">»</button>
    </nav>
  )
}

export function toCsv(emails) {
  const cols = ['log_id', 'bulk_id', 'module', 'triggered_time', 'sent_time', 'delivered_time', 'attachment_count', 'cc', 'bcc', 'opened_time', 'sent_by', 'to', 'from', 'subject', 'status', 'status_detail', 'type', 'mode']
  const esc = (v) => `"${String(Array.isArray(v) ? v.join('; ') : v ?? '').replace(/"/g, '""')}"`
  return [cols.join(','), ...emails.map((e) => cols.map((c) => esc(e[c])).join(','))].join('\n')
}

export function downloadCsv(emails, name) {
  const url = URL.createObjectURL(new Blob([toCsv(emails)], { type: 'text/csv' }))
  Object.assign(document.createElement('a'), { href: url, download: name }).click()
  URL.revokeObjectURL(url)
}

export const openBulk = (id) => { window.location.hash = `#/bulk/${id}` }

export const fmtShort = (iso) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false)
  const copy = async (e) => {
    e.stopPropagation()
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) } catch { /* clipboard blocked */ }
  }
  return (
    <button className={`copybtn ${done ? 'done' : ''}`} onClick={copy} aria-label={done ? 'Copied' : label} title={done ? 'Copied' : label}>
      <Icon name={done ? 'check' : 'copy'} size={15} />
    </button>
  )
}

// Fixed-position popover so a scrolling table cannot clip it.
// button({ onClick, open }) draws the trigger; children(close) draws the content.
export function Popover({ button, children, width = 240, onOpen, up = false }) {
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  useEffect(() => {
    if (!pos) return
    const out = (e) => { if (!ref.current?.contains(e.target)) setPos(null) }
    const esc = (e) => e.key === 'Escape' && setPos(null)
    const close = () => setPos(null)
    document.addEventListener('mousedown', out)
    window.addEventListener('keydown', esc)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', out); window.removeEventListener('keydown', esc)
      window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close)
    }
  }, [pos])
  const toggle = (e) => {
    e.stopPropagation()
    if (pos) return setPos(null)
    const r = e.currentTarget.getBoundingClientRect()
    onOpen?.()
    const left = Math.max(8, Math.min(r.left - 8, window.innerWidth - width - 12))
    setPos(up ? { bottom: window.innerHeight - r.top + 6, left } : { top: r.bottom + 6, left })
  }
  return (
    <span ref={ref} className="popwrap">
      {button({ onClick: toggle, open: !!pos })}
      {pos && <div className="pop" style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width }} onClick={(e) => e.stopPropagation()}>{children(() => setPos(null))}</div>}
    </span>
  )
}

export const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
    <path d="M2 3h12l-4.5 5.5V13l-3-1.5V8.5z" />
  </svg>
)

export const filterButton = (label, active) => ({ onClick, open }) => (
  <button className={`fbtn ${active ? 'on' : ''}`} onClick={onClick} aria-expanded={open} aria-label={`Filter by ${label}`} title={`Filter by ${label}`}>
    <FilterIcon />
  </button>
)

// Header filter with a list of choices
export function OptionFilter({ label, value, options, onChange }) {
  return (
    <Popover width={230} button={filterButton(label, value !== '')}>
      {(close) => (
        <div className="pop-list">
          <div className="menu-title">{label}</div>
          {options.map((o) => (
            <button key={o.value} className={o.value === value ? 'sel' : ''} onClick={() => { onChange(o.value); close() }}>
              <span>{o.label}</span>{o.count != null && <span className="muted small">{o.count.toLocaleString()}</span>}
            </button>
          ))}
        </div>
      )}
    </Popover>
  )
}

// The list inside a filter dropdown. With `searchable` it has a search box on top,
// and an option can carry its own `node` (for example a name with an avatar).
function OptionList({ options, value, onChange, close, searchable, multi }) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const shown = options.filter((o) => o.value === '' || !needle || o.label.toLowerCase().includes(needle))
  const picked = multi ? value : []
  const click = (o) => {
    if (!multi) { onChange(o.value); close(); return }
    if (o.value === '') { onChange([]); return }
    onChange(picked.includes(o.value) ? picked.filter((v) => v !== o.value) : [...picked, o.value])
  }
  return (
    <div className="pop-list">
      {searchable && (
        <div className="pop-search">
          <Icon name="search" size={14} />
          <input autoFocus type="text" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}
      {shown.map((o) => {
        const on = multi ? (o.value === '' ? picked.length === 0 : picked.includes(o.value)) : o.value === value
        return (
          <button key={o.value} className={on ? 'sel' : ''} onClick={() => click(o)} role={multi ? 'menuitemcheckbox' : undefined} aria-checked={multi ? on : undefined}>
            {multi && <span className={`cbox ${on ? 'on' : ''}`}>{on && <Icon name="check" size={12} />}</span>}
            <span className="optlabel">{o.node || o.label}</span>{o.count != null && <span className="muted small">{o.count.toLocaleString()}</span>}
          </button>
        )
      })}
      {searchable && needle && shown.length === 1 && <div className="pop-empty">No match</div>}
    </div>
  )
}

// Dropdown filter button for the toolbar. With `multi`, value is a list and several options can be ticked:
// "Status" when none, "Status: Failed" for one, "Status: 2 selected" for more.
export function FilterButton({ label, icon, value, options, onChange, searchable, multi = true }) {
  const list = multi ? value : value === '' ? [] : [value]
  const active = list.length > 0
  const name = (v) => options.find((o) => o.value === v)?.label
  const text = !active ? label : list.length === 1 ? `${label}: ${name(list[0])}` : `${label}: ${list.length} selected`
  return (
    <Popover width={250} button={({ onClick, open }) => (
      <button className={`fbtn2 ${active ? 'on' : ''}`} onClick={onClick} aria-expanded={open}>
        {icon && <Icon name={icon} />}{text}<span className="chev"><Icon name="chevron" size={14} /></span>
      </button>
    )}>
      {(close) => <OptionList options={options} value={value} onChange={onChange} close={close} searchable={searchable} multi={multi} />}
    </Popover>
  )
}

export const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 2.5v7.5M4.8 7.2 8 10.4l3.2-3.2M2.8 13h10.4" />
  </svg>
)

// Small line icons, all drawn on a 16px grid
const ICONS = {
  mail: <><rect x="2" y="3.5" width="12" height="9" rx="1.8" /><path d="M2.6 4.7 8 8.7l5.4-4" /></>,
  search: <><circle cx="7" cy="7" r="4.2" /><path d="M10.3 10.3 13.6 13.6" /></>,
  calendar: <><rect x="2.5" y="3.5" width="11" height="10" rx="1.8" /><path d="M2.5 6.8h11M5.5 2v3M10.5 2v3" /></>,
  user: <><circle cx="8" cy="5.5" r="2.6" /><path d="M3 13.5c.6-2.6 2.6-4 5-4s4.4 1.4 5 4" /></>,
  status: <><circle cx="8" cy="8" r="5.6" /><path d="M5.6 8.2l1.7 1.7 3.2-3.4" /></>,
  mode: <path d="M9 1.8 3.8 8.8H8l-1 5.4 5.2-7H8z" />,
  layers: <><path d="M8 2.5 14 5.7 8 8.9 2 5.7z" /><path d="M2 9l6 3.2L14 9" /></>,
  chevron: <path d="M3.8 6.2 8 10.2l4.2-4" />,
  copy: <><rect x="5.5" y="5.5" width="8" height="8" rx="1.6" /><path d="M10.5 5.5V4.1a1.6 1.6 0 0 0-1.6-1.6H4.1a1.6 1.6 0 0 0-1.6 1.6v4.8a1.6 1.6 0 0 0 1.6 1.6h1.4" /></>,
  check: <path d="M3.5 8.4 6.6 11.5 12.5 4.8" />,
  tag: <><path d="M2.5 8.3V3.5a1 1 0 0 1 1-1h4.8l5.2 5.2a1 1 0 0 1 0 1.4l-4.4 4.4a1 1 0 0 1-1.4 0z" /><circle cx="5.6" cy="5.6" r="1" /></>,
  paperclip: <path d="M13.4 7.4 7.8 13a3.2 3.2 0 0 1-4.5-4.5l5.6-5.6a2.1 2.1 0 0 1 3 3L6.3 11.5a1 1 0 0 1-1.5-1.5L9.9 4.9" />,
  chevronLeft: <path d="M10 3.8 5.8 8l4.2 4.2" />,
  chevronRight: <path d="M6 3.8 10.2 8 6 12.2" />,
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  sortNone: <path d="M5 6.4 8 3.4l3 3M5 9.6l3 3 3-3" />,
  sortUp: <path d="M8 13V3.5M4.4 7 8 3.4 11.6 7" />,
  sortDown: <path d="M8 3v9.5M4.4 9 8 12.6 11.6 9" />,
}
export const Icon = ({ name, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="ico">
    {ICONS[name]}
  </svg>
)

// Clickable column title. Shows an arrow on hover and keeps it while that column is the sort.
export function SortHead({ id, label, sort, onSort }) {
  const on = sort && sort.key === id
  return (
    <button className={`sorth ${on ? 'on' : ''}`} onClick={() => onSort(id)} title={`Sort by ${label}`}>
      {label}<Icon name={on ? (sort.dir === 'asc' ? 'sortUp' : 'sortDown') : 'sortNone'} size={12} />
    </button>
  )
}
export const ariaSort = (sort, id) => (sort && sort.key === id ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined)
