import { headDnD } from './columns.jsx'
import { ModeTag, ModuleTag, AttachCell, SentBy, SortHead, ariaSort, fmtNoSec, openBulk } from './ui.jsx'

const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0)
const num = (n) => (n ? n.toLocaleString() : '—')
const bounced = (g) => (g.counts.soft_bounce || 0) + (g.counts.hard_bounce || 0)

// Columns of the bulk sends list. `on` = shown by default, `w` = width in px (no w = takes the leftover space).
export const BULK_COLUMNS = [
  { id: 'id', label: 'ID', on: true, locked: true, w: 78, td: 'idcell nowrap', render: (g) => g.bulk_id },
  { id: 'subject', label: 'Subject', on: true, locked: true,
    render: (g) => <a className="title clamp2" href={`#/bulk/${g.request_id}`} title={`${g.subject} (from ${g.from})`} onClick={(e) => e.stopPropagation()}>{g.subject}</a> },
  { id: 'module', label: 'Module', on: true, w: 80, render: (g) => <ModuleTag module={g.module} /> },
  { id: 'mode', label: 'Mode', on: false, w: 104, render: (g) => <ModeTag mode={g.mode} /> },
  { id: 'recipients', label: 'Recipients', on: true, w: 100, right: true, td: 'num', render: (g) => g.emails.length.toLocaleString() },
  { id: 'attach', label: 'Attachments', on: true, w: 116, render: (g) => <AttachCell n={g.attachment_count} /> },
  { id: 'by', label: 'Sent by', on: true, w: 150, td: 'nowrap', render: (g) => <SentBy name={g.sent_by} /> },
  { id: 'triggered', label: 'Triggered at', on: false, w: 168, td: 'muted-cell nowrap', render: (g) => fmtNoSec(g.triggered_time) },
  { id: 'sent', label: 'Sent at', on: true, w: 160, td: 'muted-cell nowrap', render: (g) => fmtNoSec(g.sent_time) },
  { id: 'from', label: 'From', on: false, w: 220, td: 'muted-cell', render: (g) => g.from },
  { id: 'delivered', label: 'Delivered', on: true, w: 114, right: true, td: 'num nowrap',
    render: (g) => <>{num(g.counts.delivered || 0)} <span className="muted small">({pct(g.counts.delivered || 0, g.emails.length)}%)</span></> },
  { id: 'bounced', label: 'Bounced', on: true, w: 88, right: true, td: 'num', render: (g) => <span className={bounced(g) ? 'c-amber' : 'muted'}>{num(bounced(g))}</span> },
  { id: 'failed', label: 'Failed', on: true, w: 84, right: true, td: 'num', render: (g) => <span className={g.counts.failed ? 'c-red' : 'muted'}>{num(g.counts.failed)}</span> },
  { id: 'processed', label: 'Pending', on: true, w: 104, right: true, td: 'num', render: (g) => <span className={g.counts.processing ? 'c-blue' : 'muted'}>{num(g.counts.processing)}</span> },
]

// What each column sorts by
export const BULK_SORT = {
  id: (g) => g.bulk_id,
  subject: (g) => g.subject,
  module: (g) => g.module,
  mode: (g) => g.mode,
  recipients: (g) => g.emails.length,
  attach: (g) => g.attachment_count,
  by: (g) => g.sent_by,
  triggered: (g) => g.triggered_time,
  sent: (g) => g.sent_time,
  from: (g) => g.from,
  delivered: (g) => g.counts.delivered || 0,
  bounced,
  failed: (g) => g.counts.failed || 0,
  processed: (g) => g.counts.processing || 0,
}

export function BulkTable({ groups, cols, sort, onSort, onMove }) {
  // the last column gets 40px extra so its title never runs under the fixed + button
  const widthOf = (c, i) => (c.w ? c.w + (i === cols.length - 1 ? 40 : 0) : 0)
  const fixed = cols.reduce((n, c, i) => n + widthOf(c, i), 0)
  const flex = cols.filter((c) => !c.w).length
  // when the last column is a number, its cells need room for the row arrow and the + button
  const numLast = cols[cols.length - 1]?.right
  return (
    <table className={`logs has-corner fixed ${numLast ? 'numlast' : ''}`} style={{ minWidth: fixed + flex * 166 }}>
      <colgroup>{cols.map((c, i) => <col key={c.id} style={c.w ? { width: widthOf(c, i) } : undefined} />)}</colgroup>
      <thead>
        <tr>
          {cols.map((c, i) => (
            <th key={c.id} className={c.right ? 'r' : ''} aria-sort={ariaSort(sort, c.id)} {...headDnD(c.id, i, onMove)}><SortHead id={c.id} label={c.label} sort={sort} onSort={onSort} /></th>
          ))}
        </tr>
      </thead>
      <tbody>
        {groups.map((g) => {
          const open = () => openBulk(g.request_id)
          return (
            <tr key={g.request_id} className="click" tabIndex={0} onClick={open} onKeyDown={(e) => e.key === 'Enter' && open()}>
              {cols.map((c) => <td key={c.id} className={`${c.right ? 'r' : ''} ${c.td || ''}`}>{c.render(g)}</td>)}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
