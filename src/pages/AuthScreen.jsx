import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import styles from './AuthScreen.module.css'

const ERROR_MSGS = {
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Wrong password.',
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/too-many-requests': 'Too many attempts. Try again in a bit.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/configuration-not-found': 'Firebase Authentication is not fully configured. Enable Email/Password sign-in and add this domain in Firebase.',
  'auth/operation-not-allowed': 'Email/password sign-in is disabled in Firebase. Enable it in Authentication > Sign-in method.',
}

const REMEMBERED_EMAIL_KEY = 'sentimo_remembered_email'
const REMEMBERED_EMAIL_MODE_KEY = 'sentimo_remembered_email_enabled'
const AUTH_FLASH_KEY = 'takda_auth_flash'

function safeGet(key, fallback = '') {
  try {
    const value = localStorage.getItem(key)
    return value == null ? fallback : value
  } catch {
    return fallback
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key)
  } catch {}
}

function setAuthFlash(payload) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(AUTH_FLASH_KEY, JSON.stringify(payload))
  } catch {}
}

function getEmailActionSettings() {
  if (typeof window === 'undefined') return undefined
  return {
    url: `${window.location.origin}/login`,
    handleCodeInApp: false,
  }
}

export default function AuthScreen() {
  const [tab, setTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState(() => ({
    name: '',
    email: safeGet(REMEMBERED_EMAIL_KEY, ''),
    password: '',
    confirm: '',
  }))
  const [rememberMe, setRememberMe] = useState(() => safeGet(REMEMBERED_EMAIL_MODE_KEY, 'true') !== 'false')
  const [showForgot, setShowForgot] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  async function handleLogin(e) {
    e.preventDefault()
    if (!form.email || !form.password) return setError('Enter your email and password.')
    setLoading(true); setError(''); setSuccess('')
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
      await signInWithEmailAndPassword(auth, form.email, form.password)
      if (rememberMe) {
        safeSet(REMEMBERED_EMAIL_KEY, form.email.trim())
        safeSet(REMEMBERED_EMAIL_MODE_KEY, 'true')
      } else {
        safeRemove(REMEMBERED_EMAIL_KEY)
        safeSet(REMEMBERED_EMAIL_MODE_KEY, 'false')
      }
      const message = 'Log in complete. Opening your dashboard...'
      setAuthFlash({ title: 'Welcome back', message })
      setSuccess(message)
    } catch (e) {
      setError(ERROR_MSGS[e.code] || e.message)
    } finally { setLoading(false) }
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) return setError('Enter your name, email, and password.')
    if (form.password !== form.confirm) return setError('Passwords do not match.')
    if (form.password.length < 6) return setError('Use at least 6 characters.')
    setLoading(true); setError(''); setSuccess('')
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      await updateProfile(cred.user, { displayName: form.name })
      try {
        await sendEmailVerification(cred.user, getEmailActionSettings())
      } catch {}
      const message = 'Sign up complete. Finish your setup below.'
      setAuthFlash({ title: 'Account created', message })
      setSuccess('Sign up complete. Opening setup...')
    } catch (e) {
      setError(ERROR_MSGS[e.code] || e.message)
    } finally { setLoading(false) }
  }

  async function handleReset(e) {
    e.preventDefault()
    if (!resetEmail) return setError('Enter your email.')
    setResetLoading(true); setError('')
    try {
      await sendPasswordResetEmail(auth, resetEmail)
      setSuccess('Reset link sent. Check your inbox.')
      setShowForgot(false)
      setResetEmail('')
    } catch (e) {
      setError(ERROR_MSGS[e.code] || 'Failed to send reset email.')
    } finally { setResetLoading(false) }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.logo}>Takda</div>
        <div className={styles.tagline}>Bawat piso, sinusubaybayan.</div>

        {!showForgot ? (
          <>
            <div className={styles.tabs}>
              <button className={`${styles.tab} ${tab === 'login' ? styles.active : ''}`} onClick={() => { setTab('login'); setError(''); setSuccess('') }}>Log in</button>
              <button className={`${styles.tab} ${tab === 'register' ? styles.active : ''}`} onClick={() => { setTab('register'); setError(''); setSuccess('') }}>Create account</button>
            </div>

            {error && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.successMsg}>{success}</div>}

            {tab === 'login' ? (
              <form onSubmit={handleLogin}>
                <div className={styles.field}><label>Email</label><input type="email" placeholder="juan@email.com" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" /></div>
                <div className={styles.field}>
                  <label>Password</label>
                  <div className={styles.passwordInputWrap}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword(current => !current)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <label className={styles.checkRow}>
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                  <span>Keep me signed in</span>
                </label>
                <button type="button" className={styles.forgotLink} onClick={() => { setShowForgot(true); setResetEmail(form.email); setError('') }}>Forgot password?</button>
                <button className={styles.btnPrimary} type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Log in'}</button>
                <p className={styles.legalNotice}>
                  By continuing, you agree to Takda&apos;s <Link className={styles.legalLink} to="/terms">Terms of Use</Link> and acknowledge the <Link className={styles.legalLink} to="/privacy">Privacy Policy</Link>.
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <div className={styles.field}><label>Full name</label><input type="text" placeholder="Juan dela Cruz" value={form.name} onChange={e => set('name', e.target.value)} autoComplete="name" /></div>
                <div className={styles.field}><label>Email</label><input type="email" placeholder="juan@email.com" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" /></div>
                <div className={styles.field}>
                  <label>Password</label>
                  <div className={styles.passwordInputWrap}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword(current => !current)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <div className={styles.field}>
                  <label>Confirm password</label>
                  <div className={styles.passwordInputWrap}>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.confirm}
                      onChange={e => set('confirm', e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowConfirm(current => !current)}
                      aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                      aria-pressed={showConfirm}
                    >
                      {showConfirm ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <button className={styles.btnPrimary} type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
                <p className={styles.legalNotice}>
                  By creating an account, you agree to Takda&apos;s <Link className={styles.legalLink} to="/terms">Terms of Use</Link> and acknowledge the <Link className={styles.legalLink} to="/privacy">Privacy Policy</Link>.
                </p>
              </form>
            )}
          </>
        ) : (
          <>
            <div className={styles.forgotTitle}>Reset password</div>
            <div className={styles.forgotSub}>Enter your email and we’ll send you a reset link.</div>
            {error && <div className={styles.error}>{error}</div>}
            <form onSubmit={handleReset}>
              <div className={styles.field}><label>Email</label><input type="email" placeholder="juan@email.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)} autoFocus /></div>
              <button className={styles.btnPrimary} type="submit" disabled={resetLoading}>{resetLoading ? 'Sending...' : 'Send reset link'}</button>
            </form>
            <button type="button" className={styles.backLink} onClick={() => { setShowForgot(false); setError('') }}>← Back to login</button>
          </>
        )}
      </div>
    </div>
  )
}
