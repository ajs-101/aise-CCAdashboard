import { useState, useEffect, useRef } from 'react'
import supabase from '../supabase'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import logo from '../logo.png'

export default function DailyReport() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const reportRef = useRef(null)

  useEffect(() => {
    fetchCallsForDate(selectedDate)
  }, [selectedDate])

  const fetchCallsForDate = async (dateStr) => {
    setLoading(true)
    // Filter calls created on selected date (local/UTC coverage)
    const startDate = `${dateStr}T00:00:00.000Z`
    const endDate = `${dateStr}T23:59:59.999Z`

    // Also fetch all calls to filter by local date string matching
    const { data } = await supabase
      .from('calls')
      .select('*')
      .order('created_at', { ascending: true })

    const dateFiltered = (data || []).filter(c => {
      if (!c.created_at) return false
      const cDate = new Date(c.created_at)
      const yr = cDate.getFullYear()
      const mo = String(cDate.getMonth() + 1).padStart(2, '0')
      const da = String(cDate.getDate()).padStart(2, '0')
      const localDateStr = `${yr}-${mo}-${da}`
      const utcDateStr = cDate.toISOString().split('T')[0]
      return localDateStr === dateStr || utcDateStr === dateStr
    })

    setCalls(dateFiltered)
    setLoading(false)
  }

  // Outcome helpers
  const categorizeCall = (c) => {
    const outcome = (c.outcome || '').toLowerCase()
    const duration = c.duration_seconds || 0

    if (outcome.includes('voicemail')) {
      return 'voicemail'
    }
    if (outcome.includes('busy')) {
      return 'busy'
    }
    if (outcome.includes('error') || outcome.includes('failed')) {
      return 'failed'
    }
    if (outcome.includes('no-answer') || outcome.includes('did-not-answer') || outcome.includes('silent') || outcome.includes('timed-out')) {
      return 'silent'
    }
    if (outcome.includes('customer-ended') || outcome.includes('assistant-ended') || duration > 0) {
      return 'picked_up'
    }
    return 'silent'
  }

  const totalCalls = calls.length
  const pickedUpCalls = calls.filter(c => categorizeCall(c) === 'picked_up')
  const voicemailCalls = calls.filter(c => categorizeCall(c) === 'voicemail')
  const busyCalls = calls.filter(c => categorizeCall(c) === 'busy')
  const silentCalls = calls.filter(c => categorizeCall(c) === 'silent')
  const failedCalls = calls.filter(c => categorizeCall(c) === 'failed')
  const otherCalls = calls.filter(c => categorizeCall(c) !== 'picked_up' && categorizeCall(c) !== 'voicemail')

  const calcPct = (cnt) => {
    if (totalCalls === 0) return '0.0%'
    return ((cnt / totalCalls) * 100).toFixed(1) + '%'
  }

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return ''
    const parts = dateStr.split('-')
    if (parts.length !== 3) return dateStr
    const d = new Date(parts[0], parts[1] - 1, parts[2])
    const day = d.getDate()
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    return `${day} ${monthNames[d.getMonth()]} ${d.getFullYear()} (${dayNames[d.getDay()]})`
  }

  const formatFooterDate = (dateStr) => {
    if (!dateStr) return ''
    const parts = dateStr.split('-')
    if (parts.length !== 3) return dateStr
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0s'
    if (seconds < 60) return `${Math.round(seconds)}s`
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
  }

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return
    setDownloading(true)
    try {
      const element = reportRef.current
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`Cold_Calling_Report_${selectedDate}.pdf`)
    } catch (err) {
      console.error('Failed to generate PDF:', err)
      alert('Could not generate PDF. You can also use the Print button to save as PDF.')
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div>
      {/* Control Bar (Hidden during printing) */}
      <div className="no-print" style={{
        marginBottom: '24px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '800', marginBottom: '4px' }}>
            Daily PDF Report Generator
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Generate executive-ready PDF summaries for management and seniors
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginRight: '8px', fontWeight: '600' }}>
              Select Date:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '8px 14px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'var(--font-body)',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            style={{
              padding: '10px 18px',
              background: downloading ? 'var(--accent-dim)' : 'var(--accent)',
              color: downloading ? 'var(--accent)' : '#070b14',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: downloading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0, 212, 255, 0.2)'
            }}
          >
            <span>📥</span> {downloading ? 'Generating PDF...' : 'Download PDF'}
          </button>

          <button
            onClick={handlePrint}
            style={{
              padding: '10px 18px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              color: 'var(--text-primary)',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>🖨️</span> Print / Save PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
          <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>
            Loading Report Data...
          </div>
        </div>
      ) : (
        /* PDF Preview Document Box */
        <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto', paddingBottom: '32px' }}>
          <div
            ref={reportRef}
            id="pdf-report-document"
            style={{
              width: '800px',
              minHeight: '1050px',
              background: '#ffffff',
              color: '#0f172a',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              padding: '36px 40px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
              borderRadius: '4px',
              boxSizing: 'border-box',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Background Company Watermark */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              zIndex: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-around',
              alignItems: 'center',
              overflow: 'hidden',
              padding: '80px 0',
            }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  opacity: 0.045,
                  transform: 'rotate(-28deg)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  userSelect: 'none',
                  margin: '40px 0'
                }}>
                  <img src={logo} alt="" style={{ width: '280px', height: 'auto', marginBottom: '8px' }} />
                  <div style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '6px', color: '#0f172a', textTransform: 'uppercase' }}>
                    AI SEARCH ENGINEERS
                  </div>
                </div>
              ))}
            </div>

            {/* Content Container (Above watermark) */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* 1. Header Card */}
              <div style={{
                background: '#0d1627',
                borderRadius: '12px',
                padding: '24px 30px',
                color: '#ffffff',
                marginBottom: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>
                    Cold Calling Report
                  </h1>
                  <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#38bdf8', fontWeight: '600' }}>
                    AI Search Engineers • Daily Summary • {formatDateDisplay(selectedDate)}
                  </p>
                </div>
                <img src={logo} alt="AISE Logo" style={{ height: '36px', objectFit: 'contain' }} />
              </div>

            {/* 2. KPI Cards Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '10px',
              marginBottom: '28px'
            }}>
              {[
                { label: 'TOTAL CALLS', value: totalCalls, color: '#2563eb' },
                { label: 'PICKED UP / ANSWERED', value: pickedUpCalls.length, color: '#16a34a' },
                { label: 'VOICEMAIL', value: voicemailCalls.length, color: '#0284c7' },
                { label: 'CUSTOMER BUSY', value: busyCalls.length, color: '#334155' },
                { label: 'SILENT / TIMED OUT', value: silentCalls.length, color: '#334155' },
                { label: 'FAILED (TECHNICAL)', value: failedCalls.length, color: '#334155' },
              ].map((kpi, idx) => (
                <div key={idx} style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px 8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: kpi.color, lineHeight: '1' }}>
                    {kpi.value}
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: '700', color: '#64748b', marginTop: '8px', letterSpacing: '0.4px', lineHeight: '1.2' }}>
                    {kpi.label}
                  </div>
                </div>
              ))}
            </div>

            {/* 3. Outcome Breakdown Table */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', letterSpacing: '0.5px', marginBottom: '10px' }}>
                OUTCOME BREAKDOWN
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#475569' }}>OUTCOME</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#475569', width: '100px' }}>CALLS</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#475569', width: '150px' }}>% OF TOTAL CALLS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: '600', color: '#1e293b' }}>Call Picked Up (Conversation / Answered)</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                        {pickedUpCalls.length}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{calcPct(pickedUpCalls.length)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', color: '#334155' }}>Went to Voicemail</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                        {voicemailCalls.length}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{calcPct(voicemailCalls.length)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', color: '#334155' }}>Connected but Silent (Timed Out)</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <span style={{ background: '#fef3c7', color: '#b45309', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                        {silentCalls.length}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{calcPct(silentCalls.length)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', color: '#334155' }}>Customer Busy</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <span style={{ background: '#ffedd5', color: '#c2410c', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                        {busyCalls.length}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{calcPct(busyCalls.length)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', color: '#334155' }}>Failed to Connect (Technical)</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <span style={{ background: '#ffe4e6', color: '#be123c', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                        {failedCalls.length}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{calcPct(failedCalls.length)}</td>
                  </tr>
                  <tr style={{ background: '#f8fafc', fontWeight: '800' }}>
                    <td style={{ padding: '12px 14px', color: '#0f172a' }}>Total</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#0f172a' }}>{totalCalls}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#0f172a' }}>100.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 4. Calls Picked Up by Customer */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', letterSpacing: '0.5px', marginBottom: '10px' }}>
                CALLS PICKED UP BY CUSTOMER • {pickedUpCalls.length} CALLS
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', width: '40px', fontWeight: '700', color: '#475569' }}>#</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#475569' }}>NAME</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#475569' }}>PHONE NUMBER</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#475569' }}>CALL DURATION</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#475569', width: '120px' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {pickedUpCalls.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                        No picked up calls on this date
                      </td>
                    </tr>
                  ) : (
                    pickedUpCalls.map((c, i) => (
                      <tr key={c.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{i + 1}</td>
                        <td style={{ padding: '10px 14px', fontWeight: '700', color: '#0f172a' }}>{c.customer_name || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#334155' }}>{c.customer_phone}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                          {formatDuration(c.duration_seconds)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: '700', padding: '3px 10px', borderRadius: '4px', fontSize: '10px', letterSpacing: '0.3px' }}>
                            COMPLETED
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 5. Conversation Summary • Who Picked Up & What Happened */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', letterSpacing: '0.5px', marginBottom: '12px' }}>
                CONVERSATION SUMMARY • WHO PICKED UP & WHAT HAPPENED
              </div>
              {pickedUpCalls.length === 0 ? (
                <div style={{ padding: '16px', color: '#94a3b8', fontStyle: 'italic', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  No conversation summaries recorded for picked up calls on this date.
                </div>
              ) : (
                pickedUpCalls.map((c, i) => (
                  <div key={c.id || i} style={{
                    marginBottom: '14px',
                    paddingLeft: '16px',
                    borderLeft: '3px solid #0284c7'
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                      {c.customer_name || 'Prospect'} <span style={{ color: '#64748b', fontWeight: '400' }}>• {c.customer_phone} • {formatDuration(c.duration_seconds)}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.6' }}>
                      {c.summary || 'Call connected. No detailed AI summary recorded for this session.'}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 6. Voicemail Table */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', letterSpacing: '0.5px', marginBottom: '10px' }}>
                VOICEMAIL • {voicemailCalls.length} CALLS
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', width: '40px', fontWeight: '700', color: '#475569' }}>#</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#475569' }}>NAME</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#475569' }}>PHONE NUMBER</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#475569' }}>DURATION</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#475569', width: '120px' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {voicemailCalls.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                        No voicemail calls on this date
                      </td>
                    </tr>
                  ) : (
                    voicemailCalls.map((c, i) => (
                      <tr key={c.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{i + 1}</td>
                        <td style={{ padding: '10px 14px', fontWeight: '700', color: '#0f172a' }}>{c.customer_name || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#334155' }}>{c.customer_phone}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                          {formatDuration(c.duration_seconds)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <span style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: '700', padding: '3px 10px', borderRadius: '4px', fontSize: '10px', letterSpacing: '0.3px' }}>
                            VOICEMAIL
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 7. Connected but Silent & Other Outcomes Table */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', letterSpacing: '0.5px', marginBottom: '10px' }}>
                CONNECTED BUT SILENT & OTHER OUTCOMES
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#475569' }}>NAME</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#475569' }}>PHONE NUMBER</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#475569' }}>DURATION</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#475569', width: '180px' }}>OUTCOME</th>
                  </tr>
                </thead>
                <tbody>
                  {otherCalls.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                        No silent, busy or failed calls on this date
                      </td>
                    </tr>
                  ) : (
                    otherCalls.map((c, i) => {
                      const cat = categorizeCall(c)
                      let bg = '#fef3c7'
                      let fg = '#b45309'
                      let label = 'CONNECTED BUT SILENT'

                      if (cat === 'busy') {
                        bg = '#ffedd5'
                        fg = '#c2410c'
                        label = 'CUSTOMER BUSY'
                      } else if (cat === 'failed') {
                        bg = '#ffe4e6'
                        fg = '#be123c'
                        label = 'FAILED TO CONNECT'
                      }

                      return (
                        <tr key={c.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', fontWeight: '700', color: '#0f172a' }}>{c.customer_name || '—'}</td>
                          <td style={{ padding: '10px 14px', color: '#334155' }}>{c.customer_phone}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                            {formatDuration(c.duration_seconds)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            <span style={{ background: bg, color: fg, fontWeight: '700', padding: '3px 10px', borderRadius: '4px', fontSize: '10px', letterSpacing: '0.3px' }}>
                              {label}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

              {/* 8. Footer */}
              <div style={{
                borderTop: '1px solid #e2e8f0',
                paddingTop: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                color: '#94a3b8',
                lineHeight: '1.4'
              }}>
                <div style={{ maxWidth: '600px' }}>
                  This report was compiled from the "Call Logs" and "Summaries" tabs of the dashboard (cold-call-agent.netlify.app), filtered to entries dated {formatFooterDate(selectedDate)}.
                </div>
                <div style={{ fontWeight: '600' }}>
                  Page 1 of 1
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
