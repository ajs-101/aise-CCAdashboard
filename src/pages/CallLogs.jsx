import { useState, useEffect } from 'react'
import supabase from '../supabase'

export default function CallLogs() {
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchCalls()
  }, [])

  const fetchCalls = async () => {
    const { data } = await supabase
      .from('calls')
      .select('*')
      .order('created_at', { ascending: false })
    setCalls(data || [])
    setLoading(false)
  }

  const getOutcomeColor = (outcome) => {
    if (!outcome) return 'var(--text-muted)'
    if (outcome.includes('customer-ended')) return 'var(--accent-green)'
    if (outcome.includes('busy')) return 'var(--accent-yellow)'
    if (outcome.includes('error')) return 'var(--accent-red)'
    return 'var(--accent)'
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0s'
    if (seconds < 60) return `${seconds}s`
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }

  const filtered = calls.filter(c => {
    const matchesFilter = filter === 'all' || (c.outcome || '').includes(filter)
    const matchesSearch = !search ||
      (c.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.customer_phone || '').includes(search)
    return matchesFilter && matchesSearch
  })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>
        Loading...
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      {/* Left - calls list */}
      <div style={{ flex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '28px',
            fontWeight: '800',
            marginBottom: '4px'
          }}>Call Logs</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {calls.length} total calls recorded
          </p>
        </div>

        {/* Search and filter */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'var(--font-body)',
              outline: 'none'
            }}
          />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'var(--font-body)',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All outcomes</option>
            <option value="customer-ended">Completed</option>
            <option value="busy">Busy</option>
            <option value="error">Error</option>
          </select>
        </div>

        {/* Calls table */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                {['Name', 'Phone', 'Duration', 'Outcome', 'Date'].map(h => (
                  <th key={h} style={{
                    padding: '12px 20px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: '14px'
                  }}>No calls found</td>
                </tr>
              ) : filtered.map((call, i) => (
                <tr
                  key={call.id}
                  onClick={() => setSelected(call)}
                  style={{
                    borderTop: '1px solid var(--border)',
                    background: selected?.id === call.id
                      ? 'var(--accent-dim)'
                      : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                >
                  <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: '500' }}>
                    {call.customer_name || '—'}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {call.customer_phone}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {formatDuration(call.duration_seconds)}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      background: `${getOutcomeColor(call.outcome)}20`,
                      color: getOutcomeColor(call.outcome),
                      fontWeight: '500'
                    }}>
                      {call.outcome || 'unknown'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {call.created_at ? new Date(call.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right - call detail panel */}
      {selected && (
        <div style={{
          width: '340px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
          height: 'fit-content',
          position: 'sticky',
          top: '32px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '16px',
              fontWeight: '700'
            }}>Call Details</h3>
            <button
              onClick={() => setSelected(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >✕</button>
          </div>

          {[
            { label: 'Name', value: selected.customer_name || '—' },
            { label: 'Phone', value: selected.customer_phone },
            { label: 'Duration', value: formatDuration(selected.duration_seconds) },
            { label: 'Outcome', value: selected.outcome || 'unknown' },
            { label: 'Cost', value: selected.cost ? `$${selected.cost}` : '$0' },
            { label: 'Date', value: selected.created_at ? new Date(selected.created_at).toLocaleString() : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: '1px solid var(--border)',
              fontSize: '13px'
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontWeight: '500', maxWidth: '180px', textAlign: 'right' }}>{value}</span>
            </div>
          ))}

          {selected.summary && (
            <div style={{ marginTop: '16px' }}>
              <p style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px'
              }}>Summary</p>
              <p style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                lineHeight: '1.6'
              }}>{selected.summary}</p>
            </div>
          )}

          {selected.recording_url && (
            <div style={{ marginTop: '16px' }}>
              <p style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px'
              }}>Recording</p>
              <audio
                controls
                src={selected.recording_url}
                style={{ width: '100%', borderRadius: '8px' }}
              />
            </div>
          )}

          {selected.transcript && (
            <div style={{ marginTop: '16px' }}>
              <p style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px'
              }}>Transcript</p>
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                lineHeight: '1.7',
                background: 'var(--bg-secondary)',
                padding: '12px',
                borderRadius: '8px'
              }}>
                {selected.transcript}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}