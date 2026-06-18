'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLang, LangToggle } from '@/lib/lang'

const PASS = 70

export default function ReportsPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [mode, setMode] = useState<'single' | 'compare'>('single')
  
  // Single session
  const [selectedSession, setSelectedSession] = useState('')
  const [singleResults, setSingleResults] = useState<any[]>([])
  const [singleQuestions, setSingleQuestions] = useState<any[]>([])
  const [activeQTab, setActiveQTab] = useState(0)
  
  // Compare
  const [pre, setPre] = useState('')
  const [post, setPost] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [questionAnalysis, setQuestionAnalysis] = useState<any[]>([])
  const [preQuestions, setPreQuestions] = useState<any[]>([])
  const [postQuestions, setPostQuestions] = useState<any[]>([])
  const [ap, setAp] = useState(0)
  const [ao, setAo] = useState(0)
  const [pc, setPc] = useState(0)
  const [activeTab, setActiveTab] = useState('summary')

  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const { lang } = useLang()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: any) => {
      if (data.user) supabase.from('sessions').select('*').order('title').then(({ data: d }: any) => { if (d) setSessions(d) })
    })
  }, [])

  const preS = sessions.filter((s: any) => s.title.includes('Pre-Test'))
  const postS = sessions.filter((s: any) => s.title.includes('Post-Test'))

  // ---- SINGLE SESSION REPORT ----
  async function genSingle() {
    if (!selectedSession) return
    setLoading(true); setDone(false)
    const { data: qs } = await supabase.from('questions').select('id,question_text,correct_option_index,order_index,options(option_text,option_index)').eq('session_id', selectedSession).order('order_index')
    const { data: parts } = await supabase.from('participants').select('id,display_name').eq('session_id', selectedSession)
    const { data: resps } = await supabase.from('responses').select('*').eq('session_id', selectedSession)
    if (!qs || !parts || !resps) { setLoading(false); return }
    setSingleQuestions(qs)

    const playerResults = parts.map((p: any) => {
      const pResps = resps.filter((r: any) => r.participant_id === p.id)
      let correct = 0
      const answers: Record<string, any> = {}
      qs.forEach((q: any) => {
        const r = pResps.find((r: any) => r.question_id === q.id)
        const isCorrect = r ? Number(r.answer_index) === Number(q.correct_option_index) : false
        if (isCorrect) correct++
        const opts = q.options?.sort((a: any, b: any) => a.option_index - b.option_index) || []
        const selectedOpt = opts.find((o: any) => Number(o.option_index) === Number(r?.answer_index))
        answers[q.id] = {
          answered: r?.answer_index ?? null,
          correct: isCorrect,
          answerText: selectedOpt?.option_text || (r ? 'Unknown' : 'No answer'),
        }
      })
      return { name: p.display_name, correct, wrong: qs.length - correct, total: qs.length, pct: Math.round(correct / qs.length * 100), answers, pass: Math.round(correct / qs.length * 100) >= PASS }
    }).sort((a: any, b: any) => b.correct - a.correct)

    setSingleResults(playerResults)
    setActiveQTab(0)
    setLoading(false); setDone(true)
  }

  // ---- COMPARE REPORT ----
  async function genCompare() {
    if (!pre || !post) return
    setLoading(true); setDone(false)
    const a = await supabase.from('questions').select('id,correct_option_index,question_text,order_index,options(option_text,option_index)').eq('session_id', pre).order('order_index')
    const b = await supabase.from('questions').select('id,correct_option_index,question_text,order_index,options(option_text,option_index)').eq('session_id', post).order('order_index')
    const c = await supabase.from('participants').select('id,display_name').eq('session_id', pre)
    const d = await supabase.from('responses').select('*').eq('session_id', pre)
    const e = await supabase.from('participants').select('id,display_name').eq('session_id', post)
    const f = await supabase.from('responses').select('*').eq('session_id', post)
    const preQs = a.data || []; const postQs = b.data || []
    setPreQuestions(preQs); setPostQuestions(postQs)

    function sc(ps: any[], rs: any[], qs: any[]) {
      const scores: Record<string, any> = {}
      ps.forEach((p: any) => {
        const pr = rs.filter((r: any) => r.participant_id === p.id)
        let correct = 0
        const qAnswers: Record<string, any> = {}
        qs.forEach((q: any) => {
          const r = pr.find((r: any) => r.question_id === q.id)
          const isCorrect = r ? Number(r.answer_index) === Number(q.correct_option_index) : null
          const opts = q.options?.sort((a: any, b: any) => a.option_index - b.option_index) || []
          const selectedOpt = opts.find((o: any) => Number(o.option_index) === Number(r?.answer_index))
          qAnswers[q.id] = { answered: r?.answer_index ?? null, answeredIdx: r?.answer_index ?? null, correct: isCorrect, correctIdx: q.correct_option_index, options: q.options, answerText: selectedOpt?.option_text || '' }
          if (isCorrect) correct++
        })
        const dname = (p.display_name || 'Unknown').trim()
        scores[dname.toLowerCase()] = { score: Math.round((correct / (qs.length || 10)) * 100), name: dname, correct, qAnswers }
      })
      return scores
    }
    const ps = sc(a.data || [], d.data || [], preQs)
    const os = sc(e.data || [], f.data || [], postQs)
    const names = new Set([...Object.keys(ps), ...Object.keys(os)])
    const m: any[] = Array.from(names).map((n: string) => ({
      name: ps[n]?.name || os[n]?.name || n,
      pre: ps[n]?.score ?? null, post: os[n]?.score ?? null,
      preCorrect: ps[n]?.correct ?? null, postCorrect: os[n]?.correct ?? null,
      preAnswers: ps[n]?.qAnswers ?? {}, postAnswers: os[n]?.qAnswers ?? {},
      imp: ps[n]?.score != null && os[n]?.score != null ? os[n].score - ps[n].score : null,
      pass: (os[n]?.score ?? ps[n]?.score ?? 0) >= PASS
    })).sort((a: any, b: any) => a.name.localeCompare(b.name))

    const wb = m.filter((r: any) => r.pre != null && r.post != null)
    setAp(wb.length ? Math.round(wb.reduce((a: number, b: any) => a + (b.pre || 0), 0) / wb.length) : 0)
    setAo(wb.length ? Math.round(wb.reduce((a: number, b: any) => a + (b.post || 0), 0) / wb.length) : 0)
    setPc(m.filter((r: any) => r.pass).length)
    const qa = preQs.map((q: any, idx: number) => {
      const postQ = postQs[idx]
      const preResps = (d.data || []).filter((r: any) => r.question_id === q.id)
      const postResps = postQ ? (f.data || []).filter((r: any) => r.question_id === postQ.id) : []
      const preCorrect = preResps.filter((r: any) => Number(r.answer_index) === Number(q.correct_option_index)).length
      const postCorrect = postResps.filter((r: any) => Number(r.answer_index) === Number(q.correct_option_index)).length
      return { index: idx + 1, question: q.question_text, correctIndex: q.correct_option_index, prePct: preResps.length > 0 ? Math.round(preCorrect / preResps.length * 100) : 0, postPct: postResps.length > 0 ? Math.round(postCorrect / postResps.length * 100) : 0, improvement: (postResps.length > 0 ? Math.round(postCorrect / postResps.length * 100) : 0) - (preResps.length > 0 ? Math.round(preCorrect / preResps.length * 100) : 0) }
    })
    setQuestionAnalysis(qa)
    setResults(m); setLoading(false); setDone(true)
  }

  async function exportExcel() {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
    document.head.appendChild(script)
    await new Promise(resolve => { script.onload = resolve })
    const XLSX = (window as any).XLSX
    const wb = XLSX.utils.book_new()

    if (mode === 'single' && singleResults.length > 0) {
      // Sheet 1: Final Scores
      const scoreSheet = [['Rank','Player','Correct Answers','Incorrect Answers','Score %','Status']]
      singleResults.forEach((r: any, i: number) => { scoreSheet.push([i+1, r.name, r.correct, r.wrong, r.pct+'%', r.pass?'PASS':'FAIL'] as any) })
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(scoreSheet), 'Final Scores')
      // Sheet per question
      singleQuestions.forEach((q: any, qi: number) => {
        const qSheet = [['Player','Answer','Correct/Wrong']]
        const opts = q.options?.sort((a: any, b: any) => a.option_index - b.option_index) || []
        const correctOpt = opts.find((o: any) => Number(o.option_index) === Number(q.correct_option_index))
        singleResults.forEach((r: any) => {
          const ans = r.answers[q.id]
          qSheet.push([r.name, ans?.answerText || 'No answer', ans?.correct ? '✓ Correct' : '✗ Wrong'] as any)
        })
        qSheet.push([] as any)
        qSheet.push(['Correct Answer:', correctOpt?.option_text || ''] as any)
        const sheetName = 'Q' + (qi+1)
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(qSheet), sheetName)
      })
    } else if (mode === 'compare' && results.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Metric','Value'],['Total',results.length],['Avg Pre',ap+'%'],['Avg Post',ao+'%'],['Improvement',(ao-ap>=0?'+':'')+(ao-ap)+'%'],['Pass Rate',Math.round(pc/results.length*100)+'%']]), 'Summary')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Name','Pre %','Post %','Improvement','Status'],...results.map((r:any)=>[r.name,r.pre??'N/A',r.post??'N/A',r.imp!=null?(r.imp>=0?'+':'')+r.imp+'%':'N/A',r.pass?'PASS':'FAIL'])]), 'Individual Results')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['#','Question','Pre %','Post %','Improvement','Difficulty'],...questionAnalysis.map((q:any)=>[q.index,q.question,q.prePct+'%',q.postPct+'%',(q.improvement>=0?'+':'')+q.improvement+'%',q.postPct>=70?'Easy':q.postPct>=40?'Medium':'Hard'])]), 'Question Analysis')
    }
    XLSX.writeFile(wb, 'GEP_TrainIQ_Report.xlsx')
  }

  async function exportPPT() {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'
    document.head.appendChild(script)
    await new Promise(resolve => { script.onload = resolve })
    const PptxGenJS = (window as any).PptxGenJS
    const prs = new PptxGenJS()
    prs.layout = 'LAYOUT_WIDE'
    const NAVY = '0a1628', WHITE = 'FFFFFF', GREEN = '00A651', RED = 'ED1C24'
    const sessionTitle = mode === 'single' ? sessions.find((s:any)=>s.id===selectedSession)?.title : sessions.find((s:any)=>s.id===pre)?.title?.replace(' Pre-Test |','')

    const s1 = prs.addSlide(); s1.background={color:NAVY}
    s1.addText('GEP TrainIQ', {x:1,y:1.5,w:11,h:0.6,fontSize:14,color:'AAAAAA',fontFace:'Calibri'})
    s1.addText('Training Report', {x:1,y:2.2,w:11,h:1,fontSize:36,color:WHITE,fontFace:'Calibri',bold:true})
    s1.addText(sessionTitle||'',{x:1,y:3.3,w:11,h:0.5,fontSize:18,color:'CCCCCC',fontFace:'Calibri'})

    if (mode === 'single' && singleResults.length > 0) {
      const s2 = prs.addSlide()
      s2.addText('Final Scores', {x:0.5,y:0.3,w:12,h:0.6,fontSize:24,color:NAVY,fontFace:'Calibri',bold:true})
      const rows:any[] = [[{text:'Rank',options:{bold:true,color:WHITE,fill:{color:NAVY},align:'center'}},{text:'Name',options:{bold:true,color:WHITE,fill:{color:NAVY}}},{text:'Correct',options:{bold:true,color:WHITE,fill:{color:NAVY},align:'center'}},{text:'Wrong',options:{bold:true,color:WHITE,fill:{color:NAVY},align:'center'}},{text:'Score',options:{bold:true,color:WHITE,fill:{color:NAVY},align:'center'}},{text:'Status',options:{bold:true,color:WHITE,fill:{color:NAVY},align:'center'}}]]
      singleResults.slice(0,20).forEach((r:any,i:number)=>{ rows.push([{text:String(i+1),options:{align:'center',color:'333333'}},{text:r.name,options:{color:'333333'}},{text:String(r.correct),options:{align:'center',color:GREEN}},{text:String(r.wrong),options:{align:'center',color:RED}},{text:r.pct+'%',options:{align:'center',color:r.pct>=70?GREEN:RED}},{text:r.pass?'PASS':'FAIL',options:{align:'center',bold:true,color:r.pass?GREEN:RED}}]) })
      s2.addTable(rows,{x:0.5,y:1.1,w:12.5,fontSize:11,fontFace:'Calibri',border:{type:'solid',color:'DDDDDD',pt:0.5},rowH:0.28})
    } else if (mode === 'compare' && results.length > 0) {
      const s2 = prs.addSlide()
      s2.addText('Results Summary', {x:0.5,y:0.3,w:12,h:0.6,fontSize:24,color:NAVY,fontFace:'Calibri',bold:true})
      s2.addText('Pre: '+ap+'%  →  Post: '+ao+'%  |  Improvement: '+(ao-ap>=0?'+':'')+(ao-ap)+'%  |  Pass Rate: '+Math.round(pc/results.length*100)+'%', {x:0.5,y:1.2,w:12,h:0.5,fontSize:14,color:'444444',fontFace:'Calibri'})
      s2.addText((ao-ap>=0?'+':'')+(ao-ap)+'% improvement',{x:0.5,y:2.0,w:12,h:0.8,fontSize:32,color:ao-ap>=0?GREEN:RED,fontFace:'Calibri',bold:true})
    }
    await prs.writeFile({fileName:'GEP_TrainIQ_Report.pptx'})
    alert('PowerPoint downloaded!')
  }

  const pr = results.length ? Math.round(pc / results.length * 100) : 0
  const hardestQs = [...questionAnalysis].sort((a, b) => a.prePct - b.prePct).slice(0, 3)
  const mostImproved = [...results].filter(r => r.imp !== null).sort((a, b) => b.imp - a.imp)[0]
  const failedParticipants = results.filter(r => !r.pass)

  return (
    <div className="max-w-6xl mx-auto p-4 py-8">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <a href="/admin" className="text-blue-600 hover:underline text-sm">← Dashboard</a>
          <h1 className="text-2xl font-bold text-gray-800">📊 {lang === 'id' ? 'Laporan Training' : 'Training Reports'}</h1>
        </div>
        <LangToggle />
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => { setMode('single'); setDone(false) }} className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${mode === 'single' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300'}`}>
          📋 {lang === 'id' ? 'Satu Sesi' : 'Single Session'}
        </button>
        <button onClick={() => { setMode('compare'); setDone(false) }} className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${mode === 'compare' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300'}`}>
          📊 {lang === 'id' ? 'Pre vs Post' : 'Pre vs Post Compare'}
        </button>
      </div>

      {/* Single Session Mode */}
      {mode === 'single' && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">{lang === 'id' ? 'Pilih Sesi' : 'Select Session'}</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <select className="input" value={selectedSession} onChange={(e: any) => setSelectedSession(e.target.value)}>
                <option value="">{lang === 'id' ? '-- Pilih Sesi --' : '-- Select Session --'}</option>
                {sessions.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
            <button onClick={genSingle} disabled={!selectedSession || loading} className="btn-primary">
              {loading ? '...' : '📊 ' + (lang === 'id' ? 'Generate' : 'Generate')}
            </button>
          </div>
        </div>
      )}

      {/* Compare Mode */}
      {mode === 'compare' && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">{lang === 'id' ? 'Pilih Sesi' : 'Select Sessions'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div><label className="label">Pre-Test</label>
              <select className="input" value={pre} onChange={(e: any) => setPre(e.target.value)}>
                <option value="">{lang === 'id' ? '-- Pilih --' : '-- Select --'}</option>
                {preS.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
            <div><label className="label">Post-Test</label>
              <select className="input" value={post} onChange={(e: any) => setPost(e.target.value)}>
                <option value="">{lang === 'id' ? '-- Pilih --' : '-- Select --'}</option>
                {postS.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
          </div>
          <button onClick={genCompare} disabled={!pre || !post || loading} className="btn-primary">
            {loading ? (lang === 'id' ? 'Memproses...' : 'Processing...') : '📊 ' + (lang === 'id' ? 'Generate Laporan' : 'Generate Report')}
          </button>
        </div>
      )}

      {/* Single Session Results */}
      {mode === 'single' && done && singleResults.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              {v: String(singleResults.length), l: lang==='id'?'Total Peserta':'Total Players', c:'text-blue-700'},
              {v: String(singleResults.filter((r:any)=>r.pass).length), l: lang==='id'?'Lulus':'Passed', c:'text-green-600'},
              {v: String(singleResults.filter((r:any)=>!r.pass).length), l: lang==='id'?'Tidak Lulus':'Failed', c:'text-red-600'},
              {v: Math.round(singleResults.filter((r:any)=>r.pass).length/singleResults.length*100)+'%', l: 'Pass Rate', c: Math.round(singleResults.filter((r:any)=>r.pass).length/singleResults.length*100)>=70?'text-green-600':'text-red-600'},
            ].map((x:any) => (
              <div key={x.l} className="card text-center py-4">
                <div className={`text-3xl font-bold ${x.c}`}>{x.v}</div>
                <div className="text-xs text-gray-500 mt-1">{x.l}</div>
              </div>
            ))}
          </div>

          {/* Export buttons */}
          <div className="flex gap-3 mb-6">
            <button onClick={exportExcel} className="btn-primary">⬇ Export Excel</button>
            <button onClick={exportPPT} className="btn-secondary">📊 Export PowerPoint</button>
            <button onClick={() => window.print()} className="btn-secondary">🖨️ Print</button>
          </div>

          {/* Tabs: Final Scores + Q1, Q2... */}
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            <button onClick={() => setActiveQTab(-1)} className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeQTab === -1 ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              🏆 {lang === 'id' ? 'Skor Akhir' : 'Final Scores'}
            </button>
            {singleQuestions.map((_: any, i: number) => (
              <button key={i} onClick={() => setActiveQTab(i)} className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeQTab === i ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Q{i + 1}
              </button>
            ))}
          </div>

          {/* Final Scores Tab */}
          {activeQTab === -1 && (
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-4">🏆 {lang === 'id' ? 'Skor Akhir' : 'Final Scores'}</h3>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200">
                  <th className="text-center py-2 px-3 text-gray-600 font-medium w-12">{lang === 'id' ? 'No' : 'Rank'}</th>
                  <th className="text-left py-2 px-3 text-gray-600 font-medium">{lang === 'id' ? 'Peserta' : 'Player'}</th>
                  <th className="text-center py-2 px-3 text-gray-600 font-medium">✅ {lang === 'id' ? 'Benar' : 'Correct'}</th>
                  <th className="text-center py-2 px-3 text-gray-600 font-medium">❌ {lang === 'id' ? 'Salah' : 'Wrong'}</th>
                  <th className="text-center py-2 px-3 text-gray-600 font-medium">Score %</th>
                  <th className="text-center py-2 px-3 text-gray-600 font-medium">Status</th>
                </tr></thead>
                <tbody>
                  {singleResults.map((r: any, i: number) => (
                    <tr key={i} className={`border-b border-gray-100 hover:bg-gray-50 ${i === 0 ? 'bg-yellow-50' : i === 1 ? 'bg-gray-50' : i === 2 ? 'bg-orange-50' : ''}`}>
                      <td className="py-2 px-3 text-center font-bold text-gray-500">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                      <td className="py-2 px-3 font-medium text-gray-800">{r.name}</td>
                      <td className="py-2 px-3 text-center font-bold text-green-600">{r.correct}</td>
                      <td className="py-2 px-3 text-center font-bold text-red-500">{r.wrong}</td>
                      <td className="py-2 px-3 text-center"><span className={`font-mono font-bold ${r.pct >= 70 ? 'text-green-600' : 'text-red-500'}`}>{r.pct}%</span></td>
                      <td className="py-2 px-3 text-center"><span className={`text-xs px-2 py-1 rounded-full font-medium ${r.pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{r.pass ? 'PASS' : 'FAIL'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Question Tab */}
          {activeQTab >= 0 && singleQuestions[activeQTab] && (
            <div className="card">
              {(() => {
                const q = singleQuestions[activeQTab]
                const opts = q.options?.sort((a: any, b: any) => a.option_index - b.option_index) || []
                const correctOpt = opts.find((o: any) => Number(o.option_index) === Number(q.correct_option_index))
                return (
                  <>
                    <div className="mb-4">
                      <div className="text-xs text-gray-400 mb-1">Q{activeQTab + 1} / {singleQuestions.length}</div>
                      <h3 className="font-semibold text-gray-800 text-base">{q.question_text}</h3>
                      <div className="mt-2 inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                        <span className="text-xs text-gray-500">{lang === 'id' ? 'Jawaban Benar:' : 'Correct Answer:'}</span>
                        <span className="text-sm font-semibold text-green-700">{String.fromCharCode(65 + Number(q.correct_option_index))}. {correctOpt?.option_text}</span>
                      </div>
                    </div>
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-600 font-medium">{lang === 'id' ? 'Peserta' : 'Player'}</th>
                        <th className="text-left py-2 px-3 text-gray-600 font-medium">{lang === 'id' ? 'Jawaban Dipilih' : 'Selected Answer'}</th>
                        <th className="text-center py-2 px-3 text-gray-600 font-medium">{lang === 'id' ? 'Hasil' : 'Result'}</th>
                      </tr></thead>
                      <tbody>
                        {singleResults.map((r: any, i: number) => {
                          const ans = r.answers[q.id]
                          return (
                            <tr key={i} className={`border-b border-gray-100 ${ans?.correct ? 'hover:bg-green-50' : 'hover:bg-red-50'}`}>
                              <td className="py-2 px-3 font-medium text-gray-800">{r.name}</td>
                              <td className="py-2 px-3 text-gray-600">
                                {ans?.answered !== null && ans?.answered !== undefined ? (
                                  <span className={ans?.correct ? 'text-green-700' : 'text-red-600'}>
                                    {String.fromCharCode(65 + Number(ans.answered))}. {ans.answerText}
                                  </span>
                                ) : <span className="text-gray-400 italic">{lang === 'id' ? 'Tidak menjawab' : 'No answer'}</span>}
                              </td>
                              <td className="py-2 px-3 text-center text-lg">{ans?.correct ? '✅' : '❌'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </>
                )
              })()}
            </div>
          )}
        </>
      )}

      {/* Compare Mode Results */}
      {mode === 'compare' && done && results.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[{v:String(results.length),l:lang==='id'?'Total Peserta':'Total Participants',c:'text-blue-700'},{v:ap+'%',l:'Avg Pre-Test',c:'text-amber-600'},{v:ao+'%',l:'Avg Post-Test',c:'text-green-600'},{v:pr+'%',l:'Pass Rate',c:pr>=70?'text-green-600':'text-red-600'}].map((x:any)=>(
              <div key={x.l} className="card text-center py-4"><div className={`text-3xl font-bold ${x.c}`}>{x.v}</div><div className="text-xs text-gray-500 mt-1">{x.l}</div></div>
            ))}
          </div>
          <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl flex-wrap">
            {[{id:'summary',label:lang==='id'?'📈 Ringkasan':'📈 Summary'},{id:'questions',label:lang==='id'?'❓ Per Pertanyaan':'❓ By Question'},{id:'participants',label:lang==='id'?'👥 Per Peserta':'👥 By Participant'},{id:'insights',label:lang==='id'?'💡 Insights':'💡 Insights'}].map(tab=>(
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1 ${activeTab===tab.id?'bg-white text-blue-700 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>{tab.label}</button>
            ))}
          </div>
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="card">
                <div className="flex justify-between items-center mb-3"><h3 className="font-semibold text-gray-700">Pre vs Post</h3><span className={`text-sm font-semibold ${ao>=ap?'text-green-600':'text-red-600'}`}>{ao>=ap?'+':''}{ao-ap}% improvement</span></div>
                {[{l:'Pre-Test Average',v:ap,c:'bg-amber-400'},{l:'Post-Test Average',v:ao,c:'bg-green-500'},{l:'Passing Score (70%)',v:PASS,c:'bg-blue-600'}].map((x:any)=>(
                  <div key={x.l} className="mb-3"><div className="flex justify-between text-xs text-gray-500 mb-1"><span>{x.l}</span><span>{x.v}%</span></div><div className="h-6 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${x.c} rounded-full`} style={{width:x.v+'%'}} /></div></div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={exportExcel} className="btn-primary">⬇ Export Excel (5 Sheets)</button>
                <button onClick={exportPPT} className="btn-secondary">📊 Export PowerPoint</button>
                <button onClick={()=>window.print()} className="btn-secondary">🖨️ Print</button>
              </div>
            </div>
          )}
          {activeTab === 'questions' && (
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-4">{lang==='id'?'Analisis Per Pertanyaan':'Question Analysis'}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-600 font-medium">#</th>
                    <th className="text-left py-2 px-3 text-gray-600 font-medium">{lang==='id'?'Pertanyaan':'Question'}</th>
                    <th className="text-center py-2 px-3 text-gray-600 font-medium">Pre %</th>
                    <th className="text-center py-2 px-3 text-gray-600 font-medium">Post %</th>
                    <th className="text-center py-2 px-3 text-gray-600 font-medium">{lang==='id'?'Peningkatan':'Improvement'}</th>
                    <th className="text-center py-2 px-3 text-gray-600 font-medium">{lang==='id'?'Kesulitan':'Difficulty'}</th>
                    <th className="text-left py-2 px-3 text-gray-600 font-medium">{lang==='id'?'Jawaban Benar':'Correct Answer'}</th>
                  </tr></thead>
                  <tbody>
                    {questionAnalysis.map((q:any,i:number)=>(
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-500 font-mono">{q.index}</td>
                        <td className="py-2 px-3 text-gray-800 max-w-xs"><div className="truncate" title={q.question}>{q.question}</div></td>
                        <td className="py-2 px-3 text-center"><span className={`font-semibold ${q.prePct>=70?'text-green-600':q.prePct>=40?'text-amber-600':'text-red-500'}`}>{q.prePct}%</span></td>
                        <td className="py-2 px-3 text-center"><span className={`font-semibold ${q.postPct>=70?'text-green-600':q.postPct>=40?'text-amber-600':'text-red-500'}`}>{q.postPct}%</span></td>
                        <td className="py-2 px-3 text-center"><span className={`font-semibold ${q.improvement>=0?'text-green-600':'text-red-500'}`}>{q.improvement>=0?'+':''}{q.improvement}%</span></td>
                        <td className="py-2 px-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${q.postPct>=70?'bg-green-100 text-green-700':q.postPct>=40?'bg-amber-100 text-amber-700':'bg-red-100 text-red-600'}`}>{q.postPct>=70?(lang==='id'?'Mudah':'Easy'):q.postPct>=40?(lang==='id'?'Sedang':'Medium'):(lang==='id'?'Sulit':'Hard')}</span></td>
                        <td className="py-2 px-3 text-left text-xs text-green-700 font-medium">{String.fromCharCode(65+Number(q.correctIndex))}. {preQuestions[q.index-1]?.options?.find((o:any)=>Number(o.option_index)===Number(q.correctIndex))?.option_text?.substring(0,30)||''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'participants' && (
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-4">{lang==='id'?'Detail Per Peserta':'Participant Detail'}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 text-gray-600 font-medium sticky left-0 bg-white">{lang==='id'?'Nama':'Name'}</th>
                      {preQuestions.map((_:any,i:number)=>(<th key={i} colSpan={2} className="text-center py-2 px-2 text-gray-600 font-medium border-l border-gray-100">Q{i+1}</th>))}
                      <th className="text-center py-2 px-2 text-gray-600 font-medium border-l border-gray-200">Pre</th>
                      <th className="text-center py-2 px-2 text-gray-600 font-medium">Post</th>
                      <th className="text-center py-2 px-2 text-gray-600 font-medium">Status</th>
                    </tr>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="py-1 px-2 sticky left-0 bg-gray-50"></th>
                      {preQuestions.map((_:any,i:number)=>(<><th key={`pre-${i}`} className="py-1 px-1 text-center text-gray-400 font-normal border-l border-gray-100">Pre</th><th key={`post-${i}`} className="py-1 px-1 text-center text-gray-400 font-normal">Post</th></>))}
                      <th colSpan={3}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r:any,i:number)=>(
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 font-medium text-gray-800 sticky left-0 bg-white whitespace-nowrap">{r.name}</td>
                        {preQuestions.map((q:any,qi:number)=>{
                          const postQ=postQuestions[qi]; const preAns=r.preAnswers[q.id]; const postAns=postQ?r.postAnswers[postQ.id]:null
                          const getOpt=(opts:any[],idx:number)=>{ if(idx===null||idx===undefined)return '—'; const o=opts?.find((o:any)=>Number(o.option_index)===Number(idx)); return o?String.fromCharCode(65+Number(idx))+'.'+o.option_text.substring(0,15):String.fromCharCode(65+Number(idx)) }
                          return (<><td key={`pre-${qi}`} className="py-2 px-1 text-center border-l border-gray-100">{preAns?(<div className={`text-xs rounded px-1 py-0.5 ${preAns.correct?'bg-green-50 text-green-700':'bg-red-50 text-red-600'}`}>{preAns.correct?'✅':'❌'}<div className="text-xs opacity-70 truncate max-w-16">{getOpt(preAns.options,preAns.answeredIdx)}</div></div>):<span className="text-gray-300">—</span>}</td><td key={`post-${qi}`} className="py-2 px-1 text-center">{postAns?(<div className={`text-xs rounded px-1 py-0.5 ${postAns.correct?'bg-green-50 text-green-700':'bg-red-50 text-red-600'}`}>{postAns.correct?'✅':'❌'}<div className="text-xs opacity-70 truncate max-w-16">{getOpt(postAns.options,postAns.answeredIdx)}</div></div>):<span className="text-gray-300">—</span>}</td></>)
                        })}
                        <td className="py-2 px-2 text-center border-l border-gray-200 font-semibold">{r.pre!=null?r.pre+'%':'—'}</td>
                        <td className="py-2 px-2 text-center font-semibold">{r.post!=null?r.post+'%':'—'}</td>
                        <td className="py-2 px-2 text-center"><span className={`px-2 py-0.5 rounded-full font-medium text-xs ${r.pass?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>{r.pass?'PASS':'FAIL'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'insights' && (
            <div className="space-y-4">
              <div className="card"><h3 className="font-semibold text-gray-700 mb-3">🔴 {lang==='id'?'Pertanyaan Tersulit':'Hardest Questions'}</h3><div className="space-y-2">{hardestQs.map((q:any,i:number)=>(<div key={i} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100"><div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">Q{q.index}</div><div className="flex-1 min-w-0"><div className="text-sm text-gray-800 truncate">{q.question}</div><div className="text-xs text-gray-500 mt-0.5">Only {q.postPct}% correct in Post-Test</div></div><div className="text-red-600 font-bold">{q.postPct}%</div></div>))}</div></div>
              {mostImproved&&(<div className="card"><h3 className="font-semibold text-gray-700 mb-3">🚀 {lang==='id'?'Paling Meningkat':'Most Improved'}</h3><div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-100"><div className="text-4xl">🏆</div><div><div className="font-bold text-gray-800 text-lg">{mostImproved.name}</div><div className="text-sm text-gray-500">{mostImproved.pre}% → {mostImproved.post}% <span className="text-green-600 font-semibold">+{mostImproved.imp}%</span></div></div></div></div>)}
              {failedParticipants.length>0&&(<div className="card"><h3 className="font-semibold text-gray-700 mb-3">⚠️ {lang==='id'?'Tidak Lulus':'Failed'} ({failedParticipants.length})</h3><div className="space-y-2">{failedParticipants.map((r:any,i:number)=>(<div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100"><span className="font-medium text-gray-800">{r.name}</span><div className="flex items-center gap-3 text-sm"><span className="text-gray-500">Pre: {r.pre??'—'}%</span><span className="text-gray-500">Post: {r.post??'—'}%</span><span className="text-red-600 font-semibold px-2 py-0.5 bg-red-100 rounded-full">FAIL</span></div></div>))}</div></div>)}
              <div className="card"><h3 className="font-semibold text-gray-700 mb-3">📊 Pass/Fail</h3><div className="flex gap-4"><div className="flex-1 text-center p-4 bg-green-50 rounded-xl border border-green-100"><div className="text-3xl font-bold text-green-600">{pc}</div><div className="text-sm text-gray-500 mt-1">{lang==='id'?'Lulus':'Passed'}</div></div><div className="flex-1 text-center p-4 bg-red-50 rounded-xl border border-red-100"><div className="text-3xl font-bold text-red-600">{results.length-pc}</div><div className="text-sm text-gray-500 mt-1">{lang==='id'?'Tidak Lulus':'Failed'}</div></div><div className="flex-1 text-center p-4 bg-blue-50 rounded-xl border border-blue-100"><div className="text-3xl font-bold text-blue-700">{pr}%</div><div className="text-sm text-gray-500 mt-1">Pass Rate</div></div></div></div>
            </div>
          )}
        </>
      )}
      {done && ((mode==='single'&&singleResults.length===0)||(mode==='compare'&&results.length===0)) && <div className="card text-center text-gray-400 py-12">{lang==='id'?'Belum ada respons.':'No responses yet.'}</div>}
    </div>
  )
}
