'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useLang, LangToggle } from '@/lib/lang'

const MODULES = [
  'Project Request & Project',
  'RFx & Bidder List',
  'Kontrak (Contracts)',
  'E-Catalog & Procurement Dashboard',
  'E-Auction',
]

export default function SessionPage({ params }: { params: { id: string } }) {
  const [session, setSession] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [participants, setParticipants] = useState<any[]>([])
  const [responses, setResponses] = useState<any[]>([])
  const [tab, setTab] = useState<'build' | 'present' | 'results'>('build')
  const [loading, setLoading] = useState(true)
  const [timer, setTimer] = useState(30)
  const [timerRunning, setTimerRunning] = useState(false)
  const [qType, setQType] = useState('mcq')
  const [qText, setQText] = useState('')
  const [qOptions, setQOptions] = useState(['', ''])
  const [qCorrect, setQCorrect] = useState<number | null>(null)
  const [qTimer, setQTimer] = useState(30)
  const [qModule, setQModule] = useState(MODULES[0])
  const [saving, setSaving] = useState(false)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const { lang } = useLang()

  const fetchAll = useCallback(async () => {
    const { data: s } = await supabase.from('sessions').select('*').eq('id', params.id).single()
    if (s) setSession(s)
    const { data: qs } = await supabase.from('questions').select('*, options(*)').eq('session_id', params.id).order('order_index')
    if (qs) setQuestions(qs)
    const { data: ps } = await supabase.from('participants').select('*').eq('session_id', params.id)
    if (ps) setParticipants(ps)
    const { data: rs } = await supabase.from('responses').select('*').eq('session_id', params.id)
    if (rs) setResponses(rs)
    setLoading(false)
  }, [params.id])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    const ch = supabase.channel('session-' + params.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'responses', filter: `session_id=eq.${params.id}` }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${params.id}` }, () => fetchAll())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${params.id}` }, ({ new: updated }: any) => setSession(updated))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [params.id, fetchAll])

  useEffect(() => {
    if (!timerRunning) return
    if (timer <= 0) { setTimerRunning(false); return }
    const t = setTimeout(() => setTimer(prev => prev - 1), 1000)
    return () => clearTimeout(t)
  }, [timerRunning, timer])

  async function fetchLeaderboard() {
    const { data: parts } = await supabase.from('participants').select('id, display_name').eq('session_id', params.id)
    const { data: qs } = await supabase.from('questions').select('id, correct_option_index').eq('session_id', params.id)
    const { data: responses } = await supabase.from('responses').select('*').eq('session_id', params.id)
    if (!parts || !qs || !responses) return
    const scores = parts.map((p: any) => {
      const pR = responses.filter((r: any) => r.participant_id === p.id)
      let correct = 0
      qs.forEach((q: any) => { const r = pR.find((r: any) => r.question_id === q.id); if (r && Number(r.answer_index) === Number(q.correct_option_index)) correct++ })
      return { name: p.display_name, score: correct, total: qs.length, pct: Math.round((correct / qs.length) * 100) }
    }).sort((a: any, b: any) => b.score - a.score)
    setLeaderboard(scores)
  }

  async function addQuestion() {
    if (!qText.trim()) return
    setSaving(true)
    const { data: q, error } = await supabase.from('questions').insert({
      session_id: params.id,
      question_text: '[' + qModule + '] ' + qText,
      question_type: qType,
      correct_option_index: qCorrect,
      order_index: questions.length,
      timer_seconds: qTimer,
    }).select().single()
    if (!error && q && qType === 'mcq') {
      const opts = qOptions.filter(o => o.trim()).map((o, i) => ({ question_id: q.id, option_text: o.trim(), option_index: i }))
      await supabase.from('options').insert(opts)
    }
    setQText(''); setQOptions(['', '']); setQCorrect(null); setSaving(false)
    fetchAll()
  }

  async function deleteQuestion(qid: string) {
    await supabase.from('questions').delete().eq('id', qid)
    fetchAll()
  }

  async function startSession() {
    await supabase.from('sessions').update({ status: 'active', started_at: new Date().toISOString(), current_question_index: 0 }).eq('id', params.id)
    fetchAll(); setTab('present')
  }

  async function endSession() {
    if (!confirm('Akhiri sesi ini?')) return
    await supabase.from('sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', params.id)
    fetchAll(); setTab('results')
  }

  async function setCurrentQ(idx: number) {
    await supabase.from('sessions').update({ current_question_index: idx, timer_started_at: null, timer_duration: questions[idx]?.timer_seconds || 30 }).eq('id', params.id)
    setTimer(questions[idx]?.timer_seconds || 30)
    setTimerRunning(false)
    console.log('Moved to question', idx + 1)
  }

  function exportCSV() {
    let csv = 'Pertanyaan,Tipe,Jawaban,Jumlah,Persen\n'
    questions.forEach((q: any) => {
      const qr = responses.filter((r: any) => r.question_id === q.id)
      if (q.question_type === 'mcq' && q.options) {
        q.options.forEach((o: any) => {
          const count = qr.filter((r: any) => r.answer_index === o.option_index).length
          const pct = qr.length ? Math.round(count / qr.length * 100) : 0
          csv += '"' + q.question_text + '",MCQ,"' + o.option_text + '",' + count + ',' + pct + '%\n'
        })
      } else if (q.question_type === 'rating') {
        for (let i = 1; i <= 5; i++) {
          const count = qr.filter((r: any) => r.rating_value === i).length
          const pct = qr.length ? Math.round(count / qr.length * 100) : 0
          csv += '"' + q.question_text + '",Rating,' + i + ',' + count + ',' + pct + '%\n'
        }
      }
    })
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = 'hasil-sesi.csv'
    a.click()
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Memuat...</div>
  if (!session) return <div className="p-8 text-red-500">Sesi tidak ditemukan.</div>

  const currentQ = questions[session.current_question_index]

  return (
    <div className="max-w-5xl mx-auto p-4 py-6">
      <div className="flex h-1 w-full mb-4 rounded-full overflow-hidden">
        <div className="flex-1" style={{backgroundColor:'#ED1C24'}} />
        <div className="flex-1" style={{backgroundColor:'#0066B3'}} />
        <div className="flex-1" style={{backgroundColor:'#00A651'}} />
      </div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/admin" className="text-blue-600 hover:underline text-sm">← Dashboard</Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800">{session.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${session.status === 'active' ? 'bg-green-100 text-green-700' : session.status === 'ended' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>
              {session.status === 'active' ? 'Aktif' : session.status === 'ended' ? 'Selesai' : 'Draft'}
            </span>
            <span className="text-sm text-gray-500">{lang === "en" ? "Code" : "Kode"}: <strong className="font-mono text-blue-700 text-base">{session?.room_code || "..."}</strong></span>
            <span className="text-sm text-gray-500">{participants.length} peserta</span>
          </div>
        </div>
        <LangToggle />
        {session.status === 'active' && <button onClick={endSession} className="btn-danger text-sm">{lang === 'en' ? 'End Session' : 'Akhiri Sesi'}</button>}
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {(['build', 'present', 'results'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'build' ? (lang === 'id' ? '📝 Buat Pertanyaan' : '📝 Build Questions') : t === 'present' ? (lang === 'id' ? '🎯 Tampilkan Live' : '🎯 Present Live') : (lang === 'id' ? '📊 Hasil' : '📊 Results')}
          </button>
        ))}
      </div>

      {tab === 'build' && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-gray-700 mb-4">Tambah Pertanyaan Baru</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label">Modul</label>
                <select className="input" value={qModule} onChange={e => setQModule(e.target.value)}>
                  {MODULES.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tipe</label>
                <select className="input" value={qType} onChange={e => setQType(e.target.value)}>
                  <option value="mcq">Pilihan Ganda</option>
                  <option value="rating">Rating 1-5</option>
                  <option value="open">Teks Terbuka</option>
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="label">Pertanyaan</label>
              <textarea className="input" rows={2} value={qText} onChange={e => setQText(e.target.value)} placeholder="Tulis pertanyaan..." />
            </div>
            {qType === 'mcq' && (
              <div className="mb-3">
                <label className="label">Pilihan Jawaban</label>
                {qOptions.map((o, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-center">
                    <input className="input" value={o} onChange={e => { const n = [...qOptions]; n[i] = e.target.value; setQOptions(n) }} placeholder={'Pilihan ' + String.fromCharCode(65+i)} />
                    <input type="radio" name="correct" checked={qCorrect === i} onChange={() => setQCorrect(i)} className="w-4 h-4" />
                    {qOptions.length > 2 && <button onClick={() => setQOptions(qOptions.filter((_, j) => j !== i))} className="text-gray-400 text-xl">x</button>}
                  </div>
                ))}
                <button onClick={() => setQOptions([...qOptions, ''])} className="text-blue-600 text-sm">+ Tambah pilihan</button>
              </div>
            )}
            <div className="flex gap-3 items-center">
              <div className="w-32">
                <label className="label">Timer (detik)</label>
                <input className="input" type="number" min={10} max={300} value={qTimer} onChange={e => setQTimer(+e.target.value)} />
              </div>
              <div className="pt-5">
                <button onClick={addQuestion} disabled={saving || !qText.trim()} className="btn-primary">{saving ? 'Menyimpan...' : '+ Tambah'}</button>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-700">Daftar Pertanyaan ({questions.length})</h2>
              {session.status === 'draft' && questions.length > 0 && <button onClick={startSession} className="btn-primary">{lang === 'id' ? 'Mulai Sesi Live' : 'Start Live Session'}</button>}
            </div>
            {questions.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Belum ada pertanyaan.</p>}
            <div className="space-y-2">
              {questions.map((q: any, i: number) => (
                <div key={q.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-blue-700 font-mono text-sm font-bold min-w-[24px]">{i+1}</span>
                  <div className="flex-1"><p className="text-sm text-gray-800">{q.question_text}</p></div>
                  <button onClick={() => deleteQuestion(q.id)} className="text-gray-300 hover:text-red-500 text-lg">x</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'present' && (
        <div className="space-y-0">
          {/* Kahoot-style presenter view */}
          {(!currentQ || (session.current_question_index === 0 && !session.timer_started_at && session.status === 'active')) ? (
            /* Waiting / Lobby screen */
            <div className="rounded-2xl overflow-hidden" style={{background:'linear-gradient(135deg,#1a0533 0%,#0a1628 100%)',minHeight:'400px'}}>
              <div className="p-8 text-center">
                <div className="text-white text-opacity-60 text-sm mb-2 uppercase tracking-widest">GEP TrainIQ</div>
                <h2 className="text-3xl font-black text-white mb-6">{session.title}</h2>
                <div className="inline-block bg-white rounded-2xl px-8 py-6 mb-6 shadow-2xl">
                  <div className="text-gray-500 text-sm font-medium mb-1">{lang === "en" ? "Join at" : "Bergabung di"}</div>
                  <div className="text-blue-700 font-bold text-sm mb-3">gep-poll.vercel.app/join</div>
                  <div className="text-6xl font-black font-mono text-gray-900 tracking-widest letter-spacing">{session?.room_code ? String(session.room_code) : '...'}</div>
                  <div className="text-gray-400 text-xs mt-2">{lang === "en" ? "Room Code" : "Kode Ruangan"}</div>
                  <div className="flex justify-center mt-3">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://gep-poll.vercel.app/join?code=' + (session?.room_code||''))}&bgcolor=ffffff&color=0a1628&qzone=2`}
                      alt="QR" className="rounded-xl" width={150} height={150} />
                  </div>
                  <div className="text-gray-400 text-xs mt-2">{lang === "en" ? "📱 Scan to join" : "📱 Scan untuk bergabung"}</div>
                </div>
                <div className="flex items-center justify-center gap-3 mb-6">
                  {participants.slice(0,12).map((p:any) => {
                    const colors = ['#0066B3','#00A651','#ED1C24','#7C3AED','#DB2777','#D97706']
                    const idx = p.display_name.split('').reduce((a:number,c:string)=>a+c.charCodeAt(0),0)%colors.length
                    const initials = p.display_name.trim().split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2)
                    return (
                      <div key={p.id} title={p.display_name} className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-white border-opacity-30" style={{backgroundColor:colors[idx]}}>
                        {initials}
                      </div>
                    )
                  })}
                  {participants.length > 12 && <div className="text-white text-opacity-60 text-sm">+{participants.length-12}</div>}
                </div>
                <div className="text-white text-2xl font-black">{participants.length} <span className="font-normal text-opacity-60" style={{opacity:0.6}}>{lang === "en" ? "players joined" : "peserta bergabung"}</span></div>
              </div>
            </div>
          ) : (
            /* Active question presenter view */
            <div className="rounded-2xl overflow-hidden" style={{background:'linear-gradient(135deg,#1a0533 0%,#0a1628 100%)',minHeight:'400px'}}>
              {/* Top bar */}
              <div className="px-6 py-4 flex items-center justify-between" style={{backgroundColor:'rgba(0,0,0,0.3)'}}>
                <div className="text-white text-opacity-60 text-sm">{lang==="en"?"Question":"Pertanyaan"} {session.current_question_index+1}/{questions.length}</div>
                <div className={`text-3xl font-black font-mono w-16 h-16 rounded-full flex items-center justify-center border-4 ${timer <= 10 ? 'text-red-400 border-red-400' : 'text-white border-white border-opacity-30'}`}>
                  {timer}
                </div>
                <div className="flex gap-2">
                  <button onClick={async()=>{ await supabase.from('sessions').update({timer_started_at:new Date().toISOString(),timer_duration:currentQ?.timer_seconds||30}).eq('id',params.id) }} className="px-3 py-1.5 rounded-lg text-sm font-bold text-white" style={{backgroundColor:'rgba(255,255,255,0.2)'}}>
                    {lang==="en"?"Start":"Mulai"}
                  </button>
                  <button onClick={async()=>{ const newDuration=(currentQ?.timer_seconds||30)+10; await supabase.from('sessions').update({timer_started_at:new Date().toISOString(),timer_duration:newDuration}).eq('id',params.id); setTimer(prev=>prev+10) }} className="px-3 py-1.5 rounded-lg text-sm font-bold text-white" style={{backgroundColor:'rgba(255,255,255,0.15)'}}>
                    +10s
                  </button>
                </div>
              </div>

              {/* Timer bar */}
              <div className="h-2" style={{backgroundColor:'rgba(255,255,255,0.1)'}}>
                <div className="h-full transition-all duration-1000" style={{width:(timer/(currentQ?.timer_seconds||30)*100)+'%',backgroundColor:timer<=10?'#EF4444':'#4ADE80'}}/>
              </div>

              {/* Question */}
              <div className="px-6 py-6 text-center">
                <p className="text-white font-bold text-2xl leading-snug mb-6">{currentQ.question_text}</p>

                {/* MCQ options - 2x2 grid */}
                {currentQ.question_type === 'mcq' && (
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {currentQ.options?.sort((a:any,b:any)=>a.option_index-b.option_index).map((o:any,i:number)=>{
                      const colors = ['#E21B3C','#1368CE','#D89E00','#26890C']
                      const icons = ['▲','◆','●','■']
                      const isCorrect = Number(o.option_index) === Number(currentQ.correct_option_index)
                      return (
                        <div key={o.id} className="rounded-xl p-3 text-white font-bold text-sm flex items-center gap-2 relative" style={{backgroundColor:colors[i%4],boxShadow:'0 4px 0 rgba(0,0,0,0.2)'}}>
                          <span className="text-lg">{icons[i%4]}</span>
                          <span className="flex-1 text-left">{o.option_text}</span>
                          {isCorrect && <span className="text-green-200 text-xs">✓</span>}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Answer distribution */}
                {currentQ.question_type === 'mcq' && currentQ.options && (
                  <div className="space-y-2">
                    {currentQ.options?.sort((a:any,b:any)=>a.option_index-b.option_index).map((o:any,i:number)=>{
                      const colors = ['#E21B3C','#1368CE','#D89E00','#26890C']
                      const total = currentQ.options.length > 0 ? Math.max(1, participants.length) : 1
                      const count = 0 // will be populated from responses
                      return null
                    })}
                  </div>
                )}
              </div>

              {/* Bottom controls */}
              <div className="px-6 pb-6 flex items-center justify-between">
                <div className="text-white text-opacity-60 text-sm">{participants.length} {lang==="en"?"players":"peserta"}</div>
                <div className="flex gap-3">
                  <button disabled={session.current_question_index <= 0} onClick={()=>setCurrentQ(session.current_question_index-1)} className="px-4 py-2 rounded-xl font-bold text-white text-sm disabled:opacity-30" style={{backgroundColor:'rgba(255,255,255,0.2)'}}>
                    ← {lang==="en"?"Prev":"Sebelumnya"}
                  </button>
                  <button disabled={session.current_question_index>=questions.length-1} onClick={()=>setCurrentQ(session.current_question_index+1)} className="px-4 py-2 rounded-xl font-bold text-white text-sm disabled:opacity-30" style={{backgroundColor:'#E21B3C',boxShadow:'0 4px 0 #9B0000'}}>
                    {lang==="en"?"Next":"Selanjutnya"} →
                  </button>
                  <button onClick={async()=>{ await supabase.from('sessions').update({status:'ended',ended_at:new Date().toISOString()}).eq('id',params.id) }} className="px-4 py-2 rounded-xl font-bold text-white text-sm" style={{backgroundColor:'rgba(255,255,255,0.15)'}}>
                    {lang==="en"?"End":"Akhiri"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="mt-4">
            <button onClick={() => { fetchLeaderboard(); setShowLeaderboard(!showLeaderboard) }} className="w-full py-3 rounded-xl font-bold text-white text-sm mb-3" style={{backgroundColor:'#0a1628'}}>
              {showLeaderboard ? '▲' : '▼'} 🏆 {lang==="en"?"Live Leaderboard":"Leaderboard Live"} <span className="text-green-400 text-xs ml-2">● Auto-refresh 2s</span>
            </button>
            {showLeaderboard && leaderboard.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{backgroundColor:'#0a1628'}}>
                <div className="px-4 py-3 border-b border-white border-opacity-10">
                  <h3 className="font-bold text-white text-sm">🏆 {lang==="en"?"Live Leaderboard":"Leaderboard Live"}</h3>
                </div>
                <div className="p-3 space-y-2">
                  {leaderboard.slice(0,10).map((p:any,i:number)=>{
                    const colors = ['#0066B3','#00A651','#ED1C24','#7C3AED','#DB2777','#D97706','#0891B2','#059669']
                    const idx = p.name.split('').reduce((a:number,c:string)=>a+c.charCodeAt(0),0)%colors.length
                    const initials = p.name.trim().split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2)
                    return (
                      <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl ${i===0?'bg-yellow-500 bg-opacity-20':i===1?'bg-gray-400 bg-opacity-10':i===2?'bg-orange-500 bg-opacity-10':'bg-white bg-opacity-5'}`}>
                        <span className="text-sm w-5 text-center">{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</span>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{backgroundColor:colors[idx]}}>{initials}</div>
                        <div className="flex-1 font-medium text-white text-sm truncate">{p.name}</div>
                        <div className="text-sm font-bold text-blue-300">{p.score}/{p.total}</div>
                        <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.pct>=70?'bg-green-500 bg-opacity-20 text-green-400':'bg-red-500 bg-opacity-20 text-red-400'}`}>{p.pct}%</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {session.status === 'ended' && leaderboard.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-4" style={{background:'linear-gradient(135deg,#1a0533 0%,#0a1628 50%,#0d2a1a 100%)'}}>
          <div className="p-6 text-center">
            <div className="text-white text-xs uppercase tracking-widest mb-2" style={{opacity:0.6}}>GEP TrainIQ</div>
            <h2 className="text-3xl font-black text-white mb-1">🎉 {lang === 'en' ? 'Session Complete!' : 'Sesi Selesai!'}</h2>
            <p className="text-white text-sm mb-6" style={{opacity:0.6}}>{session.title}</p>
            <div className="flex items-end justify-center gap-3 mb-6">
              {[leaderboard[1], leaderboard[0], leaderboard[2]].map((p: any, i: number) => {
                if (!p) return <div key={i} className="flex-1 max-w-24"/>
                const colors = ['#0066B3','#00A651','#ED1C24','#7C3AED','#DB2777','#D97706','#0891B2','#059669']
                const cidx = p.name.split('').reduce((a:number,c:string)=>a+c.charCodeAt(0),0)%colors.length
                const initials = p.name.trim().split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2)
                const medals = ['🥈','🥇','🥉']
                const heights = ['h-20','h-28','h-14']
                const podBg = ['#9CA3AF','#F59E0B','#F97316']
                return (
                  <div key={i} className="flex flex-col items-center flex-1 max-w-28">
                    <div className="text-2xl mb-1">{medals[i]}</div>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-lg border-4 border-white border-opacity-30 mb-2" style={{backgroundColor:colors[cidx]}}>{initials}</div>
                    <div className="text-white font-bold text-sm w-full text-center truncate px-1 mb-1">{p.name}</div>
                    <div className="text-white text-xs mb-3 font-mono" style={{opacity:0.7}}>{p.score}/{p.total} • {p.pct}%</div>
                    <div className={`w-full ${heights[i]} rounded-t-2xl flex items-center justify-center text-white font-black text-2xl`} style={{backgroundColor:podBg[i]}}>{i===1?'1':i===0?'2':'3'}</div>
                  </div>
                )
              })}
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[{label:lang==='en'?'Players':'Peserta',value:String(leaderboard.length)},{label:lang==='en'?'Avg Score':'Rata-rata',value:Math.round(leaderboard.reduce((a:number,b:any)=>a+b.pct,0)/leaderboard.length)+'%'},{label:'Pass Rate',value:Math.round(leaderboard.filter((p:any)=>p.pct>=70).length/leaderboard.length*100)+'%'}].map((s:any)=>(
                <div key={s.label} className="rounded-xl p-3 text-center" style={{backgroundColor:'rgba(255,255,255,0.1)'}}>
                  <div className="text-white font-black text-xl">{s.value}</div>
                  <div className="text-white text-xs" style={{opacity:0.6}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {leaderboard.map((p:any,i:number)=>{
                const colors = ['#0066B3','#00A651','#ED1C24','#7C3AED','#DB2777','#D97706','#0891B2','#059669']
                const cidx = p.name.split('').reduce((a:number,c:string)=>a+c.charCodeAt(0),0)%colors.length
                const initials = p.name.trim().split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2)
                return (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl" style={{backgroundColor:'rgba(255,255,255,0.07)'}}>
                    <span className="text-white text-sm w-6 text-center font-bold" style={{opacity:0.6}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</span>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{backgroundColor:colors[cidx]}}>{initials}</div>
                    <div className="flex-1 text-white text-sm font-medium truncate text-left">{p.name}</div>
                    <div className="text-white text-sm font-bold" style={{opacity:0.8}}>{p.score}/{p.total}</div>
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.pct>=70?'bg-green-500 bg-opacity-30 text-green-400':'bg-red-500 bg-opacity-30 text-red-400'}`}>{p.pct}%</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'results' && (
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="card py-3 px-4 text-center"><div className="text-2xl font-bold text-blue-700">{participants.length}</div><div className="text-xs text-gray-500">Peserta</div></div>
            <div className="card py-3 px-4 text-center"><div className="text-2xl font-bold text-green-600">{responses.length}</div><div className="text-xs text-gray-500">Respons</div></div>
            <button onClick={exportCSV} className="btn-secondary text-sm ml-auto">{lang === 'id' ? 'Ekspor CSV' : 'Export CSV'}</button>
          </div>
          {questions.map((q: any, i: number) => (
            <div key={q.id} className="card">
              <h3 className="font-semibold text-gray-800 text-sm mb-3">Q{i+1}: {q.question_text}</h3>
              <LiveResults responses={responses.filter((r: any) => r.question_id === q.id)} question={q} showAll={true} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LiveResults({ responses, question, showAll = false }: { responses: any[], question: any, showAll?: boolean }) {
  if (question.question_type === 'open') {
    if (!showAll) return <p className="text-sm text-gray-400 italic">Pertanyaan teks terbuka.</p>
    return (
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {responses.length === 0 && <p className="text-sm text-gray-400">Belum ada respons.</p>}
        {responses.map((r: any) => <div key={r.id} className="text-sm bg-gray-50 p-2 rounded text-gray-700">{r.answer_text}</div>)}
      </div>
    )
  }
  const opts = question.question_type === 'rating'
    ? [1,2,3,4,5].map(n => ({ label: String(n), value: n, count: responses.filter((r: any) => r.rating_value === n).length, correct: false }))
    : (question.options || []).sort((a: any, b: any) => a.option_index - b.option_index).map((o: any) => ({
        label: String.fromCharCode(65 + o.option_index) + '. ' + o.option_text,
        value: o.option_index,
        count: responses.filter((r: any) => r.answer_index === o.option_index).length,
        correct: question.correct_option_index === o.option_index
      }))
  const total = responses.length || 1
  const colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6']
  return (
    <div>
      {opts.map((o: any, i: number) => {
        const pct = Math.round(o.count / total * 100)
        return (
          <div key={i} className="mb-2">
            <div className="flex justify-between text-xs text-gray-600 mb-0.5">
              <span className={o.correct ? 'font-semibold text-green-700' : ''}>{o.label}{o.correct ? ' (Benar)' : ''}</span>
              <span>{o.count} ({pct}%)</span>
            </div>
            <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + '%', backgroundColor: o.correct ? '#10b981' : colors[i % colors.length] }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
