import { useState, useEffect } from 'react'
import supabase from '../supabase'

var StatCard = function(props) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0, right: 0,
        width: '80px', height: '80px',
        background: 'radial-gradient(circle, ' + props.color + '15 0%, transparent 70%)',
      }} />
      <div style={{ fontSize: '24px', marginBottom: '12px' }}>{props.icon}</div>
      <div style={{
        fontSize: '32px',
        fontFamily: 'var(--font-display)',
        fontWeight: '700',
        color: props.color,
        marginBottom: '4px'
      }}>{props.value}</div>
      <div style={{
        fontSize: '13px',
        color: 'var(--text-secondary)',
        fontWeight: '500'
      }}>{props.label}</div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCalls: 0,
    completedCalls: 0,
    bookedCalls: 0,
    voicemailCalls: 0,
    dncCount: 0,
    totalCost: 0,
    avgDuration: 0
  })
  const [recentCalls, setRecentCalls] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(function() { fetchData() }, [])

  var fetchData = async function() {
    var callsResult = await supabase
      .from('calls')
      .select('*')
      .order('created_at', { ascending: false })

    var dncResult = await supabase
      .from('do_not_call')
      .select('id')

    var calls = callsResult.data || []
    var dnc = dncResult.data || []

    var completed = calls.filter(function(c) { return c.duration_seconds > 0 })

    var booked = calls.filter(function(c) {
      var outcome = (c.outcome || '').toLowerCase()
      var summary = (c.summary || '').toLowerCase()
      if (outcome.includes('voicemail')) return false
      if (outcome.includes('error') || outcome.includes('failed')) return false
      return (summary.includes('book') || summary.includes('scheduled') || summary.includes('appointment')) &&
             (outcome.includes('customer-ended') || outcome.includes('assistant-ended'))
    })

    var voicemails = calls.filter(function(c) {
      return (c.outcome || '').toLowerCase().includes('voicemail')
    })

    var totalCost = calls.reduce(function(sum, c) { return sum + (parseFloat(c.cost) || 0) }, 0)

    var avgDuration = completed.length > 0
      ? Math.round(completed.reduce(function(sum, c) { return sum + (c.duration_seconds || 0) }, 0) / completed.length)
      : 0

    setStats({
      totalCalls: calls.length,
      completedCalls: completed.length,
      bookedCalls: booked.length,
      voicemailCalls: voicemails.length,
      dncCount: dnc.length,
      totalCost: totalCost.toFixed(2),
      avgDuration: avgDuration
    })
    setRecentCalls(calls.slice(0, 8))
    setLoading(false)
  }

  var getOutcomeColor = function(outcome) {
    if (!outcome) return 'var(--text-muted)'
    if (outcome.includes('voicemail')) return '#a78bfa'
    if (outcome.includes('customer-ended') || outcome.includes('assistant-ended')) return 'var(--accent-green)'
    if (outcome.includes('busy') || outcome.includes('no-answer') || outcome.includes('did-not-answer')) return 'var(--accent-yellow)'
    if (outcome.includes('error') || outcome.includes('failed')) return 'var(--accent-red)'
    return 'var(--accent)'
  }

  var formatDuration = function(seconds) {
    if (!seconds) return '0s'
    if (seconds < 60) return Math.round(seconds) + 's'
    return Math.floor(seconds / 60) + 'm ' + Math.round(seconds % 60) + 's'
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>Loading...</div>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '800', marginBottom: '4px' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Overview of your cold calling campaigns</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <StatCard label="Total Calls" value={stats.totalCalls} color="var(--accent)" icon="📞" />
        <StatCard label="Completed" value={stats.completedCalls} color="var(--accent-green)" icon="✅" />
        <StatCard label="Booked" value={stats.bookedCalls} color="#a78bfa" icon="📅" />
        <StatCard label="Voicemails" value={stats.voicemailCalls} color="var(--accent-yellow)" icon="📩" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <StatCard label="Do Not Call" value={stats.dncCount} color="var(--accent-red)" icon="⊘" />
        <StatCard label="Total Cost" value={'$' + stats.totalCost} color="var(--accent-yellow)" icon="💰" />
        <StatCard label="Avg Duration" value={formatDuration(stats.avgDuration)} color="var(--accent)" icon="⏱" />
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: '700' }}>Recent Calls</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Last 8 calls</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              {['Name', 'Phone', 'Duration', 'Outcome', 'Date'].map(function(h) {
                return <th key={h} style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              })}
            </tr>
          </thead>
          <tbody>
            {recentCalls.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>No calls yet</td>
              </tr>
            ) : recentCalls.map(function(call, i) {
              return (
                <tr key={call.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <td style={{ padding: '14px 24px', fontSize: '14px', fontWeight: '500' }}>{call.customer_name || '—'}</td>
                  <td style={{ padding: '14px 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>{call.customer_phone}</td>
                  <td style={{ padding: '14px 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>{formatDuration(call.duration_seconds)}</td>
                  <td style={{ padding: '14px 24px' }}>
                    <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: getOutcomeColor(call.outcome) + '20', color: getOutcomeColor(call.outcome), fontWeight: '500' }}>
                      {call.outcome || 'unknown'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {call.created_at ? new Date(call.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}