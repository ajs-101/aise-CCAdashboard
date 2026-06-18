import { useState, useEffect } from 'react'
import supabase from '../supabase'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

export default function Messages() {
  const [conversations, setConversations] = useState([])
  const [selectedPhone, setSelectedPhone] = useState(null)
  const [thread, setThread] = useState([])
  const [callContext, setCallContext] = useState(null)
  const [loading, setLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [sendResult, setSendResult] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [newName, setNewName] = useState('')
  const [newFirm, setNewFirm] = useState('')
  const [newPractice, setNewPractice] = useState('')
  const [newCity, setNewCity] = useState('')

  useEffect(() => { fetchConversations() }, [])

  const fetchConversations = async () => {
    try {
      const res = await axios.get(API_URL + '/api/sms/conversations')
      setConversations(res.data.conversations || [])
    } catch (err) {
      const { data } = await supabase.from('messages').select('*').order('sent_at', { ascending: false })
      const convMap = new Map()
      ;(data || []).forEach(function(msg) {
        if (!convMap.has(msg.phone)) {
          convMap.set(msg.phone, { phone: msg.phone, firstName: msg.first_name, firmName: msg.firm_name, practiceArea: msg.practice_area, lastMessage: msg.message_body, lastStatus: msg.status, lastTime: msg.sent_at, count: 0 })
        }
        convMap.get(msg.phone).count++
      })
      setConversations(Array.from(convMap.values()))
    }
    setLoading(false)
  }

  const selectConversation = async (phone) => {
    setSelectedPhone(phone)
    setThreadLoading(true)
    setSendResult('')
    try {
      const res = await axios.get(API_URL + '/api/sms/conversation/' + encodeURIComponent(phone))
      setThread(res.data.messages || [])
      setCallContext(res.data.callContext || null)
    } catch (err) {
      const { data } = await supabase.from('messages').select('*').eq('phone', phone).order('sent_at', { ascending: true })
      setThread(data || [])
    }
    setThreadLoading(false)
  }

  const handleSend = async () => {
    if (!newMessage.trim()) return
    var phone = selectedPhone || newPhone
    if (!phone) return setSendResult('No phone number')
    setSending(true)
    setSendResult('')
    try {
      var conv = conversations.find(function(c) { return c.phone === phone })
      var res = await axios.post(API_URL + '/api/sms/send', {
        phone: phone,
        body: newMessage,
        firstName: conv ? conv.firstName : newName,
        firmName: conv ? conv.firmName : newFirm,
        practiceArea: conv ? conv.practiceArea : newPractice
      })
      if (res.data.status === 'sent') {
        setSendResult('sent')
        setNewMessage('')
        if (selectedPhone) { selectConversation(selectedPhone) }
        else {
          setShowNew(false)
          setSelectedPhone(phone)
          selectConversation(phone)
        }
        fetchConversations()
      } else {
        setSendResult(res.data.error || 'Failed to send')
      }
    } catch (err) {
      setSendResult('Failed — is the backend running?')
    }
    setSending(false)
  }

  const handleAISuggest = async () => {
    setSuggesting(true)
    var conv = conversations.find(function(c) { return c.phone === selectedPhone })
    try {
      var res = await axios.post(API_URL + '/api/sms/ai-suggest', {
        phone: selectedPhone,
        firstName: conv ? conv.firstName : newName,
        firmName: conv ? conv.firmName : newFirm,
        practiceArea: conv ? conv.practiceArea : newPractice,
        city: newCity,
        callSummary: callContext ? callContext.summary : '',
        previousMessages: thread.map(function(m) { return m.message_body }).join('\n')
      })
      if (res.data.suggestion) {
        setNewMessage(res.data.suggestion)
      }
    } catch (err) {
      console.log('AI suggest failed')
    }
    setSuggesting(false)
  }

  var getStatusColor = function(status) {
    if (status === 'sent') return 'var(--accent-green)'
    if (status === 'failed') return 'var(--accent-red)'
    return 'var(--accent-yellow)'
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>Loading...</div>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '800', marginBottom: '4px' }}>Messages</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>SMS conversations with prospects</p>
        </div>
        <button onClick={function() { setShowNew(true); setSelectedPhone(null) }} style={{ padding: '10px 20px', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: '#070b14', fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-display)', cursor: 'pointer' }}>
          + New Message
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 140px)' }}>

        <div style={{ width: '300px', flexShrink: 0, overflowY: 'auto' }}>
          {conversations.length === 0 && !showNew ? (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '30px', marginBottom: '10px' }}>💬</div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>No conversations yet</p>
            </div>
          ) : conversations.map(function(conv) {
            return (
              <div
                key={conv.phone}
                onClick={function() { selectConversation(conv.phone); setShowNew(false) }}
                style={{
                  background: selectedPhone === conv.phone ? 'var(--accent-dim)' : 'var(--bg-card)',
                  border: '1px solid ' + (selectedPhone === conv.phone ? 'var(--border-hover)' : 'var(--border)'),
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>{conv.firstName || 'Unknown'}</span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: getStatusColor(conv.lastStatus) + '20', color: getStatusColor(conv.lastStatus) }}>{conv.count}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{conv.phone}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.lastMessage}</div>
              </div>
            )
          })}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>

          {showNew && !selectedPhone ? (
            <div style={{ padding: '24px', flex: 1 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>New Message</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
                <input type="text" placeholder="Phone (+12125551234)" value={newPhone} onChange={function(e) { setNewPhone(e.target.value) }} style={{ padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }} />
                <input type="text" placeholder="First name" value={newName} onChange={function(e) { setNewName(e.target.value) }} style={{ padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }} />
                <input type="text" placeholder="Firm name" value={newFirm} onChange={function(e) { setNewFirm(e.target.value) }} style={{ padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }} />
                <input type="text" placeholder="Practice area" value={newPractice} onChange={function(e) { setNewPractice(e.target.value) }} style={{ padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }} />
                <input type="text" placeholder="City" value={newCity} onChange={function(e) { setNewCity(e.target.value) }} style={{ padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }} />
              </div>
              <div style={{ marginTop: '20px' }}>
                <textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={function(e) { setNewMessage(e.target.value) }}
                  rows={3}
                  style={{ width: '100%', maxWidth: '400px', padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button onClick={handleSend} disabled={sending} style={{ padding: '10px 24px', background: sending ? 'var(--accent-dim)' : 'var(--accent)', border: 'none', borderRadius: '10px', color: sending ? 'var(--accent)' : '#070b14', fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-display)', cursor: sending ? 'not-allowed' : 'pointer' }}>
                    {sending ? 'Sending...' : 'Send SMS'}
                  </button>
                  <button onClick={function() { setShowNew(false) }} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                </div>
                {sendResult ? <p style={{ fontSize: '12px', marginTop: '8px', color: sendResult === 'sent' ? 'var(--accent-green)' : 'var(--accent-red)' }}>{sendResult === 'sent' ? 'Message sent!' : sendResult}</p> : null}
              </div>
            </div>

          ) : selectedPhone ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: '700' }}>
                    {(conversations.find(function(c) { return c.phone === selectedPhone }) || {}).firstName || 'Unknown'}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '10px' }}>{selectedPhone}</span>
                </div>
                {callContext ? (
                  <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '12px', background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                    Call: {callContext.outcome}
                  </span>
                ) : null}
              </div>

              {callContext && callContext.summary ? (
                <div style={{ padding: '12px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-muted)' }}>Call Summary: </strong>{callContext.summary}
                </div>
              ) : null}

              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {threadLoading ? (
                  <div style={{ textAlign: 'center', color: 'var(--accent)', padding: '20px' }}>Loading...</div>
                ) : thread.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px', fontSize: '14px' }}>No messages yet</div>
                ) : thread.map(function(msg) {
                  return (
                    <div key={msg.id} style={{ alignSelf: 'flex-start', maxWidth: '75%' }}>
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: '12px 12px 12px 4px',
                        background: msg.type === 'automated' ? 'rgba(167,139,250,0.1)' : 'var(--accent-dim)',
                        border: '1px solid ' + (msg.type === 'automated' ? 'rgba(167,139,250,0.2)' : 'var(--border-hover)'),
                        fontSize: '13px',
                        lineHeight: '1.6'
                      }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', color: msg.type === 'automated' ? '#a78bfa' : 'var(--accent)' }}>
                          {msg.type === 'automated' ? 'Auto' : 'Manual'} · {msg.status}
                        </div>
                        {msg.message_body}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', paddingLeft: '4px' }}>
                        {msg.sent_at ? new Date(msg.sent_at).toLocaleString() : ''}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <textarea
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={function(e) { setNewMessage(e.target.value) }}
                  rows={2}
                  style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-body)', outline: 'none', resize: 'none' }}
                />
                <button onClick={handleAISuggest} disabled={suggesting} style={{ padding: '10px 14px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '10px', color: '#a78bfa', fontSize: '12px', fontWeight: '600', cursor: suggesting ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                  {suggesting ? '...' : 'AI Suggest'}
                </button>
                <button onClick={handleSend} disabled={sending || !newMessage.trim()} style={{ padding: '10px 20px', background: sending || !newMessage.trim() ? 'var(--accent-dim)' : 'var(--accent)', border: 'none', borderRadius: '10px', color: sending || !newMessage.trim() ? 'var(--accent)' : '#070b14', fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-display)', cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer' }}>
                  {sending ? '...' : 'Send'}
                </button>
              </div>
              {sendResult && sendResult !== 'sent' ? (
                <div style={{ padding: '0 24px 12px', fontSize: '12px', color: 'var(--accent-red)' }}>{sendResult}</div>
              ) : null}
            </div>

          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>Select a conversation</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>or click "+ New Message" to start one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}