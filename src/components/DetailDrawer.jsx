import { useEffect } from 'react'
import { STATUSES } from '../api/emailLogs.js'
import { StatusBadge, ModeTag, CopyButton, SentBy, ModuleTag, AttachCell, Icon, fmtFull } from './ui.jsx'

const addrs = (a) => a.join(', ')

// One block of the panel: a small heading and its label/value rows. Empty rows are left out.
function Group({ title, rows }) {
  const shown = rows.filter(Boolean)
  if (!shown.length) return null
  return (
    <section className="grp">
      <h3>{title}</h3>
      <dl>{shown.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}</dl>
    </section>
  )
}

// Every step is always listed, so nothing looks missing: a step that did not happen says so.
function steps(e) {
  const at = (type) => e.events.find((x) => x.type === type)
  const problem = e.events.find((x) => ['soft_bounce', 'hard_bounce', 'failed'].includes(x.type))
  const out = [
    { type: 'triggered', label: 'Triggered', time: e.triggered_time },
    { type: 'processed', label: 'Sent', time: e.sent_time },
  ]
  if (problem) out.push({ type: problem.type, label: problem.label, time: problem.time })
  out.push({ type: 'delivered', label: 'Delivered', time: at('delivered')?.time || '', note: problem ? 'Not delivered' : 'Waiting for confirmation' })
  out.push({ type: 'opened', label: 'Opened', time: at('opened')?.time || '', note: at('delivered') ? 'Not opened yet' : '—' })
  return out
}

export default function DetailDrawer({ email, list = [], onSelect, onClose, bulkTotal }) {
  const idx = email ? list.findIndex((e) => e.email_reference === email.email_reference) : -1
  const go = (d) => list[idx + d] && onSelect(list[idx + d])

  // Left / right arrow keys move to the previous / next email
  useEffect(() => {
    if (!email) return
    const h = (e) => {
      if (/input|select|textarea/i.test(e.target.tagName)) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  if (!email) return null
  const tone = STATUSES[email.status]?.tone
  // the explanation box is only for problems; an email still on its way is explained by the timeline
  // for a problem email, show the error itself: the reason and the message the client's server returned
  const problem = ['soft_bounce', 'hard_bounce', 'failed'].includes(email.status)

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Email details">
        <div className="drawer-nav">
          <div className="navgroup">
            <button className="navbtn" disabled={idx <= 0} onClick={() => go(-1)} aria-label="Previous email" title="Previous (←)"><Icon name="chevronLeft" /></button>
            <button className="navbtn" disabled={idx < 0 || idx >= list.length - 1} onClick={() => go(1)} aria-label="Next email" title="Next (→)"><Icon name="chevronRight" /></button>
            {idx >= 0 && <span className="navpos">{(idx + 1).toLocaleString()} of {list.length.toLocaleString()}</span>}
          </div>
          <button className="navbtn plain" onClick={onClose} aria-label="Close" title="Close (Esc)"><Icon name="close" /></button>
        </div>

        <div className="drawer-body">
          <header className="dhead">
            <div className="eyebrow">
              <span className="idcell">{email.log_id}</span>
              {email.type === 'bulk' && <a href={`#/bulk/${email.request_id}`} onClick={onClose}>Part of {email.bulk_id} ›</a>}
            </div>
            <div className="row-gap">
              <StatusBadge status={email.status} />
              {email.module && <ModuleTag module={email.module} />}
            </div>
          </header>

          {problem && (
            <div className={`help help-${tone}`}>
              <div className="help-title">{email.status_detail}</div>
              {email.diagnostic_message && <p className="errmsg">{email.diagnostic_message}</p>}
            </div>
          )}

          <section className="grp">
            <h3>Details</h3>
            <div className="fields">
              <div className="f full"><span className="k">Subject</span><span className="v"><span className="addr">{email.subject}</span></span></div>
              <div className="f full"><span className="k">To</span><span className="v"><span className="addr">{email.to}</span><CopyButton text={email.to} /></span></div>
              {email.cc.length > 0 && <div className="f full"><span className="k">CC</span><span className="v">{addrs(email.cc)}</span></div>}
              {email.bcc.length > 0 && <div className="f full"><span className="k">BCC</span><span className="v">{addrs(email.bcc)}</span></div>}
              {email.type === 'bulk' && email.trigger_event && <div className="f full"><span className="k">Trigger event</span><span className="v">{email.trigger_event}</span></div>}
              <div className="f"><span className="k">From</span><span className="v">{email.from}</span></div>
              <div className="f"><span className="k">Sent by</span><span className="v"><SentBy name={email.sent_by} /></span></div>
              <div className="f"><span className="k">Mode</span><span className="v"><ModeTag mode={email.mode} /></span></div>
              <div className="f"><span className="k">Attachments</span><span className="v">{email.attachment_count ? <AttachCell n={email.attachment_count} /> : 'None'}</span></div>
              {email.type === 'bulk' && bulkTotal && <div className="f"><span className="k">Bulk recipients</span><span className="v">{bulkTotal.toLocaleString()}</span></div>}
            </div>
          </section>

          <section className="grp">
            <h3>Timeline</h3>
            <ol className="tl">
              {steps(email).map((st) => (
                <li key={st.label} className={`ev-${st.type}${st.time ? '' : ' ev-none'}`}>
                  <span className="dot" /><b>{st.label}</b><time>{st.time ? fmtFull(st.time) : st.note}</time>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </aside>
    </>
  )
}
