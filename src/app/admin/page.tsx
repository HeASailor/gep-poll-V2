'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useLang, LangToggle } from '@/lib/lang'

const T = {
  id: {
    dashboard: 'Dashboard', logout: 'Keluar', newSession: '+ Sesi Baru',
    resetAll: 'Reset Semua', noSessions: 'Belum ada sesi.',
    active: 'Aktif', ended: 'Selesai', draft: 'Draft',
    manage: 'Kelola', delete: 'Hapus', code: 'Kode',
    login: 'Login Trainer', register: 'Daftar Akun',
    emailLabel: 'Email', passLabel: 'Password', nameLabel: 'Nama Lengkap',
    inviteLabel: 'Kode Undangan', clientLabel: 'Nama Klien / Proyek',
    clientPlaceholder: 'e.g. Pertamina, Grab, Siemens Energy',
    loginBtn: 'Masuk', registerBtn: 'Daftar',
    switchToRegister: 'Belum punya akun? Daftar',
    switchToLogin: 'Sudah punya akun? Login',
    confirmEmail: 'Akun dibuat! Silakan login.',
    allSessions: 'Semua Sesi', loading: 'Memuat...',
    resetConfirm: 'Reset semua sesi? Data akan dihapus.',
    welcome: 'Selamat datang',
    yourWorkspace: 'Workspace Anda',
    createFirst: 'Buat sesi pertama Anda',
    sessionsCount: 'sesi',
  },
  en: {
    dashboard: 'Dashboard', logout: 'Logout', newSession: '+ New Session',
    resetAll: 'Reset All', noSessions: 'No sessions yet.',
    active: 'Active', ended: 'Ended', draft: 'Draft',
    manage: 'Manage', delete: 'Delete', code: 'Code',
    login: 'Trainer Login', register: 'Create Account',
    emailLabel: 'Email', passLabel: 'Password', nameLabel: 'Full Name',
    inviteLabel: 'Invite Code', clientLabel: 'Client / Project Name',
    clientPlaceholder: 'e.g. Pertamina, Grab, Siemens Energy',
    loginBtn: 'Login', registerBtn: 'Register',
    switchToRegister: "Don't have an account? Register",
    switchToLogin: 'Already have an account? Login',
    confirmEmail: 'Account created! Please login.',
    allSessions: 'All Sessions', loading: 'Loading...',
    resetConfirm: 'Reset all sessions? All data will be cleared.',
    welcome: 'Welcome back',
    yourWorkspace: 'Your Workspace',
    createFirst: 'Create your first session',
    sessionsCount: 'sessions',
  }
}

const ACCENT_COLORS = [
  '#E21B3C', '#1368CE', '#26890C', '#7C3AED',
  '#DB2777', '#D97706', '#0891B2', '#059669'
]

function getOrgColor(name: string) {
  const idx = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % ACCENT_COLORS.length
  return ACCENT_COLORS[idx]
}

function Avatar({ name, size = 36 }: { name: string, size?: number }) {
  const color = getOrgColor(name)
  const initials = name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div style={{width: size, height: size, borderRadius: size/3, backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: size * 0.38, flexShrink: 0}}>
      {initials}
    </div>
  )
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [org, setOrg] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [orgName, setOrgName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [filter, setFilter] = useState('all')
  const [activeGroups, setActiveGroups] = useState<string[]>([])
  const { lang } = useLang()
  const t = T[lang as keyof typeof T]

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser(data.user)
        await loadProfile(data.user.id)
      }
      setLoading(false)
    })
  }, [])

  async function loadProfile(uid: string) {
    const { data: p } = await supabase.from('profiles').select('*, organizations(*)').eq('id', uid).maybeSingle()
    if (p) {
      setProfile(p)
      setOrg(p.organizations)
      await fetchSessions(p.organization_id)
    } else {
      await fetchSessions(null)
    }
  }

  async function fetchSessions(oid: string | null) {
    let query = supabase.from('sessions').select('*').order('created_at', { ascending: true })
    if (oid) query = query.eq('organization_id', oid)
    const { data } = await query
    if (data) {
      setSessions(data)
      // Build dynamic groups from session titles
      const groups = new Set<string>()
      data.forEach((s: any) => {
        const match = s.title?.match(/^([^|]+)\|/)
        if (match) groups.add(match[1].trim())
        else if (s.batch_type) groups.add(s.batch_type)
      })
      setActiveGroups(Array.from(groups))
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthError('')
    if (isSignUp) {
      if (inviteCode !== 'GEP2026') { setAuthError(lang === 'id' ? 'Kode undangan tidak valid.' : 'Invalid invite code.'); return }
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
      if (error) { setAuthError(error.message); return }
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) { setAuthError(t.confirmEmail); return }
      // Create org
      if (orgName.trim()) {
        const slug = orgName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
        // Check if org already exists
        const { data: existingOrg } = await supabase.from('organizations').select('*').eq('slug', slug).maybeSingle()
        let finalOrg = existingOrg
        if (!finalOrg) {
          const { data: newOrg } = await supabase.from('organizations').insert({ name: orgName.trim(), slug }).select().single()
          finalOrg = newOrg
        }
        if (finalOrg) {
          await supabase.from('profiles').upsert({ id: data.user.id, organization_id: finalOrg.id, full_name: name })
          setOrg(finalOrg)
        }
      }
      setUser(data.user)
      await loadProfile(data.user.id)
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setAuthError(error.message); return }
      setUser(data.user)
      await loadProfile(data.user.id)
    }
  }

  async function createSession() {
    if (!newTitle.trim() || !user) return
    setCreating(true)
    const room_code = String(Math.floor(1000 + Math.random() * 9000))
    const { data } = await supabase.from('sessions').insert({
      title: newTitle.trim(), description: newDesc.trim(),
      status: 'draft', current_question_index: 0,
      room_code, created_by: user.id,
      organization_id: org?.id || null
    }).select().single()
    if (data) { setSessions(prev => [...prev, data]); setNewTitle(''); setNewDesc('') }
    setCreating(false)
  }

  async function resetSession(id: string) {
    await supabase.from('responses').delete().eq('session_id', id)
    await supabase.from('participants').delete().eq('session_id', id)
    const nc = String(Math.floor(1000 + Math.random() * 9000))
    await supabase.from('sessions').update({ status: 'draft', current_question_index: 0, started_at: null, ended_at: null, timer_started_at: null, room_code: nc }).eq('id', id)
    await fetchSessions(org?.id || null)
  }

  async function deleteSession(id: string) {
    if (!confirm(lang === 'id' ? 'Hapus sesi ini?' : 'Delete this session?')) return
    await supabase.from('responses').delete().eq('session_id', id)
    await supabase.from('participants').delete().eq('session_id', id)
    await supabase.from('questions').delete().eq('session_id', id)
    await supabase.from('sessions').delete().eq('id', id)
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  async function resetAll() {
    if (!confirm(t.resetConfirm)) return
    for (const s of sessions) { await resetSession(s.id) }
  }

  const filteredSessions = filter === 'all' ? sessions : sessions.filter((s: any) => {
    const match = s.title?.match(/^([^|]+)\|/)
    const group = match ? match[1].trim() : ''
    return group === filter
  })

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:'#070B14'}}>
      <div style={{color:'white',opacity:0.5}}>Loading...</div>
    </div>
  )

  if (!user) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:'#070B14',padding:'24px'}}>
      <div style={{width:'100%',maxWidth:'400px'}}>
        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:'40px'}}>
          <div style={{width:'48px',height:'48px',borderRadius:'14px',background:'linear-gradient(135deg,#E21B3C,#1368CE)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px',fontWeight:900,color:'white',margin:'0 auto 16px'}}>T</div>
          <h1 style={{color:'white',fontSize:'24px',fontWeight:800,margin:'0 0 4px',letterSpacing:'-0.5px'}}>GEP TrainIQ</h1>
          <p style={{color:'rgba(255,255,255,0.4)',fontSize:'14px',margin:0}}>{isSignUp ? t.register : t.login}</p>
        </div>

        <div style={{backgroundColor:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'32px'}}>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'20px'}}><LangToggle /></div>
          <form onSubmit={handleAuth} style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            {isSignUp && (
              <div>
                <label style={{display:'block',color:'rgba(255,255,255,0.6)',fontSize:'13px',fontWeight:600,marginBottom:'6px'}}>{t.nameLabel}</label>
                <input style={{width:'100%',backgroundColor:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'10px',padding:'10px 14px',color:'white',fontSize:'14px',outline:'none'}} value={name} onChange={e=>setName(e.target.value)} required />
              </div>
            )}
            {isSignUp && (
              <div>
                <label style={{display:'block',color:'rgba(255,255,255,0.6)',fontSize:'13px',fontWeight:600,marginBottom:'6px'}}>{t.inviteLabel}</label>
                <input style={{width:'100%',backgroundColor:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'10px',padding:'10px 14px',color:'white',fontSize:'14px',outline:'none'}} value={inviteCode} onChange={e=>setInviteCode(e.target.value)} placeholder="GEP2026" required />
              </div>
            )}
            {isSignUp && (
              <div>
                <label style={{display:'block',color:'rgba(255,255,255,0.6)',fontSize:'13px',fontWeight:600,marginBottom:'6px'}}>{t.clientLabel}</label>
                <input style={{width:'100%',backgroundColor:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'10px',padding:'10px 14px',color:'white',fontSize:'14px',outline:'none'}} value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder={t.clientPlaceholder} />
              </div>
            )}
            <div>
              <label style={{display:'block',color:'rgba(255,255,255,0.6)',fontSize:'13px',fontWeight:600,marginBottom:'6px'}}>{t.emailLabel}</label>
              <input type="email" style={{width:'100%',backgroundColor:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'10px',padding:'10px 14px',color:'white',fontSize:'14px',outline:'none'}} value={email} onChange={e=>setEmail(e.target.value)} required />
            </div>
            <div>
              <label style={{display:'block',color:'rgba(255,255,255,0.6)',fontSize:'13px',fontWeight:600,marginBottom:'6px'}}>{t.passLabel}</label>
              <input type="password" style={{width:'100%',backgroundColor:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'10px',padding:'10px 14px',color:'white',fontSize:'14px',outline:'none'}} value={password} onChange={e=>setPassword(e.target.value)} required />
            </div>
            {authError && <p style={{color:'#F87171',fontSize:'13px',margin:0}}>{authError}</p>}
            <button type="submit" style={{backgroundColor:'#E21B3C',color:'white',border:'none',borderRadius:'10px',padding:'12px',fontSize:'15px',fontWeight:700,cursor:'pointer',marginTop:'4px'}}>
              {isSignUp ? t.registerBtn : t.loginBtn}
            </button>
          </form>
          <button onClick={()=>{setIsSignUp(!isSignUp);setAuthError('')}} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:'13px',cursor:'pointer',width:'100%',textAlign:'center',marginTop:'16px'}}>
            {isSignUp ? t.switchToLogin : t.switchToRegister}
          </button>
        </div>
      </div>
    </div>
  )

  const orgColor = getOrgColor(org?.name || user.email || '')

  return (
    <div style={{minHeight:'100vh',backgroundColor:'#070B14',color:'white',fontFamily:"'Inter',system-ui,sans-serif"}}>
      {/* Top Nav */}
      <nav style={{borderBottom:'1px solid rgba(255,255,255,0.08)',padding:'0 24px',height:'64px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,backgroundColor:'rgba(7,11,20,0.95)',backdropFilter:'blur(12px)',zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <a href="/" style={{display:'flex',alignItems:'center',gap:'8px',textDecoration:'none'}}>
            <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'linear-gradient(135deg,#E21B3C,#1368CE)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',fontWeight:900,color:'white'}}>T</div>
            <span style={{fontWeight:800,fontSize:'16px',color:'white',letterSpacing:'-0.5px'}}>TrainIQ</span>
          </a>
          <span style={{color:'rgba(255,255,255,0.2)'}}>·</span>
          {org && (
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <Avatar name={org.name} size={24} />
              <span style={{fontSize:'14px',fontWeight:600,color:'rgba(255,255,255,0.8)'}}>{org.name}</span>
            </div>
          )}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <LangToggle />
          <span style={{color:'rgba(255,255,255,0.3)',fontSize:'13px'}}>{user.email}</span>
          <button onClick={()=>supabase.auth.signOut().then(()=>{setUser(null);setOrg(null);setSessions([])})} style={{backgroundColor:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.6)',borderRadius:'8px',padding:'6px 14px',fontSize:'13px',cursor:'pointer',fontWeight:500}}>
            {t.logout}
          </button>
        </div>
      </nav>

      <div style={{maxWidth:'1100px',margin:'0 auto',padding:'32px 24px'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:'20px',marginBottom:'40px'}}>
          <div style={{display:'flex',gap:'16px',alignItems:'center'}}>
            <Avatar name={org?.name || user.email} size={56} />
            <div>
              <p style={{color:'rgba(255,255,255,0.4)',fontSize:'13px',margin:'0 0 4px'}}>{t.welcome}, {profile?.full_name || user.email?.split('@')[0]}</p>
              <h1 style={{fontSize:'28px',fontWeight:800,margin:'0 0 4px',letterSpacing:'-0.5px'}}>{org?.name || t.yourWorkspace}</h1>
              <p style={{color:'rgba(255,255,255,0.4)',fontSize:'13px',margin:0}}>{sessions.length} {t.sessionsCount}</p>
            </div>
          </div>
          <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
            <Link href="/admin/reports" style={{backgroundColor:'rgba(255,255,255,0.08)',color:'white',textDecoration:'none',borderRadius:'10px',padding:'10px 18px',fontSize:'14px',fontWeight:600,border:'1px solid rgba(255,255,255,0.12)'}}>
              📊 {lang === 'id' ? 'Laporan' : 'Reports'}
            </Link>
            <button onClick={resetAll} style={{backgroundColor:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'10px 18px',fontSize:'14px',cursor:'pointer'}}>
              🔄 {t.resetAll}
            </button>
          </div>
        </div>

        {/* Create Session */}
        <div style={{backgroundColor:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'16px',padding:'24px',marginBottom:'32px'}}>
          <h3 style={{margin:'0 0 16px',fontSize:'15px',fontWeight:700,color:'rgba(255,255,255,0.8)'}}>{t.newSession}</h3>
          <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
            <input style={{flex:2,minWidth:'200px',backgroundColor:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'10px',padding:'10px 14px',color:'white',fontSize:'14px',outline:'none'}}
              value={newTitle} onChange={e=>setNewTitle(e.target.value)}
              placeholder={lang === 'id' ? 'Judul sesi, e.g. "Day 1 Pre-Test — Module Overview"' : 'Session title, e.g. "Day 1 Pre-Test — Module Overview"'}
              onKeyDown={e=>e.key==='Enter'&&createSession()} />
            <input style={{flex:1,minWidth:'150px',backgroundColor:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'10px',padding:'10px 14px',color:'white',fontSize:'14px',outline:'none'}}
              value={newDesc} onChange={e=>setNewDesc(e.target.value)}
              placeholder={lang === 'id' ? 'Deskripsi (opsional)' : 'Description (optional)'}
              onKeyDown={e=>e.key==='Enter'&&createSession()} />
            <button onClick={createSession} disabled={creating||!newTitle.trim()} style={{backgroundColor:'#E21B3C',color:'white',border:'none',borderRadius:'10px',padding:'10px 24px',fontSize:'14px',fontWeight:700,cursor:'pointer',opacity:creating||!newTitle.trim()?0.5:1,boxShadow:'0 4px 12px rgba(226,27,60,0.3)'}}>
              {creating ? '...' : '+ ' + (lang === 'id' ? 'Buat' : 'Create')}
            </button>
          </div>
        </div>

        {/* Filter tabs - dynamic */}
        {activeGroups.length > 0 && (
          <div style={{display:'flex',gap:'8px',marginBottom:'24px',flexWrap:'wrap'}}>
            <button onClick={()=>setFilter('all')} style={{padding:'6px 16px',borderRadius:'100px',fontSize:'13px',fontWeight:600,cursor:'pointer',backgroundColor:filter==='all'?'white':'rgba(255,255,255,0.06)',color:filter==='all'?'#070B14':'rgba(255,255,255,0.5)',border:filter==='all'?'none':'1px solid rgba(255,255,255,0.1)'}}>
              {t.allSessions}
            </button>
            {activeGroups.map((g,i) => (
              <button key={i} onClick={()=>setFilter(g)} style={{padding:'6px 16px',borderRadius:'100px',fontSize:'13px',fontWeight:600,cursor:'pointer',backgroundColor:filter===g?ACCENT_COLORS[i%ACCENT_COLORS.length]:'rgba(255,255,255,0.06)',color:filter===g?'white':'rgba(255,255,255,0.5)',border:filter===g?'none':'1px solid rgba(255,255,255,0.1)'}}>
                {g}
              </button>
            ))}
          </div>
        )}

        {/* Sessions Grid */}
        {filteredSessions.length === 0 ? (
          <div style={{textAlign:'center',padding:'80px 24px',backgroundColor:'rgba(255,255,255,0.02)',border:'2px dashed rgba(255,255,255,0.08)',borderRadius:'20px'}}>
            <div style={{fontSize:'48px',marginBottom:'16px'}}>✦</div>
            <h3 style={{fontSize:'20px',fontWeight:700,marginBottom:'8px',margin:'0 0 8px'}}>{t.createFirst}</h3>
            <p style={{color:'rgba(255,255,255,0.3)',fontSize:'14px',margin:0}}>{t.noSessions}</p>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:'16px'}}>
            {filteredSessions.map((s: any) => {
              const statusColor = s.status === 'active' ? '#26890C' : s.status === 'ended' ? '#6B7280' : '#1368CE'
              const statusBg = s.status === 'active' ? 'rgba(38,137,12,0.15)' : s.status === 'ended' ? 'rgba(107,114,128,0.15)' : 'rgba(19,104,206,0.15)'
              const statusLabel = s.status === 'active' ? t.active : s.status === 'ended' ? t.ended : t.draft
              return (
                <div key={s.id} style={{backgroundColor:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'16px',padding:'20px',transition:'border-color 0.2s',position:'relative',overflow:'hidden'}}>
                  {/* Status bar */}
                  <div style={{position:'absolute',top:0,left:0,right:0,height:'2px',backgroundColor:statusColor,opacity:0.6}}/>

                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'12px'}}>
                    <span style={{backgroundColor:statusBg,color:statusColor,fontSize:'11px',fontWeight:700,padding:'3px 10px',borderRadius:'100px',border:`1px solid ${statusColor}30`,textTransform:'uppercase',letterSpacing:'0.5px'}}>
                      {s.status === 'active' ? '● ' : ''}{statusLabel}
                    </span>
                    <span style={{color:'rgba(255,255,255,0.3)',fontSize:'12px',fontFamily:'monospace',fontWeight:700}}>{t.code}: {s.room_code}</span>
                  </div>

                  <h3 style={{fontSize:'15px',fontWeight:700,margin:'0 0 6px',lineHeight:1.4,color:'white'}}>{s.title}</h3>
                  {s.description && <p style={{color:'rgba(255,255,255,0.35)',fontSize:'13px',margin:'0 0 16px',lineHeight:1.5}}>{s.description}</p>}

                  <div style={{display:'flex',gap:'8px',marginTop:'16px'}}>
                    <Link href={`/admin/session/${s.id}`} style={{flex:1,backgroundColor:'#1368CE',color:'white',textDecoration:'none',borderRadius:'8px',padding:'8px 14px',fontSize:'13px',fontWeight:700,textAlign:'center',boxShadow:'0 2px 8px rgba(19,104,206,0.3)'}}>
                      {s.status === 'active' ? '🎯 ' : '📝 '}{t.manage}
                    </Link>
                    <button onClick={()=>resetSession(s.id)} style={{backgroundColor:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.5)',borderRadius:'8px',padding:'8px 12px',fontSize:'13px',cursor:'pointer'}}>↺</button>
                    <button onClick={()=>deleteSession(s.id)} style={{backgroundColor:'rgba(226,27,60,0.1)',border:'1px solid rgba(226,27,60,0.2)',color:'#F87171',borderRadius:'8px',padding:'8px 12px',fontSize:'13px',cursor:'pointer'}}>🗑</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
