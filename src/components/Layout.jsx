import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import logo from '../logo.png'

export default function Layout({ onLogout }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: '240px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        position: 'fixed',
        height: '100vh'
      }}>
        <div style={{ padding: '0 24px 32px' }}>
          <img src={logo} alt="AISE" style={{ height: '36px', objectFit: 'contain' }} />
        </div>

        <nav style={{ flex: 1, padding: '0 12px' }}>
          {[
            { to: '/', label: 'Dashboard', icon: '▦' },
            { to: '/campaigns', label: 'Campaigns', icon: '◈' },
            { to: '/calls', label: 'Call Logs', icon: '◎' },
            { to: '/meetings', label: 'Meetings', icon: '📅' },
            { to: '/dnc', label: 'Do Not Call', icon: '⊘' },
            { to: '/summaries', label: 'Summaries', icon: '📋' },
            { to: '/messages', label: 'Messages', icon: '💬' },
          ].map(({ to, label, icon }) => (  
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '10px',
                marginBottom: '4px',
                textDecoration: 'none',
                fontSize: '14px',
                fontFamily: 'var(--font-body)',
                fontWeight: '500',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-dim)' : 'transparent',
                border: isActive ? '1px solid var(--border-hover)' : '1px solid transparent',
                transition: 'all 0.2s'
              })}
            >
              <span style={{ fontSize: '16px' }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '0 12px' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <span>⎋</span> Logout
          </button>
        </div>
      </aside>

      <main style={{
        marginLeft: '240px',
        flex: 1,
        padding: '32px',
        minHeight: '100vh'
      }}>
        <Outlet />
      </main>
    </div>
  )
}