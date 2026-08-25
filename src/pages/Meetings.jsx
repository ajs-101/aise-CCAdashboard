import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://aise-cold-caller-production.up.railway.app'

export default function Meetings() {
  const [meetings, setMeetings] = useState([])
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [bookingName, setBookingName] = useState('')
  const [bookingEmail, setBookingEmail] = useState('')
  const [bookingPhone, setBookingPhone] = useState('')
  const [booking, setBooking] = useState(false)
  const [bookingResult, setBookingResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [meetingsRes, slotsRes] = await Promise.all([
        axios.get(`${API_URL}/api/calendly/meetings`),
        axios.get(`${API_URL}/api/calendly/slots`)
      ])
      setMeetings(meetingsRes.data.meetings || [])
      setSlots(slotsRes.data.slots || [])
    } catch (err) {
      setError('Failed to load data')
    }
    setLoading(false)
  }

  const handleBook = async () => {
    if (!bookingName || !bookingEmail) return setError('Name and email are required')
    setBooking(true)
    setError('')
    try {
      const res = await axios.post(`${API_URL}/api/calendly/book`, {
        name: bookingName,
        email: bookingEmail,
        phone: bookingPhone,
        eventTypeUri: 'https://api.calendly.com/event_types/e8ba2f42-edaa-4e27-950a-92dc4d34b85c'
      })
      setBookingResult(res.data)
      setBookingName('')
      setBookingEmail('')
      setBookingPhone('')
    } catch (err) {
      setError('Failed to create booking')
    }
    setBooking(false)
  }

  const getStatusColor = (status) => {
    if (status === 'active') return 'var(--accent-green)'
    if (status === 'canceled') return 'var(--accent-red)'
    return 'var(--accent-yellow)'
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>Loading...</div>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '800', marginBottom: '4px' }}>Meetings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Book and manage strategy calls</p>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--accent)' }}>Create Booking Link</h3>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <input type="text" placeholder="Prospect name" value={bookingName} onChange={e => setBookingName(e.target.value)} style={{ flex: '1 1 150px', padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }} />
          <input type="email" placeholder="Email address" value={bookingEmail} onChange={e => setBookingEmail(e.target.value)} style={{ flex: '1 1 150px', padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }} />
          <input type="text" placeholder="Phone (optional)" value={bookingPhone} onChange={e => setBookingPhone(e.target.value)} style={{ flex: '1 1 150px', padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }} />
          <button onClick={handleBook} disabled={booking} style={{ padding: '10px 24px', background: booking ? 'var(--accent-dim)' : 'var(--accent)', border: 'none', borderRadius: '10px', color: booking ? 'var(--accent)' : '#070b14', fontSize: '14px', fontWeight: '700', fontFamily: 'var(--font-display)', cursor: booking ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
            {booking ? 'Creating...' : 'Create Link'}
          </button>
        </div>
        {error && <p style={{ color: 'var(--accent-red)', fontSize: '13px', marginTop: '8px' }}>{error}</p>}
        {bookingResult && (
          <div style={{ marginTop: '12px', padding: '12px 16px', background: 'rgba(0,255,148,0.05)', border: '1px solid var(--accent-green)', borderRadius: '10px' }}>
            <p style={{ color: 'var(--accent-green)', fontSize: '13px', marginBottom: '8px' }}>Booking link created!</p>
            <a href={bookingResult.bookingLink} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: '13px', wordBreak: 'break-all' }}>{bookingResult.bookingLink}</a>
          </div>
        )}
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>Available Slots This Week</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {slots.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No available slots</p>
          ) : slots.map((slot, i) => (
            <span key={i} style={{ padding: '6px 14px', background: 'var(--accent-dim)', border: '1px solid var(--border-hover)', borderRadius: '20px', fontSize: '12px', color: 'var(--accent)', fontWeight: '500' }}>{slot.formatted}</span>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: '700' }}>Booked Meetings</h2>
          <span style={{ background: 'var(--accent-dim)', color: 'var(--accent)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>{meetings.length} total</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              {['Meeting', 'Date & Time', 'Status'].map(h => (
                <th key={h} style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {meetings.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>No meetings booked yet</td></tr>
            ) : meetings.map((meeting, i) => (
              <tr key={meeting.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                <td style={{ padding: '14px 24px', fontSize: '14px', fontWeight: '500' }}>{meeting.name}</td>
                <td style={{ padding: '14px 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>{meeting.formatted}</td>
                <td style={{ padding: '14px 24px' }}>
                  <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: `${getStatusColor(meeting.status)}20`, color: getStatusColor(meeting.status), fontWeight: '500' }}>{meeting.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}