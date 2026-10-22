import { useEffect, useMemo, useState } from 'react'
import { fetchRequest, countStatuses, STATUSES } from '../api/emailLogs.js'
import { EmailTable, ColumnPicker, useColumns, RECIPIENT_COLUMNS, SORT_VALUES } from './columns.jsx'
import { sortRows, nextSort } from '../sort.js'
import DetailDrawer from './DetailDrawer.jsx'
import { Pager, SentBy, ModuleTag, FilterButton, DownloadIcon, Icon, downloadCsv, fmtFull } from './ui.jsx'

export default function BulkDetail({ requestId }) {
  const [state, setState] = useState({ loading: true, error: '', emails: [] })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState([])
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [selected, setSelected] = useState(null)
  const [sort, setSort] = useState(null) // null = send order (BL-148-1 first)
  const columns = useColumns('email-logs:recipient-cols:v13', RECIPIENT_COLUMNS)

  useEffect(() => {
    let live = true
    setState({ loading: true, error: '', emails: [] })
    fetchRequest(requestId)
      .then((emails) => live && setState({ loading: false, error: '', emails: [...emails].sort((a, b) => a.sent_time.localeCompare(b.sent_time)) })) // BL-101-1 first
      .catch((err) => live && setState({ loading: false, error: err.message, emails: [] }))
    return () => { live = false }
  }, [requestId])

  useEffect(() => setPage(0), [search, status, pageSize, sort])

  const q = search.trim().toLowerCase()
  const searched = useMemo(() => (q ? state.emails.filter((e) => e.to.toLowerCase().includes(q) || e.log_id.toLowerCase().includes(q) || e.subject.toLowerCase().includes(q)) : state.emails), [state.emails, q])
  const counts = useMemo(() => countStatuses(searched), [searched])
  const filtered = useMemo(() => (status.length ? searched.filter((e) => status.includes(e.status)) : searched), [searched, status])
  const rows = useMemo(() => (sort ? sortRows(filtered, SORT_VALUES[sort.key], sort.dir) : filtered), [filtered, sort])
  const first = state.emails[0]
  const allCounts = useMemo(() => countStatuses(state.emails), [state.emails])

  return (
    <div className="page">
      <div className="crumbs"><a href="#/">Email Logs</a><span>/</span><span className="crumb-id">{first ? first.bulk_id : 'Bulk send'}</span></div>

      {state.loading ? (
        <div className="empty"><div className="spinner" /><p className="muted">Loading bulk send…</p></div>
      ) : state.error || !first ? (
        <div className="empty"><p><b>{state.error || 'This bulk send was not found'}</b></p><a className="btn" href="#/">Back to Email Logs</a></div>
      ) : (
        <>
          <header className="top">
            <div className="titleline"><h1>{first.trigger_event}</h1>{first.module && <ModuleTag module={first.module} />}</div>
            <button className="btn withicon" onClick={() => downloadCsv(rows, `bulk-${requestId}.csv`)}><DownloadIcon />Export</button>
          </header>

          <section className="statcards" aria-label="Delivery results">
            <div className="scard tone-gray">
              <span className="sl"><i className="dot dot-gray" />Recipients</span>
              <span className="sn">{state.emails.length.toLocaleString()}</span>
              <span className="ss">{(allCounts.processing || 0).toLocaleString()} pending</span>
            </div>
            <div className="scard tone-green">
              <span className="sl"><i className="dot dot-green" />Delivered</span>
              <span className="sn">{(allCounts.delivered || 0).toLocaleString()}</span>
              <span className="ss">{Math.round(((allCounts.delivered || 0) / state.emails.length) * 100)}% of recipients</span>
            </div>
            <div className="scard tone-amber">
              <span className="sl"><i className="dot dot-amber" />Bounced</span>
              <span className="sn">{((allCounts.soft_bounce || 0) + (allCounts.hard_bounce || 0)).toLocaleString()}</span>
              <span className="ss">{(allCounts.soft_bounce || 0).toLocaleString()} soft · {(allCounts.hard_bounce || 0).toLocaleString()} hard</span>
            </div>
            <div className="scard tone-red">
              <span className="sl"><i className="dot dot-red" />Failed</span>
              <span className="sn">{(allCounts.failed || 0).toLocaleString()}</span>
              <span className="ss">{Math.round(((allCounts.failed || 0) / state.emails.length) * 100)}% of recipients</span>
            </div>
          </section>

          <p className="metaline">
            <span>Triggered {fmtFull(first.triggered_time)}</span>
            <span>Sent {fmtFull(first.sent_time)}</span>
            <span>by <SentBy name={first.sent_by} /></span>
            <span>from {first.from}</span>
          </p>

          <div className="controls bulkbar">
            <span className="searchbox"><Icon name="search" /><input type="search" className="search" placeholder="Search ID, recipient or subject" value={search} onChange={(e) => setSearch(e.target.value)} /></span>
            <FilterButton label="Status" icon="status" value={status} onChange={setStatus}
              options={[{ value: '', label: 'All statuses' }, ...Object.entries(STATUSES).map(([k, v]) => ({ value: k, label: v.label }))]} />
            {(search || status.length > 0) && (
              <>
                <button className="link" onClick={() => { setSearch(''); setStatus([]) }}>Clear filters</button>
                <span className="grow" />
                <span className="muted small">Showing {rows.length.toLocaleString()} of {state.emails.length.toLocaleString()}</span>
              </>
            )}
          </div>

          <main className="panel round">
            <div className="panel-scroll">
            {rows.length ? (
              <EmailTable emails={rows.slice(page * pageSize, (page + 1) * pageSize)} cols={columns.visible} onOpen={setSelected} selectedId={selected?.email_reference} onMove={columns.move} onResize={columns.resize} onResetWidth={columns.resetWidth} sort={sort} onSort={(k) => setSort(nextSort(sort, k))} />
            ) : (
              <div className="empty"><p><b>No recipients found</b></p><p className="muted">Try changing or clearing your filters.</p></div>
            )}
            </div>
            {rows.length > 0 && <div className="panel-corner"><ColumnPicker all={RECIPIENT_COLUMNS} {...columns} /></div>}
          </main>
          <Pager page={page} total={rows.length} pageSize={pageSize} onPage={setPage} onSize={setPageSize} sizes={[25, 50, 100, 200]} />
        </>
      )}
      <DetailDrawer bulkTotal={state.emails.length} email={selected} list={rows} onSelect={setSelected} onClose={() => setSelected(null)} />
    </div>
  )
}
