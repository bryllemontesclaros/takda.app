import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

const safeGet = (key, fallback) => { try { return localStorage.getItem(key) || fallback } catch { return fallback } }
const safeSet = (key, val) => { try { localStorage.setItem(key, val) } catch {} }

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => safeGet('sentimo_theme', 'light'))

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    safeSet('sentimo_theme', theme)
  }, [theme])

  function toggle() { setTheme(t => t === 'dark' ? 'light' : 'dark') }

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() { return useContext(ThemeContext) }
