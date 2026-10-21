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

createRoot(document.getElementById('root')).render(<App />)
