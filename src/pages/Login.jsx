import { useState } from 'react'
import logo from '../logo.png'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setTimeout(() => {
      const success = onLogin(username, password)
      if (!success) {
        setError('Invalid credentials')
        setLoading(false)
      }
    }, 800)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none'
      }} />

      {/* Login card */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '48px',
        width: '100%',
        maxWidth: '420px',
        position: 'relative'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src={logo} alt="AISE" style={{ height: '40px', objectFit: 'contain' }} />
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '22px',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '8px',
          color: 'var(--text-primary)'
        }}>
          Cold Caller Dashboard
        </h1>

        <p style={{
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '14px',
          marginBottom: '32px'
        }}>
          Sign in to manage your campaigns
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '500',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="AISEofficial"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontFamily: 'var(--font-body)',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '500',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontFamily: 'var(--font-body)',
                outline: 'none'
              }}
            />
          </div>

          {error && (
            <p style={{
              color: 'var(--accent-red)',
              fontSize: '13px',
              marginBottom: '16px',
              textAlign: 'center'
            }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? 'var(--accent-dim)' : 'var(--accent)',
              border: 'none',
              borderRadius: '10px',
              color: loading ? 'var(--accent)' : '#070b14',
              fontSize: '14px',
              fontWeight: '700',
              fontFamily: 'var(--font-display)',
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.5px',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}