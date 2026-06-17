'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const LangContext = createContext<any>(null)

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<'id' | 'en'>('id')

  useEffect(() => {
    const saved = localStorage.getItem('gep-lang') as 'id' | 'en'
    if (saved) setLangState(saved)
  }, [])

  function setLang(l: 'id' | 'en') {
    setLangState(l)
    localStorage.setItem('gep-lang', l)
  }

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) return { lang: 'id' as const, setLang: (_: any) => {} }
  return ctx
}

export const LangToggle = () => {
  const { lang, setLang } = useLang()
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      <button onClick={() => setLang('id')} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${lang === 'id' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}>🇮🇩 Bahasa</button>
      <button onClick={() => setLang('en')} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${lang === 'en' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}>🇬🇧 English</button>
    </div>
  )
}
