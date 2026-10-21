import { useEffect, useRef, useState } from 'react'
import { StatusBadge, ModeTag, ModuleTag, AttachCell, SentBy, SortHead, ariaSort, fmtFull, fmtShortSec } from './ui.jsx'

// First CC/BCC address, with a +N label when there are more. Clicking opens the side panel,
// which lists every address.
function CcCell({ e }) {
  const items = [...e.cc.map((a) => [a, 'CC']), ...e.bcc.map((a) => [a, 'BCC'])]
  if (!items.length) return '—'
  const [first, kind] = items[0]
  return (
    <span className="cc">
      <span className="cc-addr" title={first}>{first}</span>
      {items.length === 1 ? <span className="muted small">{kind}</span> : <span className="plus">+{items.length - 1}</span>}
    </span>
  )
}

// What each column sorts by
const STATUS_ORDER = ['delivered', 'processing', 'soft_bounce', 'hard_bounce', 'failed']
export const SORT_VALUES = {
  logid: (e) => e.log_id,
  to: (e) => e.to,
  from: (e) => e.from,
  subject: (e) => e.subject,
  event: (e) => e.trigger_event,
  module: (e) => e.module,
  triggered: (e) => e.triggered_time,
  mode: (e) => e.mode,
  status: (e) => STATUS_ORDER.indexOf(e.status),
  sent: (e) => e.sent_time,
  delivered: (e) => e.delivered_time,
  attach: (e) => e.attachment_count,
  cc: (e) => e.cc.length + e.bcc.length,
  opened: (e) => e.opened_time,
  by: (e) => e.sent_by,
  detail: (e) => (['soft_bounce', 'hard_bounce', 'failed'].includes(e.status) ? e.status_detail : ''),
}

// Column definitions for the per-email tables. `on` = visible by default.
export const EMAIL_COLUMNS = [
  { id: 'logid', label: 'ID', on: true, w: 108, locked: true, nowrap: true, idcol: true, render: (e) => e.log_id },
    { id: 'to', label: 'Recipient', on: true, locked: true, w: 200, render: (e) => <span className="title" title={`${e.to} (from ${e.from})`}>{e.to}</span> },
  { id: 'from', label: 'From', on: false, w: 220, render: (e) => e.from },
  { id: 'subject', label: 'Subject', on: true, render: (e) => <span className="trunc" title={e.subject}>{e.subject}</span> },
  { id: 'event', label: 'Trigger event', on: true, w: 164, render: (e) => <span className="trunc" title={e.trigger_event}>{e.trigger_event || '\u2014'}</span> },
  { id: 'module', label: 'Module', on: true, w: 80, render: (e) => <ModuleTag module={e.module} /> },
  { id: 'mode', label: 'Mode', on: false, w: 108, render: (e) => <ModeTag mode={e.mode} /> },
  { id: 'status', label: 'Status', on: true, w: 140, render: (e) => <StatusBadge status={e.status} /> },
  { id: 'triggered', label: 'Triggered at', on: false, w: 170, nowrap: true, render: (e) => fmtFull(e.triggered_time) },
  { id: 'sent', label: 'Sent at', on: true, w: 172, nowrap: true, render: (e) => fmtFull(e.sent_time) },
  { id: 'delivered', label: 'Delivered at', on: true, w: 172, nowrap: true, render: (e) => fmtFull(e.delivered_time) },
  { id: 'attach', label: 'Attachments', on: true, w: 126, render: (e) => <AttachCell n={e.attachment_count} /> },
  { id: 'cc', label: 'CC / BCC', on: false, w: 200, render: (e) => <CcCell e={e} /> },
  { id: 'opened', label: 'Opened at', on: false, w: 180, nowrap: true, render: (e) => fmtFull(e.opened_time) },
  { id: 'by', label: 'Sent by', on: false, w: 150, nowrap: true, render: (e) => <SentBy name={e.sent_by} /> },
  { id: 'detail', label: 'Detail', on: false, w: 160, render: (e) => (['soft_bounce', 'hard_bounce', 'failed'].includes(e.status) ? e.status_detail : '—') },
]

// Columns for the recipients of one bulk send (every email has its own subject and attachment count)
export const RECIPIENT_COLUMNS = EMAIL_COLUMNS
  .filter((c) => !['mode', 'by', 'event'].includes(c.id)) // the trigger event is the same for the whole bulk send
  .map((c) => {
    if (c.id === 'to') return { ...c, w: 200, render: (e) => <span className="title">{e.to}</span> }
    // every row of one bulk send is from the same period, so the year is left out
    if (c.id === 'sent') return { ...c, on: false, w: 140, render: (e) => fmtShortSec(e.sent_time) } // already in the page header
    if (c.id === 'delivered') return { ...c, w: 132, render: (e) => fmtShortSec(e.delivered_time) }
    if (c.id === 'opened') return { ...c, on: true, w: 132, render: (e) => fmtShortSec(e.opened_time) }
    if (c.id === 'cc') return { ...c, on: true, w: 150 }
    if (['module', 'triggered'].includes(c.id)) return { ...c, on: false } // same for every recipient; shown in the page header
    if (c.id === 'detail') return { ...c, on: true, w: 156 }
    if (c.id === 'attach') return { ...c, on: true }
    return c
  })

export function useColumns(storageKey, all) {
  const defaults = Object.fromEntries(all.map((c) => [c.id, c.on]))
  // Status sits last unless the user moves it
  const defaultOrder = [...all.filter((c) => c.id !== 'status'), ...all.filter((c) => c.id === 'status')].map((c) => c.id)
  const [vis, setVis] = useState(() => {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) || '{}') } } catch { return defaults }
  })
  // saved order, with any column added later appended in its default place
  const [order, setOrder] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`${storageKey}:order`) || '[]').filter((id) => defaultOrder.includes(id))
      return [...saved, ...defaultOrder.filter((id) => !saved.includes(id))]
    } catch { return defaultOrder }
  })
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(vis)) } catch { /* storage unavailable */ } }, [vis, storageKey])
  useEffect(() => { try { localStorage.setItem(`${storageKey}:order`, JSON.stringify(order)) } catch { /* storage unavailable */ } }, [order, storageKey])
  // widths the user dragged to, saved per column
  const [widths, setWidths] = useState(() => { try { return JSON.parse(localStorage.getItem(`${storageKey}:widths`) || '{}') } catch { return {} } })
  useEffect(() => { try { localStorage.setItem(`${storageKey}:widths`, JSON.stringify(widths)) } catch { /* storage unavailable */ } }, [widths, storageKey])

  const byId = Object.fromEntries(all.map((c) => [c.id, c]))
  const visible = order.map((id) => byId[id]).filter((c) => c && (vis[c.id] || c.locked)).map((c) => (widths[c.id] ? { ...c, w: widths[c.id] } : c))
  const resize = (id, px) => setWidths((w) => ({ ...w, [id]: Math.round(Math.max(60, Math.min(640, px))) }))
  const resetWidth = (id) => setWidths((w) => { const n = { ...w }; delete n[id]; return n })
  // The first column (the ID) stays where it is; every other column can be moved
  const move = (fromId, toId) => setOrder((o) => {
    if (fromId === toId || fromId === o[0] || toId === o[0]) return o
    const next = o.filter((id) => id !== fromId)
    next.splice(next.indexOf(toId) + (o.indexOf(fromId) < o.indexOf(toId) ? 1 : 0), 0, fromId)
    return next
  })
  // one step moves past the next column that is actually showing, so hidden columns never make a click look dead
  const nudge = (id, dir) => setOrder((o) => {
    const shownNow = (x) => vis[x] || byId[x].locked
    let i = o.indexOf(id), j = i + dir
    while (j >= 1 && j < o.length && !shownNow(o[j])) j += dir
    if (i < 1 || j < 1 || j >= o.length) return o
    const next = o.filter((x) => x !== id)
    next.splice(next.indexOf(o[j]) + (dir > 0 ? 1 : 0), 0, id)
    return next
  })
  const reset = () => { setVis(defaults); setOrder(defaultOrder); setWidths({}) }
  return { visible, vis, setVis, defaults, order, move, nudge, reset, resize, resetWidth }
}

// Drag handle on the right edge of a column title. Drag to change the width, double-click to go back to the default.
export function ResizeHandle({ id, extra = 0, onResize, onReset }) {
  if (!onResize) return null
  const start = (e) => {
    e.preventDefault(); e.stopPropagation()
    const th = e.currentTarget.closest('th')
    const startX = e.clientX, startW = th.getBoundingClientRect().width - extra
    const move = (ev) => onResize(id, startW + ev.clientX - startX)
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); document.body.classList.remove('resizing') }
    document.body.classList.add('resizing')
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up)
  }
  return <span className="rsz" role="separator" aria-orientation="vertical" title="Drag to change the width. Double-click to reset." onMouseDown={start} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => { e.stopPropagation(); onReset?.(id) }} onDragStart={(e) => e.preventDefault()} />
}

// Props that make a column header draggable. Dropping it on another header moves it there.
let dragging = null
export const headDnD = (id, index, move) => (index === 0 || !move ? {} : {
  draggable: true,
  onDragStart: (e) => { dragging = id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); e.currentTarget.classList.add('dragging') },
  onDragEnd: (e) => { dragging = null; e.currentTarget.classList.remove('dragging'); document.querySelectorAll('th.drop').forEach((t) => t.classList.remove('drop')) },
  onDragOver: (e) => { if (dragging && dragging !== id) { e.preventDefault(); e.currentTarget.classList.add('drop') } },
  onDragLeave: (e) => e.currentTarget.classList.remove('drop'),
  onDrop: (e) => { e.preventDefault(); e.currentTarget.classList.remove('drop'); if (dragging) move(dragging, id); dragging = null },
})

// Icon button for the table header. The menu is fixed-position so the
// scrolling table area cannot clip it.
export function ColumnPicker({ all, vis, setVis, order, nudge, reset }) {
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  useEffect(() => {
    if (!pos) return
    const close = (e) => { if (!(e.type === 'mousedown' && ref.current?.contains(e.target))) setPos(null) }
    const esc = (e) => e.key === 'Escape' && setPos(null)
    // scrolling the table closes the menu, but scrolling inside the menu itself must not
    const onScroll = (e) => { if (!ref.current?.contains(e.target)) setPos(null) }
    document.addEventListener('mousedown', close)
    window.addEventListener('keydown', esc)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('keydown', esc); window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', close) }
  }, [pos])
  const toggle = (e) => {
    e.stopPropagation()
    if (pos) return setPos(null)
    const r = e.currentTarget.getBoundingClientRect()
    setPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
  }
  return (
    <span ref={ref}>
      <button className="iconbtn" onClick={toggle} aria-label="Add or remove columns" title="Add or remove columns" aria-expanded={!!pos}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2.5" y="2.5" width="11.5" height="9.5" rx="2.2" /><path d="M2.5 7.2h11.5" /><path d="M15 12.8v5M12.5 15.3h5" /></svg>
      </button>
      {pos && (
        <div className="menu" style={{ top: pos.top, right: pos.right }}>
          <div className="menu-title">Columns</div>
          {(order || all.map((c) => c.id)).map((id, i, ids) => {
            const c = all.find((x) => x.id === id)
            return (
              <div key={id} className={`mrow ${c.locked ? 'locked' : ''}`}>
                <label>
                  <input type="checkbox" checked={vis[c.id] || !!c.locked} disabled={c.locked} onChange={(e) => setVis({ ...vis, [c.id]: e.target.checked })} />
                  {c.label}
                </label>
                {i > 0 && (
                  <span className="mmove">
                    <button disabled={i < 2} onClick={() => nudge(id, -1)} aria-label={`Move ${c.label} earlier`} title="Move earlier">↑</button>
                    <button disabled={i === ids.length - 1} onClick={() => nudge(id, 1)} aria-label={`Move ${c.label} later`} title="Move later">↓</button>
                  </span>
                )}
              </div>
            )
          })}
          <div className="mhint">Tip: drag a column title to move it.</div>
          <button className="link" onClick={reset}>Reset to default</button>
        </div>
      )}
    </span>
  )
}

export function EmailTable({ emails, cols, onOpen, sort, onSort, selectedId, onMove, onResize, onResetWidth }) {
  // Fixed-width columns keep the grid steady; columns without a width (Recipient, Subject, Detail) share what is left
  // the last column gets 40px extra so its title never runs under the fixed + button
  const widthOf = (c, i) => (c.w ? c.w + (i === cols.length - 1 ? 40 : 0) : 0)
  const fixed = cols.reduce((n, c, i) => n + widthOf(c, i), 0)
  const flex = cols.filter((c) => !c.w).length
  return (
    <table className="logs has-corner fixed" style={{ minWidth: fixed + flex * 150 }}>
      <colgroup>{cols.map((c, i) => <col key={c.id} style={c.w ? { width: widthOf(c, i) } : undefined} />)}</colgroup>
      <thead>
        <tr>{cols.map((c, i) => <th key={c.id} aria-sort={ariaSort(sort, c.id)} {...headDnD(c.id, i, onMove)}><SortHead id={c.id} label={c.label} sort={sort} onSort={onSort} /><ResizeHandle id={c.id} extra={i === cols.length - 1 ? 40 : 0} onResize={onResize} onReset={onResetWidth} /></th>)}</tr>
      </thead>
      <tbody>
        {emails.map((e) => (
          <tr key={e.email_reference} className={`click ${selectedId === e.email_reference ? 'is-selected' : ''}`} onClick={() => onOpen(e)}>
            {cols.map((c) => <td key={c.id} className={`${c.nowrap ? 'nowrap' : ''} ${c.id === 'to' || c.id === 'subject' || c.idcol ? '' : 'muted-cell'} ${c.idcol ? 'idcell' : ''} ${c.mono ? 'mono small' : ''}`}>{c.render(e)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
