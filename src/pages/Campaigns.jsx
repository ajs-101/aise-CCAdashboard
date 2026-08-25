import { useState } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://aise-cold-caller-production.up.railway.app'

export default function Campaigns() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const [delaySeconds, setDelaySeconds] = useState(5)
  const [respectHours, setRespectHours] = useState(true)

  const [testPhone, setTestPhone] = useState('')
  const [testName, setTestName] = useState('')
  const [testPractice, setTestPractice] = useState('')
  const [testCity, setTestCity] = useState('')
  const [testDesignation, setTestDesignation] = useState('')
  const [testCompany, setTestCompany] = useState('')
  const [testCalling, setTestCalling] = useState(false)
  const [testResult, setTestResult] = useState('')

  const handleTestCall = async () => {
    if (!testPhone) return setTestResult('Phone number is required')
    if (!testPhone.startsWith('+')) return setTestResult('Phone must start with + and country code')
    setTestCalling(true)
    setTestResult('')
    try {
      const res = await axios.post(API_URL + '/make-call', {
        phone: testPhone,
        firstName: testName || 'there',
        designation: testDesignation || '',
        companyName: testCompany || '',
        practiceArea: testPractice || 'attorney',
        city: testCity || 'your area'
      })
      if (res.data.status === 'queued') {
        setTestResult('✅ Call queued successfully — phone should ring shortly!')
      } else {
        setTestResult('Status: ' + (res.data.status || JSON.stringify(res.data)))
      }
    } catch (err) {
      setTestResult('❌ Failed to make call. Make sure backend is running.')
    }
    setTestCalling(false)
  }

  const handleFileChange = function(e) {
    const selected = e.target.files[0]
    if (selected && selected.name.endsWith('.csv')) {
      setFile(selected)
      setError('')
    } else {
      setError('Please upload a CSV file only')
    }
  }

  const handleDrop = function(e) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && dropped.name.endsWith('.csv')) {
      setFile(dropped)
      setError('')
    } else {
      setError('Please upload a CSV file only')
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setResults(null)
    setError('')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('delaySeconds', delaySeconds)
    formData.append('respectHours', respectHours)
    try {
      const res = await axios.post(API_URL + '/api/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (res.data.success === false) {
        setError(res.data.error || 'Campaign failed')
      } else {
        setResults(res.data)
      }
    } catch (err) {
      setError('Failed to upload. Make sure the backend is running.')
    }
    setUploading(false)
  }

  var getStatusColor = function(status) {
    if (status === 'queued') return 'var(--accent-green)'
    if (status === 'failed') return 'var(--accent-red)'
    if (status === 'dnc-blocked') return 'var(--accent-red)'
    if (status === 'skipped' || status === 'stopped-outside-hours') return 'var(--accent-yellow)'
    return 'var(--accent)'
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '800', marginBottom: '4px' }}>Campaigns</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Test a single call or upload a CSV to start a campaign</p>
      </div>

      {/* Test Single Call */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--accent)' }}>Test Single Call</h3>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <input type="text" placeholder="+12125551234" value={testPhone} onChange={function(e) { setTestPhone(e.target.value) }} style={{ flex: '1 1 150px', padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }} />
          <input type="text" placeholder="First name" value={testName} onChange={function(e) { setTestName(e.target.value) }} style={{ flex: '1 1 120px', padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }} />
          <input type="text" placeholder="Designation" value={testDesignation} onChange={function(e) { setTestDesignation(e.target.value) }} style={{ flex: '1 1 130px', padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }} />
          <input type="text" placeholder="Company name" value={testCompany} onChange={function(e) { setTestCompany(e.target.value) }} style={{ flex: '1 1 140px', padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }} />
          <input type="text" placeholder="Practice area" value={testPractice} onChange={function(e) { setTestPractice(e.target.value) }} style={{ flex: '1 1 140px', padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }} />
          <input type="text" placeholder="City" value={testCity} onChange={function(e) { setTestCity(e.target.value) }} style={{ flex: '1 1 120px', padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }} />
          <button onClick={handleTestCall} disabled={testCalling} style={{ padding: '10px 24px', background: testCalling ? 'var(--accent-dim)' : 'var(--accent)', border: 'none', borderRadius: '10px', color: testCalling ? 'var(--accent)' : '#070b14', fontSize: '14px', fontWeight: '700', fontFamily: 'var(--font-display)', cursor: testCalling ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
            {testCalling ? 'Calling...' : 'Call Now'}
          </button>
        </div>
        {testResult ? (
          <p style={{ fontSize: '13px', color: testResult.includes('✅') ? 'var(--accent-green)' : 'var(--accent-red)', marginTop: '8px' }}>{testResult}</p>
        ) : null}
      </div>

      {/* Campaign Settings */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--accent)' }}>Campaign Settings</h3>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Delay between calls (seconds)</label>
            <input type="number" min="2" max="300" value={delaySeconds} onChange={function(e) { setDelaySeconds(e.target.value) }} style={{ width: '120px', padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none' }} />
          </div>
          <div onClick={function() { setRespectHours(!respectHours) }} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginTop: '18px' }}>
            <div style={{ width: '40px', height: '22px', borderRadius: '20px', background: respectHours ? 'var(--accent)' : 'var(--bg-secondary)', border: '1px solid var(--border)', position: 'relative', transition: 'all 0.2s' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: respectHours ? '#070b14' : 'var(--text-muted)', position: 'absolute', top: '2px', left: respectHours ? '20px' : '3px', transition: 'all 0.2s' }} />
            </div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Only call during US business hours (9am–5pm EST, Mon–Fri)</span>
          </div>
        </div>
      </div>

      {/* CSV Format guide */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--accent)' }}>CSV Format Required</h3>
        <code style={{ display: 'block', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', color: 'var(--accent-green)', fontFamily: 'monospace', lineHeight: '1.6' }}>
          phone,firstName,lastName,designation,companyName,firmName,practiceArea,city
          <br />
          +12125551234,John,Smith,Managing Partner,Smith & Associates,Smith Law,Estate Planning,New York
        </code>
      </div>

      {/* Upload area */}
      <div
        onDragOver={function(e) { e.preventDefault(); setDragOver(true) }}
        onDragLeave={function() { setDragOver(false) }}
        onDrop={handleDrop}
        style={{ background: dragOver ? 'var(--accent-dim)' : 'var(--bg-card)', border: '2px dashed ' + (dragOver ? 'var(--accent)' : 'var(--border)'), borderRadius: '16px', padding: '48px', textAlign: 'center', marginBottom: '24px', transition: 'all 0.2s', cursor: 'pointer' }}
        onClick={function() { document.getElementById('csv-input').click() }}
      >
        <input id="csv-input" type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>📂</div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>
          {file ? file.name : 'Drop your CSV here or click to browse'}
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          {file ? (file.size / 1024).toFixed(1) + ' KB ready to upload' : 'Supports .csv files only'}
        </p>
      </div>

      {error ? (
        <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid var(--accent-red)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: 'var(--accent-red)', fontSize: '14px' }}>{error}</div>
      ) : null}

      <button onClick={handleUpload} disabled={!file || uploading} style={{ padding: '14px 32px', background: !file || uploading ? 'var(--accent-dim)' : 'var(--accent)', border: 'none', borderRadius: '10px', color: !file || uploading ? 'var(--accent)' : '#070b14', fontSize: '14px', fontWeight: '700', fontFamily: 'var(--font-display)', cursor: !file || uploading ? 'not-allowed' : 'pointer', marginBottom: '32px', transition: 'all 0.2s' }}>
        {uploading ? 'Calling leads...' : 'Start Campaign'}
      </button>

      {results ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: '700' }}>Campaign Results</h2>
            <span style={{ background: 'var(--accent-dim)', color: 'var(--accent)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
              {results.total} leads · {results.called || 0} called · {results.blocked || 0} blocked
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                {['Name', 'Phone', 'Call ID', 'Status'].map(function(h) {
                  return <th key={h} style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                })}
              </tr>
            </thead>
            <tbody>
              {results.results.map(function(r, i) {
                return (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '14px 24px', fontSize: '14px', fontWeight: '500' }}>{r.firstName || '—'}</td>
                    <td style={{ padding: '14px 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>{r.phone}</td>
                    <td style={{ padding: '14px 24px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.callId ? r.callId.substring(0, 16) + '...' : '—'}</td>
                    <td style={{ padding: '14px 24px' }}>
                      <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: getStatusColor(r.status) + '20', color: getStatusColor(r.status), fontWeight: '500' }}>{r.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}