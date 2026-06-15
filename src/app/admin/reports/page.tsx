'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLang, LangToggle } from '@/lib/lang'
const PASS = 70
export default function ReportsPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [pre, setPre] = useState('')
  const [post, setPost] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [ap, setAp] = useState(0)
  const [ao, setAo] = useState(0)
  const [pc, setPc] = useState(0)
  const { lang } = useLang()
  useEffect(() => {
    supabase.auth.getUser().then(({data}: any) => {
      if (data.user) supabase.from('sessions').select('*').order('title').then(({data: d}: any) => { if (d) setSessions(d) })
    })
  }, [])
  const preS = sessions.filter((s: any) => s.title.includes(lang === "id" ? "Pre-Test" : "Pre-Test"))
  const postS = sessions.filter((s: any) => s.title.includes(lang === "id" ? "Post-Test" : "Post-Test"))
  async function gen() {
    if (!pre || !post) return
    setLoading(true)
    const a = await supabase.from('questions').select('id,correct_option_index').eq('session_id', pre)
    const b = await supabase.from('questions').select('id,correct_option_index').eq('session_id', post)
    const c = await supabase.from('participants').select('id,display_name').eq('session_id', pre)
    const d = await supabase.from('responses').select('*').eq('session_id', pre)
    const e = await supabase.from('participants').select('id,display_name').eq('session_id', post)
    const f = await supabase.from('responses').select('*').eq('session_id', post)
    console.log('Data loaded - preQ:', a.data?.length, 'postQ:', b.data?.length, 'preP:', c.data?.length, 'preR:', d.data?.length, 'postP:', e.data?.length, 'postR:', f.data?.length)
    function sc(ps: any[], rs: any[], qs: any[]) {
      const scores: Record<string, any> = {}
      ps.forEach((p: any) => {
        const pr = rs.filter((r: any) => r.participant_id === p.id)
        let correct = 0
        qs.forEach((q: any) => {
          const resp = pr.find((r: any) => r.question_id === q.id)
          if (resp && resp.answer_index === q.correct_option_index) correct++
        })
        const dname = (p.display_name || "Unknown").trim(); scores[dname.toLowerCase()] = { score: Math.round((correct / (qs.length || 10)) * 100), name: dname }
      })
      return scores
    }
    const ps = sc(a.data || [], c.data || [], b.data || [])
    const os = sc(e.data || [], d.data || [], f.data || [])
    const names = new Set([...Object.keys(ps), ...Object.keys(os)])
    const m: any[] = Array.from(names).map((n: string) => ({
      name: ps[n]?.name || os[n]?.name || n,
      pre: ps[n]?.score ?? null,
      post: os[n]?.score ?? null,
      imp: ps[n]?.score != null && os[n]?.score != null ? os[n].score - ps[n].score : null,
      pass: (os[n]?.score ?? ps[n]?.score ?? 0) >= PASS
    })).sort((a: any, b: any) => a.name.localeCompare(b.name))
    const wb = m.filter((r: any) => r.pre != null && r.post != null)
    setAp(wb.length ? Math.round(wb.reduce((a: number, b: any) => a + (b.pre || 0), 0) / wb.length) : 0)
    setAo(wb.length ? Math.round(wb.reduce((a: number, b: any) => a + (b.post || 0), 0) / wb.length) : 0)
    setPc(m.filter((r: any) => r.pass).length)
    setResults(m); setLoading(false); setDone(true); console.log("Results:", m.length, "participants")
  }
  function csv() {
    let s = 'Nama,Pre-Test,Post-Test,Improvement,Status\n'
    results.forEach((r: any) => { s += `"${r.name}",${r.pre ?? 'N/A'},${r.post ?? 'N/A'},${r.imp != null ? (r.imp >= 0 ? '+' : '') + r.imp + '%' : 'N/A'},${r.pass ? 'PASS' : 'FAIL'}\n` })
    s += `\nTotal,${results.length}\nAvg Pre,${ap}%\nAvg Post,${ao}%\nImprovement,+${ao - ap}%\nPass Rate,${Math.round(pc / results.length * 100)}%\n`
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(s); a.download = 'Hasil_Training.csv'; a.click()
  }
  const pr = results.length ? Math.round(pc / results.length * 100) : 0
  return (
    <div className="max-w-5xl mx-auto p-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <a href="/admin" className="text-blue-600 hover:underline text-sm">← {lang === "id" ? "Dashboard" : "Dashboard"}</a>
        <h1 className="text-2xl font-bold text-gray-800">📊 {lang === "id" ? "Laporan Hasil Training" : "Training Reports"}</h1>
        <LangToggle />
      </div>
      <div className="card mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">Pilih Sesi</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div><label className="label">Pre-Test</label>
            <select className="input" value={pre} onChange={(e: any) => setPre(e.target.value)}>
              <option value="">-- Pilih --</option>
              {preS.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <div><label className="label">Post-Test</label>
            <select className="input" value={post} onChange={(e: any) => setPost(e.target.value)}>
              <option value="">-- Pilih --</option>
              {postS.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
        </div>
        <button onClick={gen} disabled={!pre || !post || loading} className="btn-primary">
          {loading ? lang === "id" ? "Memproses..." : "Processing..." : lang === "id" ? "📊 Generate Laporan" : "📊 Generate Report"}
        </button>
      </div>
      {done && results.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[{v: String(results.length), l: lang === "id" ? "Total Peserta" : "Total Participants", c: 'text-blue-700'}, {v: ap + '%', l: lang === "id" ? "Avg Pre-Test" : "Avg Pre-Test", c: 'text-amber-600'}, {v: ao + '%', l: lang === "id" ? "Avg Post-Test" : "Avg Post-Test", c: 'text-green-600'}, {v: pr + '%', l: lang === "id" ? "Pass Rate" : "Pass Rate", c: pr >= 70 ? 'text-green-600' : 'text-red-600'}].map((x: any) => (
              <div key={x.l} className="card text-center py-4">
                <div className={`text-3xl font-bold ${x.c}`}>{x.v}</div>
                <div className="text-xs text-gray-500 mt-1">{x.l}</div>
              </div>
            ))}
          </div>
          <div className="card mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-700">Pre vs Post Comparison</h3>
              <span className={`text-sm font-semibold ${ao >= ap ? 'text-green-600' : 'text-red-600'}`}>{ao >= ap ? '+' : ''}{ao - ap}% improvement</span>
            </div>
            {[{l: 'Pre-Test Average', v: ap, c: 'bg-amber-400'}, {l: 'Post-Test Average', v: ao, c: 'bg-green-500'}, {l: 'Passing Score (70%)', v: PASS, c: 'bg-blue-600'}].map((x: any) => (
              <div key={x.l} className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{x.l}</span><span>{x.v}%</span></div>
                <div className="h-6 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${x.c} rounded-full`} style={{width: x.v + '%'}} /></div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mb-6">
            <button onClick={csv} className="btn-primary">⬇ Export CSV (Excel)</button>
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4">Hasil Individual ({results.length} peserta)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200">
                  {['Nama', lang === "id" ? "Pre-Test" : "Pre-Test", lang === "id" ? "Post-Test" : "Post-Test", 'Improvement', 'Status'].map((h: string) => <th key={h} className="text-left py-2 px-3 text-gray-600 font-medium">{h}</th>)}
                </tr></thead>
                <tbody>
                  {results.map((r: any, i: number) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-800">{r.name}</td>
                      <td className="py-2 px-3 text-center"><span className={`font-mono font-semibold ${(r.pre || 0) >= PASS ? 'text-green-600' : 'text-amber-600'}`}>{r.pre != null ? r.pre + '%' : '—'}</span></td>
                      <td className="py-2 px-3 text-center"><span className={`font-mono font-semibold ${(r.post || 0) >= PASS ? 'text-green-600' : 'text-red-500'}`}>{r.post != null ? r.post + '%' : '—'}</span></td>
                      <td className="py-2 px-3 text-center">{r.imp != null ? <span className={`font-semibold ${r.imp >= 0 ? 'text-green-600' : 'text-red-500'}`}>{r.imp >= 0 ? '+' : ''}{r.imp}%</span> : '—'}</td>
                      <td className="py-2 px-3 text-center"><span className={`text-xs px-2 py-1 rounded-full font-medium ${r.pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{r.pass ? 'PASS' : 'FAIL'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {done && results.length === 0 && <div className="card text-center text-gray-400 py-12">Belum ada respons.</div>}
    </div>
  )
}
