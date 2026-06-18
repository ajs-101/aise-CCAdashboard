import { useState, useEffect } from 'react'
import supabase from '../supabase'

export default function Summaries() {
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(function() { fetchCalls() }, [])

  const fetchCalls = async function() {
    const { data } = await supabase
      .from('calls')
      .select('*')
      .order('created_at', { ascending: false })
    setCalls(data || [])
    if (data && data.length > 0) setSelected(data[0])
    setLoading(false)
  }

  const handleDelete = async function() {
    if (!selected) return
    setDeleting(true)
    await supabase.from('calls').delete().eq('id', selected.id)
    setSelected(null)
    setConfirmDelete(false)
    setDeleting(false)
    fetchCalls()
  }

  const handleDeleteAll = async function() {
    setDeleting(true)
    await supabase.from('calls').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('do_not_call').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setSelected(null)
    setCalls([])
    setConfirmDelete(false)
    setDeleting(false)
  }

  const handleCopyTranscript = function() {
    if (!selected || !selected.transcript) return
    navigator.clipboard.writeText(selected.transcript).then(function() {
      setCopied(true)
      setTimeout(function() { setCopied(false) }, 2000)
    })
  }

  const classifyCall = function(call) {
    const outcome = (call.outcome || '').toLowerCase()
    const summary = (call.summary || '').toLowerCase()
    if (outcome.includes('voicemail')) return { label: 'Voicemail', color: '#a78bfa' }
    if (outcome.includes('busy') || outcome.includes('no-answer') || outcome.includes('did-not-answer')) return { label: 'No Answer', color: 'var(--accent-yellow)' }
    if (outcome.includes('error') || outcome.includes('failed')) return { label: 'Failed', color: 'var(--accent-red)' }
    if (outcome.includes('customer-ended') || outcome.includes('assistant-ended')) {
      if (summary.includes('book') || summary.includes('scheduled') || summary.includes('calendar') || summary.includes('appointment')) {
        return { label: 'Booked', color: 'var(--accent-green)' }
      }
      return { label: 'Completed', color: 'var(--accent-green)' }
    }
    return { label: 'Unknown', color: 'var(--text-muted)' }
  }

  const formatDuration = function(seconds) {
    if (!seconds) return '0s'
    if (seconds < 60) return Math.round(seconds) + 's'
    return Math.floor(seconds / 60) + 'm ' + Math.round(seconds % 60) + 's'
  }

  const parseTranscript = function(transcript) {
    if (!transcript) return []
    return transcript
      .split('\n')
      .filter(function(line) { return line.trim() })
      .map(function(line, i) {
        var isAgent = line.startsWith('AI:') || line.startsWith('Assistant:') || line.startsWith('Bot:')
        var isUser = line.startsWith('User:') || line.startsWith('Customer:') || line.startsWith('Human:')
        var text = line.replace(/^(AI|Assistant|Bot|User|Customer|Human):\s*/, '')
        return { id: i, speaker: isAgent ? 'agent' : isUser ? 'user' : 'other', text: text }
      })
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>Loading...</div>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '800', marginBottom: '4px' }}>Call Summaries</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Detailed breakdown of every call</p>
        </div>
        <button
          onClick={function() { setConfirmDelete('all') }}
          style={{ padding: '8px 16px', background: 'rgba(255,71,87,0.1)', border: '1px solid var(--accent-red)', borderRadius: '10px', color: 'var(--accent-red)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
        >
          Clear All Test Data
        </button>
      </div>

      {confirmDelete ? (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '100%' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>
              {confirmDelete === 'all' ? 'Clear All Data?' : 'Delete This Call?'}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
              {confirmDelete === 'all'
                ? 'This will permanently delete ALL calls, messages, and do-not-call entries. This cannot be undone. Use this to clear test data before going live.'
                : 'This will permanently delete this call record including its summary, transcript, and recording. This cannot be undone.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={function() { setConfirmDelete(false) }}
                disabled={deleting}
                style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete === 'all' ? handleDeleteAll : handleDelete}
                disabled={deleting}
                style={{ padding: '10px 20px', background: deleting ? 'rgba(255,71,87,0.3)' : 'var(--accent-red)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: deleting ? 'not-allowed' : 'pointer' }}
              >
                {deleting ? 'Deleting...' : confirmDelete === 'all' ? 'Delete Everything' : 'Delete Call'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '24px' }}>
        <div style={{ width: '300px', flexShrink: 0 }}>
          {calls.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>No calls yet</div>
          ) : calls.map(function(call) {
            var cls = classifyCall(call)
            var isSelected = selected && selected.id === call.id
            return (
              <div
                key={call.id}
                onClick={function() { setSelected(call); setCopied(false) }}
                style={{
                  background: isSelected ? 'var(--accent-dim)' : 'var(--bg-card)',
                  border: '1px solid ' + (isSelected ? 'var(--border-hover)' : 'var(--border)'),
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>{call.customer_name || 'Unknown'}</span>
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', background: cls.color + '20', color: cls.color, fontWeight: '600' }}>{cls.label}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {call.customer_phone} · {formatDuration(call.duration_seconds)}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {call.created_at ? new Date(call.created_at).toLocaleString() : ''}
                </div>
              </div>
            )
          })}
        </div>

        {selected ? (
          <div style={{ flex: 1 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>{selected.customer_name || 'Unknown'}</h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selected.customer_phone}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '20px', background: classifyCall(selected).color + '20', color: classifyCall(selected).color, fontWeight: '600' }}>
                    {classifyCall(selected).label}
                  </span>
                  <button
                    onClick={function() { setConfirmDelete('single') }}
                    style={{ padding: '6px 12px', background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: '8px', color: 'var(--accent-red)', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Duration', value: formatDuration(selected.duration_seconds) },
                  { label: 'Cost', value: selected.cost ? '$' + parseFloat(selected.cost).toFixed(3) : '$0' },
                  { label: 'Outcome', value: selected.outcome || '—' },
                  { label: 'Date', value: selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '—' },
                ].map(function(item) {
                  return (
                    <div key={item.label} style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{item.label}</div>
                      <div style={{ fontSize: '13px', fontWeight: '600', wordBreak: 'break-word' }}>{item.value}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: 'var(--accent)' }}>AI Summary</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                {selected.summary || 'No summary available for this call.'}
              </p>
            </div>

            {selected.recording_url ? (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>Recording</h3>
                <audio controls src={selected.recording_url} style={{ width: '100%' }} />
              </div>
            ) : null}

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '700' }}>Conversation</h3>
                {selected.transcript ? (
                  <button
                    onClick={handleCopyTranscript}
                    style={{
                      padding: '6px 14px',
                      background: copied ? 'rgba(0,255,148,0.1)' : 'var(--accent-dim)',
                      border: '1px solid ' + (copied ? 'var(--accent-green)' : 'var(--border-hover)'),
                      borderRadius: '8px',
                      color: copied ? 'var(--accent-green)' : 'var(--accent)',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {copied ? 'Copied!' : 'Copy Transcript'}
                  </button>
                ) : null}
              </div>
              {!selected.transcript ? (
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>No transcript available.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
                  {parseTranscript(selected.transcript).map(function(line) {
                    return (
                      <div key={line.id} style={{
                        alignSelf: line.speaker === 'agent' ? 'flex-start' : 'flex-end',
                        maxWidth: '75%',
                        padding: '10px 14px',
                        borderRadius: line.speaker === 'agent' ? '12px 12px 12px 4px' : '12px 12px 4px 12px',
                        background: line.speaker === 'agent' ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                        border: '1px solid ' + (line.speaker === 'agent' ? 'var(--border-hover)' : 'var(--border)'),
                        fontSize: '13px',
                        lineHeight: '1.6'
                      }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', color: line.speaker === 'agent' ? 'var(--accent)' : 'var(--text-muted)' }}>
                          {line.speaker === 'agent' ? 'Alexa' : 'Prospect'}
                        </div>
                        {line.text}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}