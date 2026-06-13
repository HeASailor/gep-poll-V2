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
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/admin" className="text-blue-600 hover:underline text-sm">← Dashboard</Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800">{session.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${session.status === 'active' ? 'bg-green-100 text-green-700' : session.status === 'ended' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>
              {session.status === 'active' ? 'Aktif' : session.status === 'ended' ? 'Selesai' : 'Draft'}
            </span>
            <span className="text-sm text-gray-500">Kode: <strong className="font-mono text-blue-700">{session.room_code}</strong></span>
            <span className="text-sm text-gray-500">{participants.length} peserta</span>
          </div>
        </div>
        <LangToggle />
        {session.status === 'active' && <button onClick={endSession} className="btn-danger text-sm">{lang === 'id' ? 'Akhiri Sesi' : 'End Session'}</button>}
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
        <div className="space-y-4">
          <div className="card text-center">
            <p className="text-gray-500 text-sm mb-1">Peserta bergabung di gep-poll.vercel.app/join</p>
            <div className="text-5xl font-bold font-mono text-blue-700 tracking-widest my-3">{session.room_code}</div>
            <p className="text-gray-400 text-sm">{participants.length} peserta</p>
          </div>
          {currentQ && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">Pertanyaan {session.current_question_index+1} / {questions.length}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-mono font-bold ${timer <= 10 ? 'text-red-600' : 'text-blue-700'}`}>{timer}s</span>
                  <button onClick={async () => { if (!timerRunning) { await supabase.from('sessions').update({ timer_started_at: new Date().toISOString(), timer_duration: currentQ?.timer_seconds || 30 }).eq('id', params.id) } else { await supabase.from('sessions').update({ timer_started_at: null }).eq('id', params.id) } setTimerRunning(!timerRunning) }} className="btn-secondary text-sm py-1 px-3">{timerRunning ? 'Pause' : 'Mulai'}</button>
                  <button onClick={() => { setTimer(currentQ.timer_seconds); setTimerRunning(false) }} className="btn-secondary text-sm py-1 px-3">Reset</button>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">{currentQ.question_text}</h2>
              <LiveResults responses={responses.filter((r: any) => r.question_id === currentQ.id)} question={currentQ} />
              <div className="flex gap-2 mt-4">
                <button disabled={session.current_question_index === 0} onClick={() => setCurrentQ(session.current_question_index-1)} className="btn-secondary text-sm">{lang === 'id' ? 'Sebelumnya' : 'Previous'}</button>
                <button disabled={session.current_question_index >= questions.length-1} onClick={() => setCurrentQ(session.current_question_index+1)} className="btn-primary text-sm">{lang === 'id' ? 'Selanjutnya' : 'Next'}</button>
              </div>
            </div>
          )}
          {participants.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">Peserta ({participants.length})</h3>
              <div className="flex flex-wrap gap-2">
                {participants.map((p: any) => <span key={p.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{p.display_name}</span>)}
              </div>
            </div>
          )}
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
