'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const GROUPS = ['Semua', 'Key User (KU)', 'End User (EU)', 'Vendor (VD)']
const ORDER = ['Day 1','Day 2','Day 3','Day 4','Day 5','Survey']

const T = {
  id: {
    dashboard: 'Dashboard Trainer', logout: 'Keluar', newSession: '+ Buat Sesi Baru',
    all: 'Semua', sessions: 'sesi', active: 'Aktif', ended: 'Selesai', draft: 'Draft',
    edit: 'Edit & Mulai', manage: 'Kelola', delete: 'Hapus', code: 'Kode',
    sessionTitle: 'Judul Sesi', desc: 'Deskripsi (opsional)', create: 'Buat', cancel: 'Batal',
    noSessions: 'Belum ada sesi.', loading: 'Memuat...', login: 'Login Trainer GEP',
    register: 'Daftar Akun Trainer', emailLabel: 'Email', passLabel: 'Password',
    nameLabel: 'Nama Lengkap', loginBtn: 'Masuk', registerBtn: 'Daftar',
    switchToRegister: 'Belum punya akun? Daftar', switchToLogin: 'Sudah punya akun? Login',
    confirmEmail: 'Akun berhasil dibuat! Silakan login.',
  },
  en: {
    dashboard: 'Trainer Dashboard', logout: 'Logout', newSession: '+ New Session',
    all: 'All', sessions: 'sessions', active: 'Active', ended: 'Ended', draft: 'Draft',
    edit: 'Edit & Start', manage: 'Manage', delete: 'Delete', code: 'Code',
    sessionTitle: 'Session Title', desc: 'Description (optional)', create: 'Create', cancel: 'Cancel',
    noSessions: 'No sessions yet.', loading: 'Loading...', login: 'GEP Trainer Login',
    register: 'Create Trainer Account', emailLabel: 'Email', passLabel: 'Password',
    nameLabel: 'Full Name', loginBtn: 'Sign In', registerBtn: 'Register',
    switchToRegister: 'No account? Register', switchToLogin: 'Have an account? Login',
    confirmEmail: 'Account created! Please login now.',
  }
}

function getGroup(title: string) {
  if (title.startsWith('KU')) return 'Key User (KU)'
  if (title.startsWith('EU')) return 'End User (EU)'
  if (title.startsWith('VD')) return 'Vendor (VD)'
  return 'Other'
}

function getOrder(title: string) {
  for (let i = 0; i < ORDER.length; i++) {
    if (title.includes(ORDER[i])) return i
  }
  return 99
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [authError, setAuthError] = useState('')
  const [sessions, setSessions] = useState<any[]>([])
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [filter, setFilter] = useState('Semua')
  const [lang, setLang] = useState<'id' | 'en'>('id')
  const t = T[lang]

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
      if (data.user) fetchSessions()
    })
  }, [])

  async function fetchSessions() {
    const { data } = await supabase.from('sessions').select('*').order('created_at', { ascending: true })
    if (data) setSessions(data)
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthError('')
    if (isSignUp) {
      if (inviteCode !== 'GEP2026') { setAuthError('Kode undangan tidak valid.'); return }
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
      if (error) setAuthError(error.message)
      else setAuthError(t.confirmEmail)
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setAuthError(error.message)
      else { setUser(data.user); fetchSessions() }
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null); setSessions([])
  }

  async function createSession() {
    if (!newTitle.trim()) return
    const code = String(Math.floor(1000 + Math.random() * 9000))
    const { data, error } = await supabase.from('sessions').insert({ title: newTitle, description: newDesc, room_code: code, created_by: user.id, status: 'draft' }).select().single()
    if (!error && data) { setSessions([...sessions, data]); setNewTitle(''); setNewDesc(''); setCreating(false) }
  }

  async function masterReset() {
    const msg = lang === "id" 
      ? "RESET SEMUA SESI? Semua data peserta dan respons akan dihapus. Tindakan ini tidak dapat dibatalkan!" 
      : "RESET ALL SESSIONS? All participant data and responses will be deleted. This cannot be undone!"
    if (!window.confirm(msg)) return
    if (!window.confirm(lang === "id" ? "Yakin? Semua data latihan akan hilang!" : "Are you sure? All training data will be lost!")) return
    let count = 0
    for (const s of sessions) {
      await supabase.from("responses").delete().eq("session_id", s.id)
      await supabase.from("participants").delete().eq("session_id", s.id)
      await supabase.from("sessions").update({ status: "draft", current_question_index: 0, started_at: null, ended_at: null }).eq("id", s.id)
      count++
    }
    fetchSessions()
    alert(lang === "id" ? count + " sesi berhasil direset!" : count + " sessions reset successfully!")
  }

  async function resetSession(id: string) {
    const msg = lang === "id" ? "Reset sesi ini? Semua respons dan peserta akan dihapus." : "Reset this session? All responses and participants will be deleted."
    if (!window.confirm(msg)) return
    await supabase.from("responses").delete().eq("session_id", id)
    await supabase.from("participants").delete().eq("session_id", id)
    await supabase.from("sessions").update({ status: "draft", current_question_index: 0, started_at: null, ended_at: null }).eq("id", id)
    fetchSessions()
  }

  async function deleteSession(id: string) {
    if (!confirm(lang === 'id' ? 'Hapus sesi ini?' : 'Delete this session?')) return
    await supabase.from('sessions').delete().eq('id', id)
    setSessions(sessions.filter(s => s.id !== id))
  }

  const LangToggle = () => (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      <button onClick={() => setLang('id')} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${lang === 'id' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}>🇮🇩 Bahasa</button>
      <button onClick={() => setLang('en')} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${lang === 'en' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}>🇬🇧 English</button>
    </div>
  )

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">{t.loading}</div>

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold text-gray-800">{isSignUp ? t.register : t.login}</h1>
          <LangToggle />
        </div>
        <form onSubmit={handleAuth} className="space-y-3">
          {isSignUp && (<div><label className="label">{t.nameLabel}</label><input className="input" value={name} onChange={e => setName(e.target.value)} required /></div>)}
          {isSignUp && (<div><label className="label">{lang === 'id' ? 'Kode Undangan' : 'Invite Code'}</label><input className="input" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="GEP2026" required /></div>)}
          <div><label className="label">{t.emailLabel}</label><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@gep.com" required /></div>
          <div><label className="label">{t.passLabel}</label><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          {authError && <p className="text-sm text-red-600">{authError}</p>}
          <button type="submit" className="btn-primary w-full">{isSignUp ? t.registerBtn : t.loginBtn}</button>
        </form>
        <button onClick={() => { setIsSignUp(!isSignUp); setAuthError('') }} className="mt-4 text-sm text-blue-600 hover:underline w-full text-center">
          {isSignUp ? t.switchToLogin : t.switchToRegister}
        </button>
      </div>
    </div>
  )

  const allGroup = lang === 'id' ? 'Semua' : 'All'
  const filterGroups = [allGroup, 'Key User (KU)', 'End User (EU)', 'Vendor (VD)']

  const filtered = sessions
    .filter(s => filter === allGroup || filter === 'Semua' || filter === 'All' || getGroup(s.title) === filter)
    .sort((a, b) => {
      const gA = getGroup(a.title), gB = getGroup(b.title)
      if (gA !== gB) return gA.localeCompare(gB)
      return getOrder(a.title) - getOrder(b.title)
    })

  const grouped: Record<string, any[]> = {}
  filtered.forEach(s => {
    const g = getGroup(s.title)
    if (!grouped[g]) grouped[g] = []
    grouped[g].push(s)
  })

  return (
    <div className="max-w-4xl mx-auto p-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t.dashboard}</h1>
          <p className="text-gray-500 text-sm mt-1">{user.email}</p>
        </div>
        <div className="flex gap-2 items-center">
          <LangToggle />
          <button onClick={handleLogout} className="btn-secondary text-sm">{t.logout}</button>
        </div>
      </div>

      <div className="flex gap-3 items-center mb-6 flex-wrap">
        <button onClick={() => setCreating(!creating)} className="btn-primary">{t.newSession}</button>
        <button onClick={masterReset} className="text-xs px-3 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors font-medium">
          🔄 {lang === "id" ? "Reset Semua" : "Reset All"}
        </button>
        <div className="flex gap-2 flex-wrap">
          {filterGroups.map(g => (
            <button key={g} onClick={() => setFilter(g)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${(filter === g || (filter === 'Semua' && g === allGroup) || (filter === 'All' && g === allGroup)) ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {creating && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">{lang === 'id' ? 'Sesi Baru' : 'New Session'}</h2>
          <div className="space-y-3">
            <div><label className="label">{t.sessionTitle} *</label><input className="input" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="KU Day 1 — Project Request" /></div>
            <div><label className="label">{t.desc}</label><input className="input" value={newDesc} onChange={e => setNewDesc(e.target.value)} /></div>
            <div className="flex gap-2">
              <button onClick={createSession} className="btn-primary">{t.create}</button>
              <button onClick={() => setCreating(false)} className="btn-secondary">{t.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {Object.keys(grouped).length === 0 && <div className="card text-center text-gray-400 py-12">{t.noSessions}</div>}

      {Object.entries(grouped).map(([group, groupSessions]) => (
        <div key={group} className="mb-8">
          <h2 className="text-base font-semibold text-blue-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-700 inline-block"></span>
            {group}
            <span className="text-gray-400 font-normal text-sm">({groupSessions.length} {t.sessions})</span>
          </h2>
          <div className="space-y-2">
            {groupSessions.map(s => (
              <div key={s.id} className="card flex items-center gap-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-800 truncate">{s.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status === 'active' ? 'bg-green-100 text-green-700' : s.status === 'ended' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>
                      {s.status === 'active' ? t.active : s.status === 'ended' ? t.ended : t.draft}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-3">
                    <span>{t.code}: <strong className="text-blue-700 font-mono">{s.room_code}</strong></span>
                    {s.description && <span className="truncate">{s.description}</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Link href={'/admin/session/' + s.id} className="btn-primary text-sm py-1.5 px-3">
                    {s.status === 'draft' ? t.edit : t.manage}
                  </Link>
                  <button onClick={() => resetSession(s.id)} className="text-xs px-2 py-1.5 rounded-lg border border-amber-400 text-amber-600 hover:bg-amber-50 transition-colors">↺ Reset</button>
                  {s.status !== 'active' && (
                    <button onClick={() => deleteSession(s.id)} className="btn-danger text-sm py-1.5 px-3">{t.delete}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
// force Wed Jun 17 13:07:27 IST 2026
