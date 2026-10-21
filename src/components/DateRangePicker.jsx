import { useState } from 'react'
import { Popover, filterButton } from './ui.jsx'
import { PRESETS, RETENTION_DAYS, addDays, describeRange, parseYmd, presetRange, startOfDay, ymd } from '../dates.js'

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const monthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1)
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1)

function Month({ month, draft, anchor, hover, min, max, onPick, onHover }) {
  const first = month
  const offset = (first.getDay() + 6) % 7 // Monday first
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))]
  // While picking the end date, preview the range under the mouse
  const [lo, hi] = anchor && hover ? [anchor, hover].sort() : [draft.from, draft.to]
  return (
    <div className="cal">
      <div className="cal-title">{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
      <div className="cal-grid">
        {DOW.map((d) => <span key={d} className="cal-dow">{d}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />
          const s = ymd(d)
          const off = d < min || d > max
          const cls = ['cal-day', off && 'off', s >= lo && s <= hi && 'in', s === lo && 'start', s === hi && 'end', s === ymd(max) && 'today'].filter(Boolean).join(' ')
          return <button key={i} className={cls} disabled={off} onClick={() => onPick(s)} onMouseEnter={() => onHover(s)}>{d.getDate()}</button>
        })}
      </div>
    </div>
  )
}

export default function DateRangePicker({ value, onChange, active, trigger }) {
  const max = startOfDay(new Date())
  const min = addDays(max, -(RETENTION_DAYS - 1))
  const [draft, setDraft] = useState(value)
  const [anchor, setAnchor] = useState(null)
  const [hover, setHover] = useState(null)
  const [month, setMonth] = useState(monthStart(addMonths(parseYmd(value.to), -1)))

  const init = () => {
    setDraft(value); setAnchor(null); setHover(null)
    const right = monthStart(parseYmd(value.to))
    setMonth(right <= monthStart(min) ? monthStart(min) : addMonths(right, -1))
  }
  const pick = (s) => {
    if (!anchor) { setAnchor(s); setDraft({ preset: '', from: s, to: s }); return }
    const [from, to] = [anchor, s].sort()
    setDraft({ preset: '', from, to }); setAnchor(null)
  }
  const canPrev = month > monthStart(min)
  const canNext = addMonths(month, 1) < monthStart(max)

  return (
    <Popover width={690} onOpen={init} button={trigger || filterButton('date', active)}>
      {(close) => {
        const apply = (r) => { onChange(r); close() }
        return (
          <div className="popover">
            <div className="presets">
              {PRESETS.map((p) => (
                <button key={p.id} className={draft.preset === p.id ? 'on' : ''} onClick={() => apply(presetRange(p.id))}>{p.label}</button>
              ))}
              <p className="muted small">Logs older than {RETENTION_DAYS} days are not available.</p>
            </div>
            <div className="calwrap">
              <div className="calnav">
                <button className="icon" disabled={!canPrev} onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">‹</button>
                <span className="muted small">{anchor ? 'Now pick the end date' : 'Pick a start date, then an end date'}</span>
                <button className="icon" disabled={!canNext} onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">›</button>
              </div>
              <div className="cals" onMouseLeave={() => setHover(null)}>
                <Month month={month} draft={draft} anchor={anchor} hover={hover} min={min} max={max} onPick={pick} onHover={setHover} />
                <Month month={addMonths(month, 1)} draft={draft} anchor={anchor} hover={hover} min={min} max={max} onPick={pick} onHover={setHover} />
              </div>
              <div className="calfoot">
                <span className="small">{describeRange(draft)}</span>
                <span className="row-gap">
                  <button className="btn ghost" onClick={close}>Cancel</button>
                  <button className="btn" disabled={!!anchor} onClick={() => apply(draft)}>Apply</button>
                </span>
              </div>
            </div>
          </div>
        )
      }}
    </Popover>
  )
}
