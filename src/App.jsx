import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Campaigns from './pages/Campaigns'
import CallLogs from './pages/CallLogs'
import DoNotCall from './pages/DoNotCall'
import Meetings from './pages/Meetings'
import Layout from './components/Layout'
import Summaries from './pages/Summaries'
import Messages from './pages/Messages'
import VoicemailRetries from './pages/VoicemailRetries'
import DailyReport from './pages/DailyReport'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('aise_auth') === 'true'
  )

  const login = (user, pass) => {
    if (user === 'AISEofficial' && pass === 'thisisthenewworld') {
      localStorage.setItem('aise_auth', 'true')
      setIsAuthenticated(true)
      return true
    }
    return false
  }

  const logout = () => {
    localStorage.removeItem('aise_auth')
    setIsAuthenticated(false)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" /> : <Login onLogin={login} />
        } />
        <Route path="/" element={
          isAuthenticated ? <Layout onLogout={logout} /> : <Navigate to="/login" />
        }>
          <Route index element={<Dashboard />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="calls" element={<CallLogs />} />
          <Route path="meetings" element={<Meetings />} />
          <Route path="retries" element={<VoicemailRetries />} />
          <Route path="dnc" element={<DoNotCall />} />
          <Route path="summaries" element={<Summaries />} />
          <Route path="messages" element={<Messages />} />
          <Route path="report" element={<DailyReport />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}