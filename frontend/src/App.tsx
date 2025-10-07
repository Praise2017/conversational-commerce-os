import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import AuthBar from './components/AuthBar'
import CommandPalette, { Command } from './components/CommandPalette'
import InboxPage from './pages/InboxPage'
import BroadcastsPage from './pages/BroadcastsPage'
import ChannelsPage from './pages/ChannelsPage'
import AnalyticsPage from './pages/AnalyticsPage'

function Navigation() {
  const links = [
    { to: '/', label: 'Inbox' },
    { to: '/broadcasts', label: 'Broadcasts' },
    { to: '/channels', label: 'Channels' },
    { to: '/analytics', label: 'Analytics' },
  ]
  return (
    <nav className="bg-white border rounded px-3 py-2 flex gap-3 text-sm">
      {links.map(link => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) =>
            `px-2 py-1 rounded ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default function App() {
  const [showPalette, setShowPalette] = useState(false)
  const navigate = useNavigate()

  const commands: Command[] = useMemo(() => ([
    { label: 'Go to Inbox', hint: 'View conversations', action: () => navigate('/') },
    { label: 'Go to Broadcasts', hint: 'Manage campaigns', action: () => navigate('/broadcasts') },
    { label: 'Go to Channels', hint: 'Configure messaging channels', action: () => navigate('/channels') },
    { label: 'Go to Analytics', hint: 'Review KPIs', action: () => navigate('/analytics') },
  ]), [navigate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowPalette(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="h-screen grid grid-rows-[auto,auto,1fr] gap-2 p-2 bg-slate-100">
      <AuthBar />
      <Navigation />
      <div className="border rounded bg-white p-3 overflow-hidden">
        <Routes>
          <Route path="/" element={<InboxPage />} />
          <Route path="/broadcasts" element={<BroadcastsPage />} />
          <Route path="/channels" element={<ChannelsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
      <CommandPalette open={showPalette} onClose={() => setShowPalette(false)} commands={commands} />
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-gray-500">The page you are looking for does not exist.</p>
      <Link to="/" className="text-blue-600 underline">Back to Inbox</Link>
    </div>
  )
}
