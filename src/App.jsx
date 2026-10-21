import { useEffect, useMemo, useState } from 'react'
import { fetchEmailLogs, groupByRequest, countStatuses } from './api/emailLogs.js'
import Filters, { EMPTY_FILTERS } from './components/Filters.jsx'
import { BulkTable, BULK_SORT, BULK_COLUMNS } from './components/LogsTable.jsx'
import { sortRows, nextSort } from './sort.js'
import { EmailTable, ColumnPicker, useColumns, EMAIL_COLUMNS, SORT_VALUES } from './components/columns.jsx'
import BulkDetail from './components/BulkDetail.jsx'
import DetailDrawer from './components/DetailDrawer.jsx'
import { Pager, DownloadIcon, Icon, downloadCsv } from './components/ui.jsx'

const PAGE_SIZES = [10, 25, 50, 100]

function useHash() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const on = () => { setHash(window.location.hash); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}

export default function App() {
  const hash = useHash()
  const bulk = hash.match(/^#\/bulk\/(.+)$/)
  // Home stays mounted (hidden) so filters, tab and page survive a visit to a bulk send
  return (
    <>
      {bulk && <BulkDetail key={bulk[1]} requestId={decodeURIComponent(bulk[1])} />}
      <div hidden={!!bulk}><Home /></div>
    </>
  )
}

function Home() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [tab, setTab] = useState('bulk')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [sorts, setSorts] = useState({ bulk: null, single: null }) // null = newest first
  const sort = sorts[tab]
  const onSort = (key) => setSorts({ ...sorts, [tab]: nextSort(sort, key) })
  const [state, setState] = useState({ loading: true, error: '', emails: [], updatedAt: null })
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState(null)
  const columns = useColumns('email-logs:single-cols:v8', EMAIL_COLUMNS)
  const bulkCols = useColumns('email-logs:bulk-cols:v2', BULK_COLUMNS)

  useEffect(() => {
    let live = true
    setState((s) => ({ ...s, loading: true, error: '' }))
    fetchEmailLogs({ from: filters.range.from, to: filters.range.to })
      .then((emails) => live && setState({ loading: false, error: '', emails, updatedAt: new Date() }))
      .catch((err) => live && setState({ loading: false, error: err.message, emails: [], updatedAt: null }))
    return () => { live = false }
  }, [filters.range.from, filters.range.to, reload])

  // Everything except status: the summary cards count these
  const base = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return state.emails.filter((e) =>
      (!filters.module.length || filters.module.includes(e.module)) &&
      (!filters.mode.length || filters.mode.includes(e.mode)) &&
      (!filters.sender.length || filters.sender.includes(e.sent_by)) &&
      (!q || [e.log_id, e.to, e.subject].some((v) => v?.toLowerCase().includes(q))))
  }, [state.emails, filters.search, filters.module, filters.mode, filters.sender])
  // only senders who have something on the tab you are looking at
  const senders = useMemo(() => [...new Set(state.emails.filter((e) => e.type === (tab === 'bulk' ? 'bulk' : 'single')).map((e) => e.sent_by))].sort(), [state.emails, tab])

  const counts = useMemo(() => countStatuses(base), [base])
  // A bulk send has no single status, so the Status filter only applies to single emails
  const bulkEmails = useMemo(() => base.filter((e) => e.type === 'bulk'), [base])
  const bulkGroups = useMemo(() => groupByRequest(bulkEmails), [bulkEmails])
  const singles = useMemo(() => base.filter((e) => e.type === 'single' && (!filters.status.length || filters.status.includes(e.status))), [base, filters.status])
  const exportRows = tab === 'bulk' ? bulkEmails : singles

  useEffect(() => setPage(0), [filters, tab, pageSize, sorts])

  const bulkSorted = useMemo(() => (sorts.bulk ? sortRows(bulkGroups, BULK_SORT[sorts.bulk.key], sorts.bulk.dir) : bulkGroups), [bulkGroups, sorts.bulk])
  const singlesSorted = useMemo(() => (sorts.single ? sortRows(singles, SORT_VALUES[sorts.single.key], sorts.single.dir) : singles), [singles, sorts.single])

  const total = tab === 'bulk' ? bulkGroups.length : singles.length
  const slice = (arr) => arr.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <div className="page">
      <header className="top">
        <div>
          <h1><span className="titleicon"><Icon name="mail" size={20} /></span>Email Logs</h1>
          <p className="muted">Every email sent to your clients, automated or manual. Logs are kept for 60 days.</p>
        </div>
        <div className="row-gap">
          {state.updatedAt && <span className="muted small">Updated {state.updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>}
          <button className="btn ghost iconsq" onClick={() => setReload(reload + 1)} aria-label="Refresh" title="Refresh">
            <svg className={state.loading ? 'spin' : ''} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M13.5 8a5.5 5.5 0 1 1-1.7-3.97" /><path d="M13.7 2.2v3.2h-3.2" />
            </svg>
          </button>
          <button className="btn withicon" onClick={() => downloadCsv(exportRows, tab === 'bulk' ? 'bulk-sends.csv' : 'single-emails.csv')} disabled={!exportRows.length}><DownloadIcon />Export</button>
        </div>
      </header>

      <div className="controls">
        <div className="tabs" role="tablist">
          <button className={tab === 'bulk' ? 'on' : ''} onClick={() => setTab('bulk')}><Icon name="layers" />Bulk emails</button>
          <button className={tab === 'single' ? 'on' : ''} onClick={() => setTab('single')}><Icon name="mail" />Single emails</button>
        </div>
        <span className="searchbox"><Icon name="search" /><input type="search" className="search" placeholder="Search ID, recipient or subject" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></span>
        <Filters filters={filters} onChange={setFilters} senders={senders} counts={counts} showStatus={tab === 'single'} />
      </div>

      <main className="panel">
        <div className="panel-scroll">
        {state.error ? (
          <div className="empty"><p>{state.error}</p><button className="btn" onClick={() => setReload(reload + 1)}>Try again</button></div>
        ) : state.loading ? (
          <div className="empty"><div className="spinner" /><p className="muted">Loading email logs…</p></div>
        ) : !total ? (
          <div className="empty"><p><b>No emails found</b></p><p className="muted">Try changing or clearing your filters.</p></div>
        ) : tab === 'bulk' ? (
          <BulkTable groups={slice(bulkSorted)} cols={bulkCols.visible} sort={sort} onSort={onSort} onMove={bulkCols.move} />
        ) : (
          <EmailTable emails={slice(singlesSorted)} cols={columns.visible} onOpen={setSelected} sort={sort} onSort={onSort} selectedId={selected?.email_reference} onMove={columns.move} />
        )}
        </div>
        {!state.loading && !state.error && total > 0 && <div className="panel-corner"><ColumnPicker all={tab === 'bulk' ? BULK_COLUMNS : EMAIL_COLUMNS} {...(tab === 'bulk' ? bulkCols : columns)} /></div>}
      </main>

      {!state.loading && <Pager page={page} total={total} pageSize={pageSize} onPage={setPage} onSize={setPageSize} sizes={PAGE_SIZES}
        info={`${counts.total.toLocaleString()} emails · ${counts.total ? Math.round(((counts.delivered || 0) / counts.total) * 100) : 0}% delivered`} />}
      <DetailDrawer email={selected} list={singlesSorted} onSelect={setSelected} onClose={() => setSelected(null)} />
    </div>
  )
}
