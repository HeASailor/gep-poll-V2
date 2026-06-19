'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useLang, LangToggle } from '@/lib/lang'

type Screen = 'join' | 'waiting' | 'question' | 'submitted' | 'ended'
const OPTION_COLORS = [
  { bg: '#E21B3C', icon: '▲' },
  { bg: '#1368CE', icon: '◆' },
  { bg: '#D89E00', icon: '●' },
  { bg: '#26890C', icon: '■' },
]
const T = {
  id: { title:'GEP TrainIQ',subtitle:'Pertamina Phase 5 Training',nameLabel:'Nama Lengkap',namePlaceholder:'Tulis nama Anda',codeLabel:'Kode Ruangan',joinBtn:'Bergabung',errorEmpty:'Masukkan kode dan nama.',errorNotFound:'Kode tidak ditemukan.',errorEnded:'Sesi sudah berakhir.',errorJoin:'Gagal bergabung.',waiting:'Menunggu Trainer',ended:'Sesi Selesai!',answered:'pertanyaan dijawab',backHome:'Kembali',submitted:'Jawaban Terkirim!',submittedDesc:'Menunggu pertanyaan berikutnya...',sendAnswer:'Kirim Jawaban',sending:'Mengirim...',timesUp:'Waktu Habis!',canChange:'Tap untuk memilih',disagree:'Sangat Tidak Setuju',agree:'Sangat Setuju',writeAnswer:'Tulis jawaban...',qOf:'Soal',yourScore:'Skor Anda',pass:'LULUS',fail:'TIDAK LULUS',sessionLabel:'Sesi',correct:'Benar!',wrong:'Salah!',yourRank:'Peringkat',of:'dari',topParticipants:'TOP PESERTA',getReady:'Bersiap...' },
  en: { title:'GEP TrainIQ',subtitle:'Pertamina Phase 5 Training',nameLabel:'Your Full Name',namePlaceholder:'Enter your name',codeLabel:'Room Code',joinBtn:'Join',errorEmpty:'Please enter name and code.',errorNotFound:'Room code not found.',errorEnded:'Session has ended.',errorJoin:'Failed to join.',waiting:'Waiting for Trainer',ended:'Session Complete!',answered:'questions answered',backHome:'Back to Home',submitted:'Answer Submitted!',submittedDesc:'Waiting for next question...',sendAnswer:'Submit Answer',sending:'Submitting...',timesUp:"Time's Up!",canChange:'Tap to select answer',disagree:'Strongly Disagree',agree:'Strongly Agree',writeAnswer:'Write your answer...',qOf:'Question',yourScore:'Your Score',pass:'PASS',fail:'FAIL',sessionLabel:'Session',correct:'Correct!',wrong:'Wrong!',yourRank:'Your Rank',of:'of',topParticipants:'TOP PARTICIPANTS',getReady:'Get ready...' }
}


// Sound effects using Web Audio API
function playSound(type: 'correct' | 'wrong' | 'tick' | 'complete') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    if (type === 'correct') {
      o.frequency.setValueAtTime(523, ctx.currentTime)
      o.frequency.setValueAtTime(659, ctx.currentTime + 0.1)
      o.frequency.setValueAtTime(784, ctx.currentTime + 0.2)
      g.gain.setValueAtTime(0.3, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      o.start(); o.stop(ctx.currentTime + 0.5)
    } else if (type === 'wrong') {
      o.frequency.setValueAtTime(300, ctx.currentTime)
      o.frequency.setValueAtTime(200, ctx.currentTime + 0.15)
      g.gain.setValueAtTime(0.3, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      o.start(); o.stop(ctx.currentTime + 0.4)
    } else if (type === 'tick') {
      o.frequency.setValueAtTime(800, ctx.currentTime)
      g.gain.setValueAtTime(0.1, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
      o.start(); o.stop(ctx.currentTime + 0.05)
    } else if (type === 'complete') {
      const notes = [523, 659, 784, 1047]
      notes.forEach((freq, i) => {
        const o2 = ctx.createOscillator(); const g2 = ctx.createGain()
        o2.connect(g2); g2.connect(ctx.destination)
        o2.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15)
        g2.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15)
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3)
        o2.start(ctx.currentTime + i * 0.15); o2.stop(ctx.currentTime + i * 0.15 + 0.3)
      })
    }
  } catch(e) {}
}

function getAvatar(name: string) {
  const colors = ['#0066B3','#00A651','#ED1C24','#7C3AED','#DB2777','#D97706','#0891B2','#059669']
  const idx = name.split('').reduce((a,c) => a+c.charCodeAt(0),0) % colors.length
  const initials = name.trim().split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
  return { color: colors[idx], initials }
}

function Confetti() {
  const pieces = Array.from({length:60},(_,i)=>({ id:i, left:Math.random()*100, delay:Math.random()*1.5, color:['#E21B3C','#1368CE','#D89E00','#26890C','#7C3AED','#FFD700'][Math.floor(Math.random()*6)], size:8+Math.random()*8, isRect:Math.random()>0.5 }))
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map(p=>(
        <div key={p.id} style={{position:'absolute',left:p.left+'%',top:'-20px',width:p.size,height:p.isRect?p.size*0.4:p.size,backgroundColor:p.color,borderRadius:p.isRect?'2px':'50%',animation:`fall ${1.5+Math.random()}s ${p.delay}s ease-in forwards`}} />
      ))}
      <style>{`@keyframes fall{to{transform:translateY(110vh) rotate(720deg);opacity:0}}`}</style>
    </div>
  )
}

function PodiumScreen({podium,finalScore:initialScore,myRank:initialRank,t,sessionId,pid,onBack}:any) {
  const [finalScore,setFinalScore] = useState(initialScore)
  const [myRank,setMyRank] = useState(initialRank)
  useEffect(()=>{
    if(sessionId&&pid){
      ;(async()=>{
        const {data:fQs} = await supabase.from('questions').select('id,correct_option_index').eq('session_id',sessionId)
        const {data:myR} = await supabase.from('responses').select('*').eq('session_id',sessionId).eq('participant_id',pid)
        const {data:allP} = await supabase.from('participants').select('id,display_name').eq('session_id',sessionId)
        const {data:allR} = await supabase.from('responses').select('*').eq('session_id',sessionId)
        const qs2=fQs||[]; let correct=0
        qs2.forEach((q:any)=>{ const r=(myR||[]).find((r:any)=>r.question_id===q.id); if(r&&Number(r.answer_index)===Number(q.correct_option_index))correct++ })
        setFinalScore({score:correct,total:qs2.length})
        if(allP&&allR){
          const scores=allP.map((p:any)=>{ const pR=allR.filter((r:any)=>r.participant_id===p.id); let c=0; qs2.forEach((q:any)=>{const r=pR.find((r:any)=>r.question_id===q.id);if(r&&Number(r.answer_index)===Number(q.correct_option_index))c++}); return {id:p.id,score:c} }).sort((a:any,b:any)=>b.score-a.score)
          setMyRank({rank:scores.findIndex((s:any)=>s.id===pid)+1,total:allP.length})
        }
      })()
    }
  },[])

  const [show,setShow] = useState(false)
  const [confetti,setConfetti] = useState(false)
  useEffect(()=>{ setTimeout(()=>setShow(true),200); setTimeout(()=>setConfetti(true),600); setTimeout(()=>setConfetti(false),5000) },[])
  const order = [podium[1],podium[0],podium[2]]
  const heights = ['h-20','h-28','h-14']
  const podBg = ['#C0C0C0','#FFD700','#CD7F32']
  const medals = ['🥈','🥇','🥉']
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{background:'linear-gradient(135deg,#1a0533 0%,#0a1628 50%,#0d2a1a 100%)'}}>
      {confetti && <Confetti />}
      <div className="text-center mb-6"><div className="text-4xl mb-2">🏆</div><h1 className="text-2xl font-bold text-white">{t.ended}</h1><p className="text-white text-sm mt-1" style={{opacity:0.6}}>{t.topParticipants}</p></div>
      {podium.length>=1 && (
        <div className="flex items-end justify-center gap-2 mb-8 w-full max-w-sm">
          {order.map((p:any,i:number)=>{
            if(!p) return <div key={i} className="flex-1"/>
            const av=getAvatar(p.name)
            return (
              <div key={i} className={`flex flex-col items-center flex-1 transition-all duration-700 ${show?'opacity-100 translate-y-0':'opacity-0 translate-y-12'}`} style={{transitionDelay:`${i*150}ms`}}>
                <div className="text-xl mb-1">{medals[i]}</div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm mb-1" style={{backgroundColor:av.color,border:'2px solid rgba(255,255,255,0.4)'}}>{av.initials}</div>
                <div className="text-white text-xs font-semibold w-full text-center truncate px-1 mb-1">{p.name}</div>
                <div className="text-white text-xs mb-2" style={{opacity:0.6}}>{p.score}/{p.total}</div>
                <div className={`w-full ${heights[i]} rounded-t-xl flex items-center justify-center text-white font-bold text-2xl`} style={{backgroundColor:podBg[i]}}>{i===1?'1':i===0?'2':'3'}</div>
              </div>
            )
          })}
        </div>
      )}
      {finalScore && (
        <div className={`w-full max-w-sm rounded-2xl p-5 text-center mb-4 transition-all duration-700 ${show?'opacity-100':'opacity-0'}`} style={{backgroundColor:'rgba(255,255,255,0.1)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.2)',transitionDelay:'500ms'}}>
          <div className="text-white text-xs mb-2 uppercase tracking-wider" style={{opacity:0.6}}>{t.yourScore}</div>
          <div className={`text-5xl font-bold mb-2 ${finalScore.score/finalScore.total>=0.7?'text-green-400':'text-red-400'}`}>{finalScore.score}/{finalScore.total}</div>
          <div className={`text-xl font-bold mb-2 ${finalScore.score/finalScore.total>=0.7?'text-green-400':'text-red-400'}`}>{finalScore.score/finalScore.total>=0.7?'✅ '+t.pass:'❌ '+t.fail}</div>
          <div className="text-white text-sm" style={{opacity:0.5}}>{Math.round(finalScore.score/finalScore.total*100)}%</div>
          {myRank && <div className="mt-3 pt-3 text-white text-sm" style={{borderTop:'1px solid rgba(255,255,255,0.2)',opacity:0.7}}>🏆 {t.yourRank}: <span className="font-bold text-lg">#{myRank.rank}</span> {t.of} {myRank.total}</div>}
        </div>
      )}
      <button onClick={onBack} className="text-white text-sm mt-2" style={{opacity:0.5}}>← {t.backHome}</button>
    </div>
  )
}

export default function JoinPage() {
  const [screen,setScreen] = useState<Screen>('join')
  const [roomCode,setRoomCode] = useState('')
  const [name,setName] = useState('')
  const [error,setError] = useState('')
  const [session,setSession] = useState<any>(null)
  const [participantId,setParticipantId] = useState<string|null>(null)
  const [questions,setQuestions] = useState<any[]>([])
  const [currentQ,setCurrentQ] = useState<any>(null)
  const [selectedAnswer,setSelectedAnswer] = useState<number|null>(null)
  const [textAnswer,setTextAnswer] = useState('')
  const [answeredQIds,setAnsweredQIds] = useState<Set<string>>(new Set([]))
  const [submitting,setSubmitting] = useState(false)
  const [timeLeft,setTimeLeft] = useState<number|null>(null)
  const [finalScore,setFinalScore] = useState<{score:number,total:number}|null>(null)
  const [myRank,setMyRank] = useState<{rank:number,total:number}|null>(null)
  const [podium,setPodium] = useState<any[]>([])
  const [countdown,setCountdown] = useState<number|null>(null)
  const [showCountdown,setShowCountdown] = useState(false)
  const [showCorrect,setShowCorrect] = useState(false)
  const [correctAnswer,setCorrectAnswer] = useState<number|null>(null)
  const [hasSubmitted,setHasSubmitted] = useState(false)
  const [showConfetti,setShowConfetti] = useState(false)
  const {lang} = useLang()
  const t = T[lang as keyof typeof T]

  useEffect(()=>{
    if(typeof window !== 'undefined'){
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      if(code) setRoomCode(code)
    }
  },[])

  const calcScore = useCallback(async (sessionId:string,pid:string) => {
    const {data:fQs} = await supabase.from('questions').select('id,correct_option_index').eq('session_id',sessionId)
    const {data:myR} = await supabase.from('responses').select('*').eq('session_id',sessionId).eq('participant_id',pid)
    const {data:allP} = await supabase.from('participants').select('id,display_name').eq('session_id',sessionId)
    const {data:allR} = await supabase.from('responses').select('*').eq('session_id',sessionId)
    const qs2 = fQs||[]
    let correct=0
    qs2.forEach((q:any)=>{ const r=(myR||[]).find((r:any)=>r.question_id===q.id); if(r&&Number(r.answer_index)===Number(q.correct_option_index))correct++ })
    setFinalScore({score:correct,total:qs2.length})
    if(allP&&allR){
      const scores=allP.map((p:any)=>{ const pR=allR.filter((r:any)=>r.participant_id===p.id); let c=0; qs2.forEach((q:any)=>{const r=pR.find((r:any)=>r.question_id===q.id);if(r&&Number(r.answer_index)===Number(q.correct_option_index))c++}); return {id:p.id,name:p.display_name,score:c,total:qs2.length} }).sort((a:any,b:any)=>b.score-a.score)
      setMyRank({rank:scores.findIndex((s:any)=>s.id===pid)+1,total:allP.length})
      setPodium(scores.slice(0,3))
    }
  },[])

  const doSync = useCallback(async (s:any,pid?:string) => {
    const {data:qs} = await supabase.from('questions').select('*,options(*)').eq('session_id',s.id).order('order_index')
    if(qs) setQuestions(qs)
    if(s.status==='ended'){
      const ap=pid||participantId
      if(ap) {
        await calcScore(s.id,ap)
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      playSound('complete')
      setScreen('ended'); return
    }
    if(s.status==='active'&&qs&&qs.length>0){
      const q=qs[s.current_question_index]
      if(q){
        setCurrentQ(q)
        setShowCorrect(false); setCorrectAnswer(null); setHasSubmitted(false)
        setSelectedAnswer(null); setTextAnswer(''); setTimeLeft(null)
        if(s.current_question_index===0){
          setShowCountdown(true); setCountdown(3)
          setTimeout(()=>setCountdown(2),1000)
          setTimeout(()=>setCountdown(1),2000)
          setTimeout(()=>{setShowCountdown(false);setCountdown(null);setScreen('question')},3000)
        } else { setScreen('question') }
        if(s.timer_started_at){
          const elapsed=Math.floor((Date.now()-new Date(s.timer_started_at).getTime())/1000)
          const remaining=(s.timer_duration||30)-elapsed
          setTimeLeft(remaining>0?remaining:0)
        }
      }
    }
  },[calcScore])

  useEffect(()=>{
    if(!session) return
    const ch=supabase.channel('p-'+session.id)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'sessions',filter:`id=eq.${session.id}`},
        async ({new:u}:any)=>{
          setSession(u)
          await doSync(u)
          if(u.timer_started_at){const e=Math.floor((Date.now()-new Date(u.timer_started_at).getTime())/1000);const r=(u.timer_duration||30)-e;setTimeLeft(r>0?r:0)}
          else{setTimeLeft(null)}
        })
      .subscribe()
    return ()=>{supabase.removeChannel(ch)}
  },[session,doSync])

  useEffect(()=>{
    if(timeLeft===null) return
    if(timeLeft<=0){
      if(currentQ&&!answeredQIds.has(currentQ.id)&&participantId&&session&&!hasSubmitted){
        ;(async()=>{
          const payload:any={question_id:currentQ.id,participant_id:participantId,session_id:session.id}
          if(currentQ.question_type==='mcq') payload.answer_index=selectedAnswer!==null?Number(selectedAnswer):null
          else if(currentQ.question_type==='rating') payload.rating_value=selectedAnswer
          else payload.answer_text=textAnswer||''
          await supabase.from('responses').upsert(payload,{onConflict:'question_id,participant_id'})
          const s2=new Set(Array.from(answeredQIds)); s2.add(currentQ.id); setAnsweredQIds(s2)
          setCorrectAnswer(currentQ.correct_option_index); setShowCorrect(true); setHasSubmitted(true)
          if(selectedAnswer!==null&&Number(selectedAnswer)===Number(currentQ.correct_option_index)){setShowConfetti(true);setTimeout(()=>setShowConfetti(false),3000)}
          setTimeout(()=>setScreen('submitted'),2500)
        })()
      }
      return
    }
    if(timeLeft===6){playSound('tick')}
    const timer=setTimeout(()=>setTimeLeft(prev=>prev!==null?prev-1:null),1000)
    return ()=>clearTimeout(timer)
  },[timeLeft,currentQ,answeredQIds,participantId,session,selectedAnswer,textAnswer,hasSubmitted])

  async function joinSession(){
    setError('')
    if(!roomCode.trim()||!name.trim()){setError(t.errorEmpty);return}
    const {data:s}=await supabase.from('sessions').select('*').eq('room_code',roomCode.trim()).single()
    if(!s){setError(t.errorNotFound);return}
    if(s.status==='ended'){setError(t.errorEnded);return}
    const {data:p}=await supabase.from('participants').insert({session_id:s.id,display_name:name.trim()}).select().single()
    if(!p){setError(t.errorJoin);return}
    setSession(s); setParticipantId(p.id)
    if(s.status==='active') await doSync(s,p.id)
    else setScreen('waiting')
  }

  async function submitMCQ(optionIndex:number){
    if(!currentQ||!participantId||!session||hasSubmitted) return
    const payload:any={question_id:currentQ.id,participant_id:participantId,session_id:session.id,answer_index:Number(optionIndex)}
    await supabase.from('responses').upsert(payload,{onConflict:'question_id,participant_id'})
    const s2=new Set(Array.from(answeredQIds)); s2.add(currentQ.id); setAnsweredQIds(s2)
    setSelectedAnswer(optionIndex); setCorrectAnswer(currentQ.correct_option_index); setShowCorrect(true); setHasSubmitted(true)
    if(Number(optionIndex)===Number(currentQ.correct_option_index)){setShowConfetti(true);setTimeout(()=>setShowConfetti(false),3000);playSound('correct')}else{playSound('wrong')}
    setTimeout(()=>setScreen('submitted'),2500)
  }

  async function submitAnswer(){
    if(!currentQ||!participantId||!session||hasSubmitted) return
    setSubmitting(true)
    const payload:any={question_id:currentQ.id,participant_id:participantId,session_id:session.id}
    if(currentQ.question_type==='rating') payload.rating_value=selectedAnswer
    else payload.answer_text=textAnswer
    await supabase.from('responses').upsert(payload,{onConflict:'question_id,participant_id'})
    const s2=new Set(Array.from(answeredQIds)); s2.add(currentQ.id); setAnsweredQIds(s2)
    setSubmitting(false); setHasSubmitted(true)
    setTimeout(()=>setScreen('submitted'),1000)
  }

  if(showCountdown&&countdown!==null) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'linear-gradient(135deg,#1a0533 0%,#0a1628 100%)'}}>
      <div className="text-center">
        <div key={countdown} className="font-bold text-white" style={{fontSize:'150px',lineHeight:1,animation:'popIn 0.4s ease-out'}}>{countdown}</div>
        <p className="text-white mt-4 text-xl" style={{opacity:0.7}}>{t.getReady}</p>
        <style>{`@keyframes popIn{from{transform:scale(1.8);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
      </div>
    </div>
  )

  if(screen==='join') return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'linear-gradient(135deg,#1a0533 0%,#0a1628 100%)'}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl font-black text-white mb-1">{t.title}</div>
          <div className="text-white text-sm" style={{opacity:0.6}}>{t.subtitle}</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex justify-end"><LangToggle /></div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t.nameLabel}</label>
            <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-center text-lg font-medium focus:border-blue-500 focus:outline-none transition-colors" value={name} onChange={e=>setName(e.target.value)} placeholder={t.namePlaceholder} onKeyDown={e=>e.key==='Enter'&&joinSession()} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t.codeLabel}</label>
            <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-center text-4xl font-black font-mono tracking-widest focus:border-blue-500 focus:outline-none transition-colors" maxLength={4} value={roomCode} onChange={e=>setRoomCode(e.target.value.replace(/\D/g,''))} placeholder="0000" onKeyDown={e=>e.key==='Enter'&&joinSession()} />
          </div>
          {error&&<p className="text-red-500 text-sm text-center font-medium">{error}</p>}
          <button onClick={joinSession} className="w-full py-4 rounded-xl font-black text-white text-lg transition-all active:scale-95" style={{backgroundColor:'#E21B3C',boxShadow:'0 4px 0 #9B0000'}}>{t.joinBtn}</button>
        </div>
      </div>
    </div>
  )

  if(screen==='waiting'){
    const av=getAvatar(name)
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{background:'linear-gradient(135deg,#1a0533 0%,#0a1628 100%)'}}>
        <div className="text-center w-full max-w-sm">
          <div className="flex justify-end mb-4"><LangToggle /></div>
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-white font-black text-2xl mx-auto mb-4" style={{backgroundColor:av.color,border:'4px solid rgba(255,255,255,0.3)'}}>{av.initials}</div>
          <h2 className="text-2xl font-black text-white mb-1">{name}</h2>
          <p className="text-white mb-4" style={{opacity:0.6}}>{t.waiting}</p>
          {session&&<div className="rounded-xl px-4 py-3 text-white font-medium text-sm mb-6" style={{backgroundColor:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)'}}>{session.title}</div>}
          <div className="flex justify-center gap-3">{[0,1,2,3,4].map(i=>(<div key={i} className="w-3 h-3 rounded-full bg-white animate-bounce" style={{animationDelay:i*150+'ms',opacity:0.7}}/>))}</div>
          <p className="text-white text-xs mt-4" style={{opacity:0.4}}>{lang==='id'?'Trainer akan segera memulai...':'Trainer will start soon...'}</p>
        </div>
      </div>
    )
  }

  if(screen==='ended') return (
    <PodiumScreen podium={podium} finalScore={finalScore} myRank={myRank} t={t} lang={lang}
      sessionId={session?.id} pid={participantId}
      onBack={()=>{setScreen('join');setSession(null);setParticipantId(null);setAnsweredQIds(new Set([]));setFinalScore(null);setMyRank(null);setPodium([])}} />
  )

  if(screen==='submitted') return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'linear-gradient(135deg,#1a0533 0%,#0a1628 100%)'}}>
      <div className="text-center">
        <div className="text-7xl mb-4">✅</div>
        <h2 className="text-2xl font-black text-white mb-2">{t.submitted}</h2>
        <p className="text-white" style={{opacity:0.6}}>{t.submittedDesc}</p>
        <div className="flex justify-center gap-2 mt-6">{[0,1,2].map(i=>(<div key={i} className="w-3 h-3 rounded-full bg-white animate-bounce" style={{animationDelay:i*200+'ms',opacity:0.6}}/>))}</div>
      </div>
    </div>
  )

  if(screen==='question'&&currentQ){
    const alreadyAnswered=answeredQIds.has(currentQ.id)
    const timesUp=timeLeft===0
    const opts=currentQ.options?.sort((a:any,b:any)=>a.option_index-b.option_index)||[]
    const qIdx=questions.findIndex((q:any)=>q.id===currentQ.id)
    const progress=questions.length>0?((qIdx+1)/questions.length)*100:0
    const timerPct=timeLeft!==null&&currentQ.timer_seconds?(timeLeft/currentQ.timer_seconds)*100:100
    return (
      <div className="min-h-screen flex flex-col" style={{background:'#1a0533'}}>
        {showConfetti&&<Confetti/>}
        <div style={{backgroundColor:'#0a1628'}} className="px-4 pt-3 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-xs font-medium" style={{opacity:0.6}}>{t.qOf} {qIdx+1}/{questions.length}</span>
            {timeLeft!==null&&(
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl" style={{border:`4px solid ${timeLeft<=10?'#EF4444':'rgba(255,255,255,0.3)'}`,color:timeLeft<=10?'#F87171':'white'}}>
                {timesUp?'⏰':timeLeft}
              </div>
            )}
            <LangToggle/>
          </div>
          <div className="w-full rounded-full h-1.5 overflow-hidden" style={{backgroundColor:'rgba(255,255,255,0.1)'}}>
            <div className="h-full rounded-full transition-all duration-500" style={{width:progress+'%',backgroundColor:'#E21B3C'}}/>
          </div>
          {timeLeft!==null&&(
            <div className="w-full rounded-full h-1 mt-1 overflow-hidden" style={{backgroundColor:'rgba(255,255,255,0.1)'}}>
              <div className="h-full rounded-full transition-all duration-1000" style={{width:timerPct+'%',backgroundColor:timeLeft<=10?'#EF4444':'#4ADE80'}}/>
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-4 flex-shrink-0">
            <div className="rounded-2xl p-4 text-center" style={{backgroundColor:'rgba(255,255,255,0.1)'}}>
              <p className="text-white font-bold text-lg leading-snug">{currentQ.question_text}</p>
            </div>
          </div>
          {showCorrect&&(
            <div className="mx-4 mb-3 py-3 rounded-2xl text-center font-black text-xl text-white flex-shrink-0" style={{backgroundColor:Number(selectedAnswer)===Number(correctAnswer)?'#22C55E':'#EF4444',animation:'popIn 0.3s ease-out'}}>
              {Number(selectedAnswer)===Number(correctAnswer)?'✅ '+t.correct:'❌ '+t.wrong}
              <style>{`@keyframes popIn{from{transform:scale(0.8);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
            </div>
          )}
          {currentQ.question_type==='mcq'&&(
            <div className="grid grid-cols-2 gap-3 px-3 pb-4 flex-1">
              {opts.map((o:any,i:number)=>{
                const col=OPTION_COLORS[i%4]
                const isCorrectOpt=showCorrect&&Number(o.option_index)===Number(correctAnswer)
                const isWrongSelected=showCorrect&&Number(selectedAnswer)===Number(o.option_index)&&!isCorrectOpt
                const dimmed=showCorrect&&!isCorrectOpt&&Number(selectedAnswer)!==Number(o.option_index)
                return (
                  <button key={o.id}
                    onClick={()=>{ if(!hasSubmitted&&!timesUp&&!showCorrect) submitMCQ(o.option_index) }}
                    disabled={hasSubmitted||timesUp}
                    style={{backgroundColor:isCorrectOpt?'#16A34A':isWrongSelected?'#374151':col.bg,boxShadow:'0 4px 0 rgba(0,0,0,0.25)',opacity:dimmed?0.35:1,transition:'all 0.15s',minHeight:'80px'}}
                    className="rounded-2xl p-3 flex flex-col items-center justify-center text-white font-bold active:scale-95 disabled:cursor-not-allowed">
                    <span className="text-2xl mb-1">{col.icon}</span>
                    <span className="text-sm text-center leading-tight">{o.option_text}</span>
                    {isCorrectOpt&&<span className="text-green-200 text-xs mt-1">✓ Correct</span>}
                  </button>
                )
              })}
            </div>
          )}
          {currentQ.question_type==='rating'&&(
            <div className="px-4 pb-4">
              <div className="flex gap-2 justify-between mb-2">
                {[1,2,3,4,5].map((n:number)=>(
                  <button key={n} onClick={()=>{ if(!hasSubmitted&&!timesUp) setSelectedAnswer(n) }}
                    style={{backgroundColor:selectedAnswer===n?'#E21B3C':'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)'}}
                    className="flex-1 aspect-square rounded-xl text-xl font-black text-white transition-all active:scale-95">
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-white text-xs px-1 mb-3" style={{opacity:0.5}}><span>{t.disagree}</span><span>{t.agree}</span></div>
              {!hasSubmitted&&selectedAnswer!==null&&(
                <button onClick={submitAnswer} className="w-full py-3 rounded-xl font-black text-white text-lg" style={{backgroundColor:'#E21B3C',boxShadow:'0 4px 0 #9B0000'}}>{submitting?t.sending:t.sendAnswer}</button>
              )}
            </div>
          )}
          {currentQ.question_type==='open'&&(
            <div className="px-4 pb-4">
              <textarea className="w-full rounded-xl p-3 text-gray-800 font-medium resize-none focus:outline-none border-0" rows={3} value={textAnswer} onChange={e=>{ if(!hasSubmitted) setTextAnswer(e.target.value) }} disabled={hasSubmitted} placeholder={t.writeAnswer}/>
              {!hasSubmitted&&<button onClick={submitAnswer} disabled={!textAnswer.trim()} className="w-full mt-2 py-3 rounded-xl font-black text-white text-lg disabled:opacity-50 transition-all" style={{backgroundColor:'#E21B3C',boxShadow:'0 4px 0 #9B0000'}}>{submitting?t.sending:t.sendAnswer}</button>}
            </div>
          )}
          {!hasSubmitted&&!timesUp&&currentQ.question_type==='mcq'&&!alreadyAnswered&&(
            <div className="text-center pb-3 text-white text-xs flex-shrink-0" style={{opacity:0.4}}>{t.canChange}</div>
          )}
          {timesUp&&!hasSubmitted&&(
            <div className="text-center pb-3 text-red-400 text-sm font-bold flex-shrink-0">⏰ {t.timesUp}</div>
          )}
        </div>
      </div>
    )
  }
  return null
}
