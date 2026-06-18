import { useState, useEffect } from 'react'
import supabase from '../supabase'

export default function DoNotCall() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [phone, setPhone] = useState('')
  const [reason, setReason] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchList()
  }, [])

  const fetchList = async () => {
    const { data } = await supabase
      .from('do_not_call')
      .select('*')
      .order('added_at', { ascending: false })
    setList(data || [])
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!phone) return setError('Phone number is required')
    if (!phone.startsWith('+')) return setError('Phone must start with + and country code (e.g. +12125551234)')

    setAdding(true)
    setError('')
    setSuccess('')

    const { error: err } = await supabase
      .from('do_not_call')
      .insert({ phone, reason: reason || 'Manually added' })

    if (err) {
      setError(err.message.includes('unique') ? 'Number already on the list' : err.message)
    } else {
      setSuccess('Number added successfully')
      setPhone('')
      setReason('')
      fetchList()
    }
    setAdding(false)
  }

  const handleRemove = async (id) => {
    await supabase.from('do_not_call').delete().eq('id', id)
    fetchList()
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>
        Loading...
      </div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '28px',
          fontWeight: '800',
          marginBottom: '4px'
        }}>Do Not Call List</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          {list.length} numbers blocked from receiving calls
        </p>
      </div>

      {/* Add number */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '15px',
          fontWeight: '700',
          marginBottom: '16px'
        }}>Add Number Manually</h3>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="+12125551234"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'var(--font-body)',
              outline: 'none'
            }}
          />
          <input
            type="text"
            placeholder="Reason (optional)"
            value={reason}
            onChange={e => setReason(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'var(--font-body)',
              outline: 'none'
            }}
          />
          <button
            onClick={handleAdd}
            disabled={adding}
            style={{
              padding: '10px 24px',
              background: adding ? 'var(--accent-dim)' : 'var(--accent)',
              border: 'none',
              borderRadius: '10px',
              color: adding ? 'var(--accent)' : '#070b14',
              fontSize: '14px',
              fontWeight: '700',
              fontFamily: 'var(--font-display)',
              cursor: adding ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            {adding ? 'Adding...' : '+ Add'}
          </button>
        </div>

        {error && (
          <p style={{ color: 'var(--accent-red)', fontSize: '13px' }}>{error}</p>
        )}
        {success && (
          <p style={{ color: 'var(--accent-green)', fontSize: '13px' }}>{success}</p>
        )}
      </div>

      {/* List */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '16px',
            fontWeight: '700'
          }}>Blocked Numbers</h2>
          <span style={{
            background: 'rgba(255,71,87,0.1)',
            color: 'var(--accent-red)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {list.length} blocked
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              {['Phone Number', 'Reason', 'Date Added', 'Action'].map(h => (
                <th key={h} style={{
                  padding: '12px 24px',
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
            {list.length === 0 ? (
              <tr>
                <td colSpan={4} style={{
                  padding: '32px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '14px'
                }}>No numbers blocked yet</td>
              </tr>
            ) : list.map((item, i) => (
              <tr key={item.id} style={{
                borderTop: '1px solid var(--border)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
              }}>
                <td style={{
                  padding: '14px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  fontFamily: 'monospace',
                  color: 'var(--accent-red)'
                }}>
                  {item.phone}
                </td>
                <td style={{
                  padding: '14px 24px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)'
                }}>
                  {item.reason || '—'}
                </td>
                <td style={{
                  padding: '14px 24px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)'
                }}>
                  {item.added_at ? new Date(item.added_at).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '14px 24px' }}>
                  <button
                    onClick={() => handleRemove(item.id)}
                    style={{
                      padding: '6px 14px',
                      background: 'rgba(255,71,87,0.1)',
                      border: '1px solid var(--accent-red)',
                      borderRadius: '8px',
                      color: 'var(--accent-red)',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}