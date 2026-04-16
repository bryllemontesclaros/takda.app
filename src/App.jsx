import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from './lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import AuthScreen from './pages/AuthScreen'
import AppShell from './pages/AppShell'
import Onboarding from './pages/Onboarding'
import LandingPage from './pages/LandingPage'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsPage from './pages/TermsPage'
import { PageLoader } from './components/Loading'
import AppFeedback from './components/AppFeedback'

const AUTH_FLASH_KEY = 'takda_auth_flash'

function consumeAuthFlash() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(AUTH_FLASH_KEY)
    if (!raw) return null
    window.sessionStorage.removeItem(AUTH_FLASH_KEY)
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function useAuth() {
  const [state, setState] = useState({ ready: false, user: null, isNew: false })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (u) {
        let isNew = false
        try {
          const snap = await getDoc(doc(db, 'users', u.uid, 'profile', 'main'))
          isNew = !snap.exists()
        } catch {}
        setState({ ready: true, user: u, isNew })
      } else {
        setState({ ready: true, user: null, isNew: false })
      }
    })
    return unsub
  }, [])

  return state
}

function AuthRoute() {
  const navigate = useNavigate()
  const { ready, user, isNew } = useAuth()
  const [authFlash, setAuthFlash] = useState(null)
  const [flashReady, setFlashReady] = useState(false)

  useEffect(() => {
    if (!ready) return
    if (!user) {
      setAuthFlash(null)
      setFlashReady(false)
      return
    }

    setAuthFlash(consumeAuthFlash())
    setFlashReady(true)
  }, [ready, user])

  useEffect(() => {
    if (ready && user && !isNew && flashReady) navigate('/app', { replace: true })
  }, [ready, user, isNew, flashReady, navigate])

  if (!ready || (user && !flashReady)) return <PageLoader />
  if (user && isNew) return <Onboarding user={user} notice={authFlash?.message || ''} onDone={() => navigate('/app', { replace: true })} />
  if (user) return <PageLoader title={authFlash?.title || 'Buhay'} message={authFlash?.message || 'Opening your account...'} />
  return <AuthScreen />
}

function ProtectedRoute() {
  const navigate = useNavigate()
  const { ready, user, isNew } = useAuth()

  useEffect(() => {
    if (ready && !user) navigate('/login', { replace: true })
  }, [ready, user, navigate])

  if (!ready) return <PageLoader />
  if (!user) return <PageLoader message="Redirecting to login..." />
  if (isNew) return <Onboarding user={user} onDone={() => navigate('/app', { replace: true })} />
  return <AppShell user={user} />
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthRoute />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/app" element={<ProtectedRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AppFeedback />
    </>
  )
}
