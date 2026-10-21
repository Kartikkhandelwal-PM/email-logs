// Sorting shared by every table
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

// Empty values always go last, whichever direction is chosen
export function sortRows(rows, get, dir) {
  const mult = dir === 'desc' ? -1 : 1
  return [...rows].sort((a, b) => {
    const x = get(a), y = get(b)
    const ex = x === '' || x == null, ey = y === '' || y == null
    if (ex || ey) return ex === ey ? 0 : ex ? 1 : -1
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * mult
    return collator.compare(String(x), String(y)) * mult
  })
}

// none -> ascending -> descending -> none (the default order)
export const nextSort = (cur, key) => (!cur || cur.key !== key ? { key, dir: 'asc' } : cur.dir === 'asc' ? { key, dir: 'desc' } : null)
