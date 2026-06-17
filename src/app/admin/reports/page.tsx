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
  const [questionAnalysis, setQuestionAnalysis] = useState<any[]>([])
  const [preQuestions, setPreQuestions] = useState<any[]>([])
  const [postQuestions, setPostQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [ap, setAp] = useState(0)
  const [ao, setAo] = useState(0)
  const [pc, setPc] = useState(0)
  const [activeTab, setActiveTab] = useState('summary')
  const { lang } = useLang()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: any) => {
      if (data.user) supabase.from('sessions').select('*').order('title').then(({ data: d }: any) => { if (d) setSessions(d) })
    })
  }, [])

  const preS = sessions.filter((s: any) => s.title.includes('Pre-Test'))
  const postS = sessions.filter((s: any) => s.title.includes('Post-Test'))

  async function gen() {
    if (!pre || !post) return
    setLoading(true)
    const a = await supabase.from('questions').select('id,correct_option_index,question_text,order_index').eq('session_id', pre).order('order_index')
    const b = await supabase.from('questions').select('id,correct_option_index,question_text,order_index').eq('session_id', post).order('order_index')
    const c = await supabase.from('participants').select('id,display_name').eq('session_id', pre)
    const d = await supabase.from('responses').select('*').eq('session_id', pre)
    const e = await supabase.from('participants').select('id,display_name').eq('session_id', post)
    const f = await supabase.from('responses').select('*').eq('session_id', post)

    const preQs = a.data || []
    const postQs = b.data || []
    setPreQuestions(preQs)
    setPostQuestions(postQs)

    function sc(ps: any[], rs: any[], qs: any[]) {
      const scores: Record<string, any> = {}
      ps.forEach((p: any) => {
        const pr = rs.filter((r: any) => r.participant_id === p.id)
        let correct = 0
        const qAnswers: Record<string, any> = {}
        qs.forEach((q: any) => {
          const r = pr.find((r: any) => r.question_id === q.id)
          const isCorrect = r ? Number(r.answer_index) === Number(q.correct_option_index) : null
          qAnswers[q.id] = { answered: r?.answer_index ?? null, correct: isCorrect }
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
      pre: ps[n]?.score ?? null,
      post: os[n]?.score ?? null,
      preCorrect: ps[n]?.correct ?? null,
      postCorrect: os[n]?.correct ?? null,
      preAnswers: ps[n]?.qAnswers ?? {},
      postAnswers: os[n]?.qAnswers ?? {},
      imp: ps[n]?.score != null && os[n]?.score != null ? os[n].score - ps[n].score : null,
      pass: (os[n]?.score ?? ps[n]?.score ?? 0) >= PASS
    })).sort((a: any, b: any) => a.name.localeCompare(b.name))

    const wb = m.filter((r: any) => r.pre != null && r.post != null)
    setAp(wb.length ? Math.round(wb.reduce((a: number, b: any) => a + (b.pre || 0), 0) / wb.length) : 0)
    setAo(wb.length ? Math.round(wb.reduce((a: number, b: any) => a + (b.post || 0), 0) / wb.length) : 0)
    setPc(m.filter((r: any) => r.pass).length)

    // Question analysis
    const qa = preQs.map((q: any, idx: number) => {
      const preResps = (d.data || []).filter((r: any) => r.question_id === q.id)
      const postQ = postQs[idx]
      const postResps = postQ ? (f.data || []).filter((r: any) => r.question_id === postQ.id) : []
      const preCorrect = preResps.filter((r: any) => Number(r.answer_index) === Number(q.correct_option_index)).length
      const postCorrect = postResps.filter((r: any) => Number(r.answer_index) === Number(q.correct_option_index)).length
      const prePct = preResps.length > 0 ? Math.round(preCorrect / preResps.length * 100) : 0
      const postPct = postResps.length > 0 ? Math.round(postCorrect / postResps.length * 100) : 0
      return {
        index: idx + 1,
        question: q.question_text,
        correctIndex: q.correct_option_index,
        prePct, postPct,
        improvement: postPct - prePct,
        preTotal: preResps.length,
        postTotal: postResps.length,
      }
    })
    setQuestionAnalysis(qa)
    setResults(m); setLoading(false); setDone(true)
  }

  async function csv() {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
    document.head.appendChild(script)
    await new Promise(resolve => { script.onload = resolve })
    const XLSX = (window as any).XLSX
    const wb = XLSX.utils.book_new()
    // Sheet 1 - Summary
    const ws1 = XLSX.utils.aoa_to_sheet([
      ['GEP TrainIQ Training Report'],[''],
      ['Metric','Value'],
      ['Total Participants', results.length],
      ['Avg Pre-Test', ap+'%'],['Avg Post-Test', ao+'%'],
      ['Improvement', (ao-ap>=0?'+':'')+(ao-ap)+'%'],
      ['Pass Rate', Math.round(pc/results.length*100)+'%'],
      ['Failed', results.length-pc],
    ])
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary')
    // Sheet 2 - Individual
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Name','Pre-Test (%)','Post-Test (%)','Improvement','Status'],
      ...results.map((r:any) => [r.name, r.pre??'N/A', r.post??'N/A', r.imp!=null?(r.imp>=0?'+':'')+r.imp+'%':'N/A', r.pass?'PASS':'FAIL'])
    ])
    XLSX.utils.book_append_sheet(wb, ws2, 'Individual Results')
    // Sheet 3 - Question Analysis
    const ws3 = XLSX.utils.aoa_to_sheet([
      ['#','Question','Pre %','Post %','Improvement','Difficulty'],
      ...questionAnalysis.map((q:any) => [q.index, q.question, q.prePct+'%', q.postPct+'%', (q.improvement>=0?'+':'')+q.improvement+'%', q.postPct>=70?'Easy':q.postPct>=40?'Medium':'Hard'])
    ])
    XLSX.utils.book_append_sheet(wb, ws3, 'Question Analysis')
    // Sheet 4 - Participant Matrix
    const matrixHeader = ['Name', ...preQuestions.map((_:any,i:number) => ['Q'+(i+1)+' Pre','Q'+(i+1)+' Post']).flat(), 'Pre Total','Post Total','Status']
    const matrixRows = results.map((r:any) => {
      const row:any[] = [r.name]
      preQuestions.forEach((q:any,qi:number) => {
        const postQ = postQuestions[qi]
        const pa = r.preAnswers[q.id]
        const oa = postQ ? r.postAnswers[postQ.id] : null
        row.push(pa ? (pa.correct?'Correct':'Wrong') : 'N/A')
        row.push(oa ? (oa.correct?'Correct':'Wrong') : 'N/A')
      })
      row.push(r.pre!=null?r.pre+'%':'N/A')
      row.push(r.post!=null?r.post+'%':'N/A')
      row.push(r.pass?'PASS':'FAIL')
      return row
    })
    const ws4 = XLSX.utils.aoa_to_sheet([matrixHeader, ...matrixRows])
    XLSX.utils.book_append_sheet(wb, ws4, 'Participant Detail')
    // Sheet 5 - Insights
    const ws5 = XLSX.utils.aoa_to_sheet([
      ['INSIGHTS'],[''],
      ['Hardest Questions'],['#','Question','Post %'],
      ...[...questionAnalysis].sort((a,b)=>a.postPct-b.postPct).slice(0,3).map((q:any)=>[q.index,q.question,q.postPct+'%']),
      [''],['Failed Participants'],['Name','Pre','Post'],
      ...results.filter((r:any)=>!r.pass).map((r:any)=>[r.name,r.pre??'N/A',r.post??'N/A'])
    ])
    XLSX.utils.book_append_sheet(wb, ws5, 'Insights')
    XLSX.writeFile(wb, 'GEP_TrainIQ_Report.xlsx')
  }

  async function exportPPT() {
    try {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'
      document.head.appendChild(script)
      await new Promise(resolve => script.onload = resolve)
      const PptxGenJS = (window as any).PptxGenJS
      const prs = new PptxGenJS()
      prs.layout = 'LAYOUT_WIDE'
      const NAVY = '0a1628', RED = 'ED1C24', WHITE = 'FFFFFF', GREEN = '00A651'
      const preTitle = sessions.find((s: any) => s.id === pre)?.title || 'Pre-Test'
      const postTitle = sessions.find((s: any) => s.id === post)?.title || 'Post-Test'

      // Slide 1 - Cover
      const s1 = prs.addSlide()
      s1.background = { color: NAVY }
      s1.addText('GEP TrainIQ', { x: 1, y: 1.5, w: 11, h: 0.6, fontSize: 14, color: 'AAAAAA', fontFace: 'Calibri' })
      s1.addText('Training Assessment Report', { x: 1, y: 2.2, w: 11, h: 1, fontSize: 36, color: WHITE, fontFace: 'Calibri', bold: true })
      s1.addText(preTitle.replace(' Pre-Test |', ''), { x: 1, y: 3.3, w: 11, h: 0.5, fontSize: 18, color: 'CCCCCC', fontFace: 'Calibri' })
      s1.addText('Pertamina Phase 5 — GEP SMART', { x: 1, y: 4.5, w: 11, h: 0.4, fontSize: 12, color: '888888', fontFace: 'Calibri' })

      // Slide 2 - Summary
      const s2 = prs.addSlide()
      s2.addText('Results Summary', { x: 0.5, y: 0.3, w: 12, h: 0.7, fontSize: 28, color: NAVY, fontFace: 'Calibri', bold: true })
      s2.addText('Total: ' + results.length + '  |  Pre-Test Avg: ' + ap + '%  |  Post-Test Avg: ' + ao + '%  |  Pass Rate: ' + Math.round(pc / results.length * 100) + '%', { x: 0.5, y: 1.2, w: 12, h: 0.5, fontSize: 14, color: '444444', fontFace: 'Calibri' })
      s2.addText((ao - ap >= 0 ? '+' : '') + (ao - ap) + '% improvement', { x: 0.5, y: 2.0, w: 12, h: 0.8, fontSize: 32, color: ao - ap >= 0 ? GREEN : RED, fontFace: 'Calibri', bold: true })

      // Slide 3 - Individual Results
      const s3 = prs.addSlide()
      s3.addText('Individual Results', { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, color: NAVY, fontFace: 'Calibri', bold: true })
      const rows: any[] = [[
        { text: 'Name', options: { bold: true, color: WHITE, fill: { color: NAVY } } },
        { text: 'Pre-Test', options: { bold: true, color: WHITE, fill: { color: NAVY }, align: 'center' } },
        { text: 'Post-Test', options: { bold: true, color: WHITE, fill: { color: NAVY }, align: 'center' } },
        { text: 'Improvement', options: { bold: true, color: WHITE, fill: { color: NAVY }, align: 'center' } },
        { text: 'Status', options: { bold: true, color: WHITE, fill: { color: NAVY }, align: 'center' } },
      ]]
      results.forEach((r: any) => {
        rows.push([
          { text: r.name, options: { color: '333333' } },
          { text: r.pre != null ? r.pre + '%' : '—', options: { align: 'center', color: (r.pre || 0) >= 70 ? GREEN : RED } },
          { text: r.post != null ? r.post + '%' : '—', options: { align: 'center', color: (r.post || 0) >= 70 ? GREEN : RED } },
          { text: r.imp != null ? (r.imp >= 0 ? '+' : '') + r.imp + '%' : '—', options: { align: 'center', color: r.imp != null && r.imp >= 0 ? GREEN : RED } },
          { text: r.pass ? 'PASS' : 'FAIL', options: { align: 'center', bold: true, color: r.pass ? GREEN : RED } },
        ])
      })
      s3.addTable(rows, { x: 0.5, y: 1.1, w: 12.5, fontSize: 11, fontFace: 'Calibri', border: { type: 'solid', color: 'DDDDDD', pt: 0.5 }, rowH: 0.3 })

      // Slide 4 - Question Analysis
      if (questionAnalysis.length > 0) {
        const s4 = prs.addSlide()
        s4.addText('Question Analysis', { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, color: NAVY, fontFace: 'Calibri', bold: true })
        const qRows: any[] = [[
          { text: '#', options: { bold: true, color: WHITE, fill: { color: NAVY }, align: 'center' } },
          { text: 'Question', options: { bold: true, color: WHITE, fill: { color: NAVY } } },
          { text: '% Correct Pre', options: { bold: true, color: WHITE, fill: { color: NAVY }, align: 'center' } },
          { text: '% Correct Post', options: { bold: true, color: WHITE, fill: { color: NAVY }, align: 'center' } },
          { text: 'Improvement', options: { bold: true, color: WHITE, fill: { color: NAVY }, align: 'center' } },
        ]]
        questionAnalysis.forEach((q: any) => {
          qRows.push([
            { text: String(q.index), options: { align: 'center', color: '333333' } },
            { text: q.question.substring(0, 60) + (q.question.length > 60 ? '...' : ''), options: { color: '333333' } },
            { text: q.prePct + '%', options: { align: 'center', color: q.prePct >= 70 ? GREEN : RED } },
            { text: q.postPct + '%', options: { align: 'center', color: q.postPct >= 70 ? GREEN : RED } },
            { text: (q.improvement >= 0 ? '+' : '') + q.improvement + '%', options: { align: 'center', color: q.improvement >= 0 ? GREEN : RED } },
          ])
        })
        s4.addTable(qRows, { x: 0.5, y: 1.1, w: 12.5, fontSize: 10, fontFace: 'Calibri', border: { type: 'solid', color: 'DDDDDD', pt: 0.5 }, rowH: 0.28 })
      }

      await prs.writeFile({ fileName: 'GEP_TrainIQ_Report.pptx' })
      alert('PowerPoint downloaded!')
    } catch (e) {
      console.error('PPT error:', e)
      alert('PPT generation failed: ' + e)
    }
  }

  const pr = results.length ? Math.round(pc / results.length * 100) : 0
  const hardestQs = [...questionAnalysis].sort((a, b) => a.prePct - b.prePct).slice(0, 3)
  const mostImproved = [...results].filter(r => r.imp !== null).sort((a, b) => b.imp - a.imp)[0]
  const failedParticipants = results.filter(r => !r.pass)

  return (
    <div className="max-w-6xl mx-auto p-4 py-8">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <a href="/admin" className="text-blue-600 hover:underline text-sm">← {lang === 'id' ? 'Dashboard' : 'Dashboard'}</a>
          <h1 className="text-2xl font-bold text-gray-800">📊 {lang === 'id' ? 'Laporan Hasil Training' : 'Training Reports'}</h1>
        </div>
        <LangToggle />
      </div>

      <div className="card mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">{lang === 'id' ? 'Pilih Sesi' : 'Select Session'}</h2>
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
        <button onClick={gen} disabled={!pre || !post || loading} className="btn-primary">
          {loading ? (lang === 'id' ? 'Memproses...' : 'Processing...') : '📊 ' + (lang === 'id' ? 'Generate Laporan' : 'Generate Report')}
        </button>
      </div>

      {done && results.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { v: String(results.length), l: lang === 'id' ? 'Total Peserta' : 'Total Participants', c: 'text-blue-700' },
              { v: ap + '%', l: 'Avg Pre-Test', c: 'text-amber-600' },
              { v: ao + '%', l: 'Avg Post-Test', c: 'text-green-600' },
              { v: pr + '%', l: 'Pass Rate', c: pr >= 70 ? 'text-green-600' : 'text-red-600' }
            ].map((x: any) => (
              <div key={x.l} className="card text-center py-4">
                <div className={`text-3xl font-bold ${x.c}`}>{x.v}</div>
                <div className="text-xs text-gray-500 mt-1">{x.l}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl flex-wrap">
            {[
              { id: 'summary', label: lang === 'id' ? '📈 Ringkasan' : '📈 Summary' },
              { id: 'questions', label: lang === 'id' ? '❓ Per Pertanyaan' : '❓ By Question' },
              { id: 'participants', label: lang === 'id' ? '👥 Per Peserta' : '👥 By Participant' },
              { id: 'insights', label: lang === 'id' ? '💡 Insights' : '💡 Insights' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1 ${activeTab === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Summary */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="card">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-gray-700">{lang === 'id' ? 'Perbandingan Pre vs Post' : 'Pre vs Post Comparison'}</h3>
                  <span className={`text-sm font-semibold ${ao >= ap ? 'text-green-600' : 'text-red-600'}`}>{ao >= ap ? '+' : ''}{ao - ap}% improvement</span>
                </div>
                {[{ l: 'Pre-Test Average', v: ap, c: 'bg-amber-400' }, { l: 'Post-Test Average', v: ao, c: 'bg-green-500' }, { l: 'Passing Score (70%)', v: PASS, c: 'bg-blue-600' }].map((x: any) => (
                  <div key={x.l} className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{x.l}</span><span>{x.v}%</span></div>
                    <div className="h-6 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${x.c} rounded-full`} style={{ width: x.v + '%' }} /></div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={csv} className="btn-primary">⬇ Export Excel (4 Sheets)</button>
                <button onClick={exportPPT} className="btn-secondary">📊 Export PowerPoint</button>
                <button onClick={() => window.print()} className="btn-secondary">🖨️ Print</button>
              </div>
            </div>
          )}

          {/* Tab: Questions */}
          {activeTab === 'questions' && (
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-4">{lang === 'id' ? 'Analisis Per Pertanyaan' : 'Question-Level Analysis'}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-600 font-medium">#</th>
                    <th className="text-left py-2 px-3 text-gray-600 font-medium">{lang === 'id' ? 'Pertanyaan' : 'Question'}</th>
                    <th className="text-center py-2 px-3 text-gray-600 font-medium">Pre %</th>
                    <th className="text-center py-2 px-3 text-gray-600 font-medium">Post %</th>
                    <th className="text-center py-2 px-3 text-gray-600 font-medium">{lang === 'id' ? 'Peningkatan' : 'Improvement'}</th>
                    <th className="text-center py-2 px-3 text-gray-600 font-medium">{lang === 'id' ? 'Kesulitan' : 'Difficulty'}</th>
                  </tr></thead>
                  <tbody>
                    {questionAnalysis.map((q: any, i: number) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-500 font-mono">{q.index}</td>
                        <td className="py-2 px-3 text-gray-800 max-w-xs"><div className="truncate" title={q.question}>{q.question}</div></td>
                        <td className="py-2 px-3 text-center"><span className={`font-semibold ${q.prePct >= 70 ? 'text-green-600' : q.prePct >= 40 ? 'text-amber-600' : 'text-red-500'}`}>{q.prePct}%</span></td>
                        <td className="py-2 px-3 text-center"><span className={`font-semibold ${q.postPct >= 70 ? 'text-green-600' : q.postPct >= 40 ? 'text-amber-600' : 'text-red-500'}`}>{q.postPct}%</span></td>
                        <td className="py-2 px-3 text-center"><span className={`font-semibold ${q.improvement >= 0 ? 'text-green-600' : 'text-red-500'}`}>{q.improvement >= 0 ? '+' : ''}{q.improvement}%</span></td>
                        <td className="py-2 px-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${q.postPct >= 70 ? 'bg-green-100 text-green-700' : q.postPct >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                            {q.postPct >= 70 ? (lang === 'id' ? 'Mudah' : 'Easy') : q.postPct >= 40 ? (lang === 'id' ? 'Sedang' : 'Medium') : (lang === 'id' ? 'Sulit' : 'Hard')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Participants Detail */}
          {activeTab === 'participants' && (
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-4">{lang === 'id' ? 'Detail Per Peserta' : 'Participant Detail'}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 text-gray-600 font-medium sticky left-0 bg-white">{lang === 'id' ? 'Nama' : 'Name'}</th>
                      {preQuestions.map((q: any, i: number) => (
                        <th key={i} colSpan={2} className="text-center py-2 px-2 text-gray-600 font-medium border-l border-gray-100">Q{i + 1}</th>
                      ))}
                      <th className="text-center py-2 px-2 text-gray-600 font-medium border-l border-gray-200">Pre</th>
                      <th className="text-center py-2 px-2 text-gray-600 font-medium">Post</th>
                      <th className="text-center py-2 px-2 text-gray-600 font-medium">Status</th>
                    </tr>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="py-1 px-2 sticky left-0 bg-gray-50"></th>
                      {preQuestions.map((_: any, i: number) => (
                        <>
                          <th key={`pre-${i}`} className="py-1 px-1 text-center text-gray-400 font-normal border-l border-gray-100">Pre</th>
                          <th key={`post-${i}`} className="py-1 px-1 text-center text-gray-400 font-normal">Post</th>
                        </>
                      ))}
                      <th colSpan={3}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r: any, i: number) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 font-medium text-gray-800 sticky left-0 bg-white whitespace-nowrap">{r.name}</td>
                        {preQuestions.map((q: any, qi: number) => {
                          const postQ = postQuestions[qi]
                          const preAns = r.preAnswers[q.id]
                          const postAns = postQ ? r.postAnswers[postQ.id] : null
                          return (
                            <>
                              <td key={`pre-${qi}`} className="py-2 px-1 text-center border-l border-gray-100">
                                {preAns ? (preAns.correct ? <span className="text-green-600">✅</span> : <span className="text-red-500">❌</span>) : <span className="text-gray-300">—</span>}
                              </td>
                              <td key={`post-${qi}`} className="py-2 px-1 text-center">
                                {postAns ? (postAns.correct ? <span className="text-green-600">✅</span> : <span className="text-red-500">❌</span>) : <span className="text-gray-300">—</span>}
                              </td>
                            </>
                          )
                        })}
                        <td className="py-2 px-2 text-center border-l border-gray-200 font-semibold">{r.pre != null ? r.pre + '%' : '—'}</td>
                        <td className="py-2 px-2 text-center font-semibold">{r.post != null ? r.post + '%' : '—'}</td>
                        <td className="py-2 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-medium text-xs ${r.pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{r.pass ? 'PASS' : 'FAIL'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Insights */}
          {activeTab === 'insights' && (
            <div className="space-y-4">
              {/* Hardest questions */}
              <div className="card">
                <h3 className="font-semibold text-gray-700 mb-3">🔴 {lang === 'id' ? 'Pertanyaan Tersulit (Post-Test)' : 'Hardest Questions (Post-Test)'}</h3>
                <div className="space-y-2">
                  {hardestQs.map((q: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                      <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">Q{q.index}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-800 truncate">{q.question}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Only {q.postPct}% got it right in Post-Test</div>
                      </div>
                      <div className="text-red-600 font-bold">{q.postPct}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Most improved */}
              {mostImproved && (
                <div className="card">
                  <h3 className="font-semibold text-gray-700 mb-3">🚀 {lang === 'id' ? 'Peserta Paling Meningkat' : 'Most Improved Participant'}</h3>
                  <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-100">
                    <div className="text-4xl">🏆</div>
                    <div>
                      <div className="font-bold text-gray-800 text-lg">{mostImproved.name}</div>
                      <div className="text-sm text-gray-500">{mostImproved.pre}% → {mostImproved.post}% <span className="text-green-600 font-semibold">+{mostImproved.imp}% improvement</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Failed participants */}
              {failedParticipants.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-700 mb-3">⚠️ {lang === 'id' ? 'Peserta yang Tidak Lulus' : 'Failed Participants'} ({failedParticipants.length})</h3>
                  <div className="space-y-2">
                    {failedParticipants.map((r: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                        <span className="font-medium text-gray-800">{r.name}</span>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-gray-500">Pre: {r.pre ?? '—'}%</span>
                          <span className="text-gray-500">Post: {r.post ?? '—'}%</span>
                          <span className="text-red-600 font-semibold px-2 py-0.5 bg-red-100 rounded-full">FAIL</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">* {lang === 'id' ? 'Pertimbangkan sesi remedial untuk peserta ini' : 'Consider remedial sessions for these participants'}</p>
                </div>
              )}

              {/* Pass rate summary */}
              <div className="card">
                <h3 className="font-semibold text-gray-700 mb-3">📊 {lang === 'id' ? 'Ringkasan Kelulusan' : 'Pass/Fail Summary'}</h3>
                <div className="flex gap-4">
                  <div className="flex-1 text-center p-4 bg-green-50 rounded-xl border border-green-100">
                    <div className="text-3xl font-bold text-green-600">{pc}</div>
                    <div className="text-sm text-gray-500 mt-1">{lang === 'id' ? 'Lulus' : 'Passed'}</div>
                  </div>
                  <div className="flex-1 text-center p-4 bg-red-50 rounded-xl border border-red-100">
                    <div className="text-3xl font-bold text-red-600">{results.length - pc}</div>
                    <div className="text-sm text-gray-500 mt-1">{lang === 'id' ? 'Tidak Lulus' : 'Failed'}</div>
                  </div>
                  <div className="flex-1 text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="text-3xl font-bold text-blue-700">{pr}%</div>
                    <div className="text-sm text-gray-500 mt-1">Pass Rate</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {done && results.length === 0 && <div className="card text-center text-gray-400 py-12">{lang === 'id' ? 'Belum ada respons.' : 'No responses yet.'}</div>}
    </div>
  )
}
