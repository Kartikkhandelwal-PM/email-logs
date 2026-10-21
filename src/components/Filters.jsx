import { STATUSES } from '../api/emailLogs.js'
import { describeRange, presetRange } from '../dates.js'
import { FilterButton, Icon, SentBy } from './ui.jsx'
import DateRangePicker from './DateRangePicker.jsx'

export const DEFAULT_RANGE = presetRange('30')
export const EMPTY_FILTERS = { search: '', status: [], module: [], mode: [], sender: [], range: DEFAULT_RANGE }

export const statusOptions = () => [
  { value: '', label: 'All statuses' },
  ...Object.entries(STATUSES).map(([k, v]) => ({ value: k, label: v.label })),
]

// The filter buttons that sit next to the search box, then "Clear filters" and the totals
export default function Filters({ filters, onChange, senders, showStatus = true }) {
  const set = (k) => (v) => onChange({ ...filters, [k]: v })
  const dirty = filters.search || (showStatus && filters.status.length > 0) || filters.module.length > 0 || filters.mode.length > 0 || filters.sender.length > 0 || filters.range.preset !== DEFAULT_RANGE.preset
  return (
    <>
      {showStatus && <FilterButton label="Status" icon="status" value={filters.status} onChange={set('status')} options={statusOptions()} />}
      <FilterButton label="Module" icon="tag" value={filters.module} onChange={set('module')}
        options={[{ value: '', label: 'All modules' }, { value: 'GST', label: 'GST' }, { value: 'TDS', label: 'TDS' }, { value: 'ITR', label: 'ITR' }]} />
      <FilterButton label="Mode" icon="mode" multi={false} value={filters.mode[0] || ''} onChange={(v) => set('mode')(v ? [v] : [])}
        options={[{ value: '', label: 'All modes' }, { value: 'automated', label: 'Automated' }, { value: 'manual', label: 'Manual' }]} />
      <FilterButton label="Sent by" icon="user" value={filters.sender} onChange={set('sender')} searchable
        options={[{ value: '', label: 'All senders' }, ...senders.map((n) => ({ value: n, label: n, node: <SentBy name={n} /> }))]} />
      <DateRangePicker value={filters.range} onChange={set('range')}
        trigger={({ onClick, open }) => (
          <button className={`fbtn2 ${filters.range.preset !== DEFAULT_RANGE.preset ? 'on' : ''}`} onClick={onClick} aria-expanded={open}>
            <Icon name="calendar" />{describeRange(filters.range)}<span className="chev"><Icon name="chevron" size={14} /></span>
          </button>
        )} />
      {dirty && <button className="link" onClick={() => onChange(EMPTY_FILTERS)}>Clear filters</button>}
    </>
  )
}
