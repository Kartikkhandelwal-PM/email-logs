import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// width of the scrollbar the tables use, so the + corner button can sit beside it instead of on top of it
const probe = Object.assign(document.createElement('div'), { className: 'panel-scroll' })
probe.style.cssText = 'position:absolute;visibility:hidden;width:100px;height:100px;flex:none'
probe.innerHTML = '<div style="height:300px"></div>'
document.body.appendChild(probe)
document.documentElement.style.setProperty('--sbw', `${probe.offsetWidth - probe.clientWidth}px`)
probe.remove()

// Hover tip for table cells whose text is cut off ("..."): shows the full text right away
const tip = Object.assign(document.createElement('div'), { className: 'celltip', role: 'tooltip' })
document.body.appendChild(tip)
let tipTimer
const hideTip = () => { clearTimeout(tipTimer); tip.classList.remove('show') }
document.addEventListener('mouseover', (e) => {
  const td = e.target.closest?.('table.logs tbody td')
  if (!td) return hideTip()
  const els = [td, ...td.querySelectorAll('.title, .trunc, .addr, .cc-addr, .clamp2')]
  const cut = els.find((x) => x.scrollWidth > x.clientWidth + 1 || x.scrollHeight > x.clientHeight + 1)
  if (!cut) return hideTip()
  const text = (cut.title || cut.innerText || '').trim()
  if (!text) return hideTip()
  clearTimeout(tipTimer)
  tipTimer = setTimeout(() => {
    tip.textContent = text
    const r = td.getBoundingClientRect()
    tip.classList.add('show')
    const w = tip.offsetWidth
    tip.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - w - 8))}px`
    tip.style.top = `${r.bottom + 4 + tip.offsetHeight > window.innerHeight ? r.top - tip.offsetHeight - 4 : r.bottom + 4}px`
  }, 120)
})
document.addEventListener('mouseleave', hideTip)
window.addEventListener('scroll', hideTip, true)
document.addEventListener('mousedown', hideTip)

createRoot(document.getElementById('root')).render(<App />)
