import os

# ============================================================
# STEP 1: Write clean join page (fixes build error + adds
#         confetti, progress bar, avatar, podium animation)
# ============================================================

join_page = r"""'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useLang, LangToggle } from '@/lib/lang'

type Screen = 'join' | 'waiting' | 'question' | 'submitted' | 'ended'

const T = {
  id: {
    title: 'GEP TrainIQ', subtitle: 'Pertamina Phase 5 Training',
    nameLabel: 'Nama Lengkap Anda', namePlaceholder: 'Tulis nama Anda',
    codeLabel: 'Kode Ruangan', joinBtn: 'Bergabung',
    errorEmpty: 'Masukkan kode dan nama Anda.',
    errorNotFound: 'Kode ruangan tidak ditemukan.',
    errorEnded: 'Sesi ini sudah berakhir.',
    errorJoin: 'Gagal bergabung. Coba lagi.',
    waiting: 'Menunggu Trainer', waitingDesc: 'Sesi akan segera dimulai.',
    ended: 'Sesi Selesai!', endedDesc: 'Terima kasih sudah berpartisipasi',
    answered: 'pertanyaan dijawab', backHome: 'Kembali ke Beranda',
    submitted: 'Jawaban Terkirim!', submittedDesc: 'Menunggu pertanyaan berikutnya...',
    mcq: 'Pilihan Ganda', rating: 'Rating', open: 'Teks Terbuka',
    sendAnswer: 'Kirim Jawaban', sending: 'Mengirim...', alreadySent: 'Jawaban Terkirim',
    timesUp: 'Waktu Habis!', autoSubmitted: 'Waktu habis! Jawaban otomatis terkirim.',
    canChange: 'Anda dapat mengubah pilihan sebelum submit',
    disagree: 'Sangat Tidak Setuju', agree: 'Sangat Setuju',
    writeAnswer: 'Tulis jawaban Anda di sini...', qOf: 'Pertanyaan',
    yourScore: 'Skor Anda', pass: 'LULUS', fail: 'TIDAK LULUS',
    sessionLabel: 'Sesi', correct: 'Benar!', wrong: 'Salah!',
    yourRank: 'Peringkat Anda', of: 'dari',
    topParticipants: 'TOP PESERTA', getReady: 'Bersiap...',
  },
  en: {
    title: 'GEP TrainIQ', subtitle: 'Pertamina Phase 5 Training',
    nameLabel: 'Your Full Name', namePlaceholder: 'Enter your name',
    codeLabel: 'Room Code', joinBtn: 'Join',
    errorEmpty: 'Please enter your name and room code.',
    errorNotFound: 'Room code not found.',
    errorEnded: 'This session has already ended.',
    errorJoin: 'Failed to join. Please try again.',
    waiting: 'Waiting for Trainer', waitingDesc: 'Session will start soon.',
    ended: 'Session Complete!', endedDesc: 'Thank you for participating',
    answered: 'questions answered', backHome: 'Back to Home',
    submitted: 'Answer Submitted!', submittedDesc: 'Waiting for next question...',
    mcq: 'Multiple Choice', rating: 'Rating', open: 'Open Text',
    sendAnswer: 'Submit Answer', sending: 'Submitting...', alreadySent: 'Answer Submitted',
    timesUp: "Time's Up!", autoSubmitted: "Time is up! Answer auto-submitted.",
    canChange: 'You can change your answer before submitting',
    disagree: 'Strongly Disagree', agree: 'Strongly Agree',
    writeAnswer: 'Write your answer here...', qOf: 'Question',
    yourScore: 'Your Score', pass: 'PASS', fail: 'FAIL',
    sessionLabel: 'Session', correct: 'Correct!', wrong: 'Wrong!',
    yourRank: 'Your Rank', of: 'of',
    topParticipants: 'TOP PARTICIPANTS', getReady: 'Get ready...',
  }
}

// Avatar helper
function getAvatar(name: string) {
  const colors = ['#0066B3','#00A651','#ED1C24','#7C3AED','#DB2777','#D97706','#0891B2','#059669']
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length
  const initials = name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return { color: colors[idx], initials }
}

// Confetti component
function Confetti() {
  const pieces = Array.from({length: 40}, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
    color: ['#ED1C24','#0066B3','#00A651','#FFD700','#FF69B4','#7C3AED'][Math.floor(Math.random() * 6)],
    size: 6 + Math.random() * 8,
  }))
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: p.left + '%', top: '-20px',
          width: p.size, height: p.size, backgroundColor: p.color,
          borderRadius: Math.random() > 0.5 ? '50%' : '0',
          animation: `confettiFall ${1.5 + Math.random()}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
      <style>{`@keyframes confettiFall { to { transform: translateY(110vh) rotate(720deg); opacity: 0; } }`}</style>
    </div>
  )
}

// Animated Podium
function PodiumScreen({ podium, name, finalScore, myRank, t, lang, onBack }: any) {
  const [show, setShow] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  useEffect(() => {
    setTimeout(() => setShow(true), 300)
    setTimeout(() => setShowConfetti(true), 800)
    setTimeout(() => setShowConfetti(false), 4000)
  }, [])

  const positions = [podium[1], podium[0], podium[2]].filter(Boolean)
  const heights = ['h-20', 'h-28', 'h-14']
  const medals = ['🥈', '🥇', '🥉']
  const podiumColors = ['bg-gray-300', 'bg-yellow-400', 'bg-orange-400']

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{backgroundColor: '#0a1628'}}>
      {showConfetti && <Confetti />}
      <div className="text-center mb-8">
        <div className="text-white text-opacity-60 text-sm mb-2 tracking-widest uppercase">Session Complete</div>
        <div className="text-3xl font-bold text-white">🏆 {t.topParticipants}</div>
      </div>

      {/* Podium */}
      {podium.length >= 2 && (
        <div className="flex items-end justify-center gap-3 mb-8">
          {[podium[1], podium[0], podium[2]].map((p: any, i: number) => {
            if (!p) return <div key={i} className="w-24" />
            const av = getAvatar(p.name)
            return (
              <div key={i} className={`flex flex-col items-center transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{transitionDelay: `${i * 200}ms`}}>
                <div className="text-2xl mb-1">{medals[i]}</div>
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-white border-opacity-30 mb-1"
                  style={{backgroundColor: av.color}}>
                  {av.initials}
                </div>
                <div className="text-white text-xs font-medium w-20 text-center truncate mb-1">{p.name}</div>
                <div className="text-white text-opacity-60 text-xs mb-2">{p.score}/{p.total}</div>
                <div className={`w-20 ${heights[i]} ${podiumColors[i]} rounded-t-xl flex items-center justify-center text-white font-bold text-xl`}>
                  {i === 1 ? '1' : i === 0 ? '2' : '3'}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* My score */}
      {finalScore && (
        <div className={`w-full max-w-sm bg-white bg-opacity-10 rounded-2xl p-4 text-center mb-4 border border-white border-opacity-20 transition-all duration-500 ${show ? 'opacity-100' : 'opacity-0'}`}
          style={{transitionDelay: '600ms'}}>
          <div className="text-white text-opacity-60 text-xs mb-1">{lang === 'id' ? 'Skor Anda' : 'Your Score'}</div>
          <div className={`text-4xl font-bold mb-1 ${finalScore.score / finalScore.total >= 0.7 ? 'text-green-400' : 'text-red-400'}`}>
            {finalScore.score}/{finalScore.total}
          </div>
          <div className={`text-lg font-semibold ${finalScore.score / finalScore.total >= 0.7 ? 'text-green-400' : 'text-red-400'}`}>
            {finalScore.score / finalScore.total >= 0.7 ? t.pass + ' ✅' : t.fail + ' ❌'}
          </div>
          {myRank && (
            <div className="text-white text-opacity-60 text-sm mt-2">
              {t.yourRank}: <span className="text-white font-bold">#{myRank.rank}</span> {t.of} {myRank.total}
            </div>
          )}
        </div>
      )}

      <button onClick={onBack} className="text-white text-opacity-60 text-sm hover:text-opacity-100 transition-colors mt-2">
        ← {t.backHome}
      </button>
    </div>
  )
}

export default function JoinPage() {
  const [screen, setScreen] = useState<Screen>('join')
  const [roomCode, setRoomCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [session, setSession] = useState<any>(null)
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [currentQ, setCurrentQ] = useState<any>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [textAnswer, setTextAnswer] = useState('')
  const [answeredQIds, setAnsweredQIds] = useState<Set<string>>(new Set([]))
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [finalScore, setFinalScore] = useState<{score: number, total: number} | null>(null)
  const [myRank, setMyRank] = useState<{rank: number, total: number} | null>(null)
  const [podium, setPodium] = useState<any[]>([])
  const [countdown, setCountdown] = useState<number | null>(null)
  const [showCountdown, setShowCountdown] = useState(false)
  const [showCorrect, setShowCorrect] = useState(false)
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const { lang } = useLang()
  const t = T[lang as keyof typeof T]

  // Timer + auto-submit
  useEffect(() => {
    if (timeLeft === null) return
    if (timeLeft <= 0) {
      if (currentQ && !answeredQIds.has(currentQ.id) && participantId && session && !hasSubmitted) {
        ;(async () => {
          const payload: any = { question_id: currentQ.id, participant_id: participantId, session_id: session.id }
          if (currentQ.question_type === 'mcq') payload.answer_index = selectedAnswer !== null ? Number(selectedAnswer) : null
          else if (currentQ.question_type === 'rating') payload.rating_value = selectedAnswer
          else payload.answer_text = textAnswer || ''
          await supabase.from('responses').upsert(payload, { onConflict: 'question_id,participant_id' })
          const s = new Set(Array.from(answeredQIds)); s.add(currentQ.id); setAnsweredQIds(s)
          setCorrectAnswer(currentQ.correct_option_index)
          setShowCorrect(true); setHasSubmitted(true)
          if (selectedAnswer === currentQ.correct_option_index) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 3000) }
          setTimeout(() => setScreen('submitted'), 2000)
        })()
      }
      return
    }
    const timer = setTimeout(() => setTimeLeft(prev => prev !== null ? prev - 1 : null), 1000)
    return () => clearTimeout(timer)
  }, [timeLeft, currentQ, answeredQIds, participantId, session, selectedAnswer, textAnswer, hasSubmitted])

  const calcFinalScore = useCallback(async (sessionId: string, pid: string) => {
    const { data: freshQs } = await supabase.from('questions').select('id,correct_option_index').eq('session_id', sessionId)
    const { data: myResponses } = await supabase.from('responses').select('*').eq('session_id', sessionId).eq('participant_id', pid)
    const { data: allParts } = await supabase.from('participants').select('id,display_name').eq('session_id', sessionId)
    const { data: allResp } = await supabase.from('responses').select('*').eq('session_id', sessionId)
    const qs = freshQs || []
    let correct = 0
    qs.forEach((q: any) => {
      const r = (myResponses || []).find((r: any) => r.question_id === q.id)
      if (r && Number(r.answer_index) === Number(q.correct_option_index)) correct++
    })
    setFinalScore({ score: correct, total: qs.length })
    if (allParts && allResp) {
      const scores = allParts.map((p: any) => {
        const pR = allResp.filter((r: any) => r.participant_id === p.id)
        let c = 0
        qs.forEach((q: any) => { const r = pR.find((r: any) => r.question_id === q.id); if (r && Number(r.answer_index) === Number(q.correct_option_index)) c++ })
        return { id: p.id, name: p.display_name, score: c, total: qs.length }
      }).sort((a: any, b: any) => b.score - a.score)
      setMyRank({ rank: scores.findIndex((s: any) => s.id === pid) + 1, total: allParts.length })
      setPodium(scores.slice(0, 3))
    }
  }, [])

  const syncSession = useCallback(async (s: any, pid?: string) => {
    const { data: qs } = await supabase.from('questions').select('*, options(*)').eq('session_id', s.id).order('order_index')
    if (qs) setQuestions(qs)
    if (s.status === 'ended') {
      const activePid = pid || participantId
      if (activePid) await calcFinalScore(s.id, activePid)
      setScreen('ended'); return
    }
    if (s.status === 'active' && qs) {
      const q = qs[s.current_question_index]
      if (q) {
        setCurrentQ(q)
        setShowCorrect(false); setCorrectAnswer(null); setHasSubmitted(false)
        setSelectedAnswer(null); setTextAnswer(''); setTimeLeft(null)
        if (s.current_question_index === 0 && screen !== 'question') {
          setShowCountdown(true); setCountdown(3)
          setTimeout(() => setCountdown(2), 1000)
          setTimeout(() => setCountdown(1), 2000)
          setTimeout(() => { setShowCountdown(false); setCountdown(null); setScreen('question') }, 3000)
        } else {
          setScreen('question')
        }
        if (s.timer_started_at) {
          const elapsed = Math.floor((Date.now() - new Date(s.timer_started_at).getTime()) / 1000)
          const remaining = (s.timer_duration || 30) - elapsed
          setTimeLeft(remaining > 0 ? remaining : 0)
        }
      }
    }
  }, [participantId, calcFinalScore, screen])

  useEffect(() => {
    if (!session) return
    const ch = supabase.channel('participant-' + session.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${session.id}` },
        ({ new: updated }: any) => {
          setSession(updated); syncSession(updated)
          if (updated.timer_started_at) {
            const elapsed = Math.floor((Date.now() - new Date(updated.timer_started_at).getTime()) / 1000)
            const remaining = (updated.timer_duration || 30) - elapsed
            setTimeLeft(remaining > 0 ? remaining : 0)
          } else { setTimeLeft(null) }
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [session, syncSession])

  async function joinSession() {
    setError('')
    if (!roomCode.trim() || !name.trim()) { setError(t.errorEmpty); return }
    const { data: s } = await supabase.from('sessions').select('*').eq('room_code', roomCode.trim()).single()
    if (!s) { setError(t.errorNotFound); return }
    if (s.status === 'ended') { setError(t.errorEnded); return }
    const { data: existing } = await supabase.from('participants').select('*').eq('session_id', s.id).ilike('display_name', name.trim()).maybeSingle()
    let p = existing
    if (!p) {
      const { data: newP } = await supabase.from('participants').insert({ session_id: s.id, display_name: name.trim() }).select().single()
      if (!newP) { setError(t.errorJoin); return }
      p = newP
    }
    setSession(s); setParticipantId(p.id)
    if (s.status === 'active') await syncSession(s, p.id)
    else setScreen('waiting')
  }

  async function submitAnswer() {
    if (!currentQ || !participantId || !session || hasSubmitted) return
    setSubmitting(true)
    const payload: any = { question_id: currentQ.id, participant_id: participantId, session_id: session.id }
    if (currentQ.question_type === 'mcq') payload.answer_index = selectedAnswer !== null ? Number(selectedAnswer) : null
    else if (currentQ.question_type === 'rating') payload.rating_value = selectedAnswer
    else payload.answer_text = textAnswer
    await supabase.from('responses').upsert(payload, { onConflict: 'question_id,participant_id' })
    const s = new Set(Array.from(answeredQIds)); s.add(currentQ.id); setAnsweredQIds(s)
    setSubmitting(false)
    setCorrectAnswer(currentQ.correct_option_index)
    setShowCorrect(true); setHasSubmitted(true)
    if (Number(selectedAnswer) === Number(currentQ.correct_option_index)) {
      setShowConfetti(true); setTimeout(() => setShowConfetti(false), 3000)
    }
    setTimeout(() => setScreen('submitted'), 2000)
  }

  // Countdown screen
  if (showCountdown && countdown !== null) return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor:'#0a1628'}}>
      <div className="text-center">
        <div className="text-9xl font-bold text-white" style={{fontSize:'120px', lineHeight:1}}>{countdown}</div>
        <p className="text-white mt-4 text-lg" style={{opacity:0.6}}>{t.getReady}</p>
      </div>
    </div>
  )

  // Join screen
  if (screen === 'join') return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <div><div className="text-2xl font-bold text-blue-700">{t.title}</div><p className="text-gray-500 text-xs mt-0.5">{t.subtitle}</p></div>
          <LangToggle />
        </div>
        <div className="space-y-3">
          <div><label className="label">{t.nameLabel}</label>
            <input className="input text-center text-lg" value={name} onChange={e => setName(e.target.value)} placeholder={t.namePlaceholder} onKeyDown={e => e.key === 'Enter' && joinSession()} />
          </div>
          <div><label className="label">{t.codeLabel}</label>
            <input className="input text-center text-3xl font-mono tracking-widest" maxLength={4} value={roomCode} onChange={e => setRoomCode(e.target.value.replace(/\D/g, ''))} placeholder="0000" onKeyDown={e => e.key === 'Enter' && joinSession()} />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button onClick={joinSession} className="btn-primary w-full text-lg py-3">{t.joinBtn}</button>
        </div>
      </div>
    </div>
  )

  // Waiting screen
  if (screen === 'waiting') {
    const av = getAvatar(name)
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card w-full max-w-sm text-center">
          <div className="flex justify-end mb-2"><LangToggle /></div>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-3" style={{backgroundColor: av.color}}>{av.initials}</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-1">{name}</h2>
          <p className="text-gray-500 text-sm mb-3">{t.waiting}</p>
          {session && <div className="bg-blue-50 rounded-lg px-4 py-2 text-sm text-blue-700 font-medium mb-4">{t.sessionLabel}: {session.title}</div>}
          <div className="flex justify-center gap-2 mb-2">
            {[0,1,2,3,4].map(i => (<div key={i} className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: i*100+'ms'}} />))}
          </div>
          <p className="text-xs text-gray-400">{lang === 'id' ? 'Trainer akan segera memulai...' : 'Trainer will start soon...'}</p>
        </div>
      </div>
    )
  }

  // Ended screen — use animated podium
  if (screen === 'ended') return (
    <PodiumScreen
      podium={podium} name={name} finalScore={finalScore} myRank={myRank} t={t} lang={lang}
      onBack={() => { setScreen('join'); setSession(null); setParticipantId(null); setAnsweredQIds(new Set([])); setFinalScore(null); setMyRank(null); setPodium([]) }}
    />
  )

  // Submitted screen
  if (screen === 'submitted') return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{t.submitted}</h2>
        <p className="text-gray-500 text-sm">{t.submittedDesc}</p>
        <div className="mt-4 flex justify-center gap-1">
          {[0,1,2].map(i => (<div key={i} className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: i*150+'ms'}} />))}
        </div>
      </div>
    </div>
  )

  // Question screen
  if (screen === 'question' && currentQ) {
    const alreadyAnswered = answeredQIds.has(currentQ.id)
    const timesUp = timeLeft === 0
    const opts = currentQ.options?.sort((a: any, b: any) => a.option_index - b.option_index) || []
    const qIdx = questions.findIndex((q: any) => q.id === currentQ.id)
    const progress = ((qIdx + 1) / questions.length) * 100
    const typeLabel = currentQ.question_type === 'mcq' ? t.mcq : currentQ.question_type === 'rating' ? t.rating : t.open

    return (
      <div className="min-h-screen flex flex-col p-4 max-w-lg mx-auto">
        {showConfetti && <Confetti />}
        <div className="flex items-center justify-between mb-3 text-sm text-gray-500">
          <span>{name}</span><LangToggle />
          <span>{t.qOf} {qIdx + 1}/{questions.length}</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-2 mb-3 overflow-hidden">
          <div className="h-2 rounded-full transition-all duration-500" style={{width: progress+'%', backgroundColor:'#0066B3'}} />
        </div>

        <div className="card flex-1">
          <div className={`text-xs font-medium px-2 py-1 rounded-full w-fit mb-3 ${currentQ.question_type==='mcq'?'bg-blue-100 text-blue-700':currentQ.question_type==='rating'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>
            {typeLabel}
          </div>

          {/* Timer */}
          {timeLeft !== null && (
            <div className={`text-center text-5xl font-bold font-mono mb-3 ${timeLeft <= 10 ? 'text-red-600' : 'text-blue-700'}`}>
              {timesUp ? '⏰' : timeLeft+'s'}
            </div>
          )}

          <h2 className="text-lg font-semibold text-gray-800 mb-4">{currentQ.question_text}</h2>

          {!hasSubmitted && !timesUp && <p className="text-xs text-gray-400 mb-3">💡 {t.canChange}</p>}

          {/* MCQ options */}
          {currentQ.question_type === 'mcq' && (
            <div className="space-y-2">
              {opts.map((o: any) => {
                const isSelected = selectedAnswer === o.option_index
                const isCorrectOpt = showCorrect && o.option_index === correctAnswer
                const isWrongSelected = showCorrect && isSelected && o.option_index !== correctAnswer
                return (
                  <button key={o.id}
                    onClick={() => { if (!hasSubmitted && !timesUp && !showCorrect) setSelectedAnswer(o.option_index) }}
                    className={`w-full text-left p-3 rounded-xl border-2 text-sm font-medium transition-all
                      ${isCorrectOpt ? 'border-green-500 bg-green-50 text-green-700' : ''}
                      ${isWrongSelected ? 'border-red-400 bg-red-50 text-red-600' : ''}
                      ${!showCorrect && isSelected ? 'border-blue-600 bg-blue-50 text-blue-700' : ''}
                      ${!showCorrect && !isSelected ? 'border-gray-200 text-gray-700 hover:border-blue-300' : ''}
                      ${hasSubmitted || timesUp || showCorrect ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                    <span className="font-bold mr-2">{String.fromCharCode(65 + o.option_index)}.</span>
                    {o.option_text}
                    {isCorrectOpt && <span className="ml-2 text-green-600 font-bold">✓</span>}
                  </button>
                )
              })}
            </div>
          )}

          {/* Rating */}
          {currentQ.question_type === 'rating' && (
            <div>
              <div className="flex gap-2 justify-between mb-2">
                {[1,2,3,4,5].map((n: number) => (
                  <button key={n} onClick={() => { if (!hasSubmitted && !timesUp) setSelectedAnswer(n) }}
                    className={`flex-1 aspect-square rounded-xl text-xl font-bold border-2 transition-all ${selectedAnswer===n?'border-blue-600 bg-blue-600 text-white':'border-gray-200 text-gray-700'} ${hasSubmitted||timesUp?'opacity-60 cursor-not-allowed':'hover:border-blue-300 cursor-pointer'}`}>
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>{t.disagree}</span><span>{t.agree}</span></div>
            </div>
          )}

          {/* Open text */}
          {currentQ.question_type === 'open' && (
            <textarea className="input" rows={4} value={textAnswer}
              onChange={e => { if (!hasSubmitted && !timesUp) setTextAnswer(e.target.value) }}
              disabled={hasSubmitted || timesUp} placeholder={t.writeAnswer} />
          )}
        </div>

        {/* Submit area */}
        <div className="mt-4">
          {showCorrect ? (
            <div className={`w-full text-center py-4 rounded-xl font-bold text-xl transition-all ${Number(selectedAnswer) === Number(correctAnswer) ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
              {Number(selectedAnswer) === Number(correctAnswer) ? '✅ ' + t.correct : '❌ ' + t.wrong}
            </div>
          ) : alreadyAnswered ? (
            <div className="btn-primary w-full text-center opacity-60 cursor-not-allowed py-3">✓ {t.alreadySent}</div>
          ) : timesUp ? (
            <div className="w-full text-center py-3 bg-red-50 text-red-600 rounded-xl font-semibold border border-red-200">⏰ {t.timesUp}</div>
          ) : (
            <button onClick={submitAnswer}
              disabled={submitting || (currentQ.question_type !== 'open' && selectedAnswer === null) || (currentQ.question_type === 'open' && !textAnswer.trim())}
              className="btn-primary w-full py-3 text-base">
              {submitting ? t.sending : t.sendAnswer}
            </button>
          )}
        </div>
      </div>
    )
  }

  return null
}
"""

with open('/Users/himanshu/Desktop/gep-poll/src/app/join/page.tsx', 'w') as f:
    f.write(join_page)
print('✅ Join page written (fix + confetti + podium + avatar + progress bar)')

# ============================================================
# STEP 2: Update session page with auto-refresh leaderboard
# ============================================================

session_path = '/Users/himanshu/Desktop/gep-poll/src/app/admin/session/[id]/page.tsx'
session = open(session_path).read()

# Replace auto-refresh logic - find and update the leaderboard section
# Add useRef for interval
if 'useRef' not in session:
    session = session.replace(
        "import { useState, useEffect",
        "import { useState, useEffect, useRef"
    )

# Replace manual leaderboard with auto-refresh every 2s
old_lb = """  const [autoRefresh, setAutoRefresh] = useState(false)"""
new_lb = """  const [autoRefresh, setAutoRefresh] = useState(true)
  const lbIntervalRef = useRef<any>(null)"""

if old_lb in session:
    session = session.replace(old_lb, new_lb)

# Replace the useEffect for auto-refresh
old_effect = """  useEffect(() => {
    if (!autoRefresh || !showLeaderboard) return
    const interval = setInterval(() => { fetchLeaderboard() }, 10000)
    return () => clearInterval(interval)
  }, [autoRefresh, showLeaderboard])"""

new_effect = """  useEffect(() => {
    if (!showLeaderboard) {
      if (lbIntervalRef.current) clearInterval(lbIntervalRef.current)
      return
    }
    fetchLeaderboard()
    lbIntervalRef.current = setInterval(() => { fetchLeaderboard() }, 2000)
    return () => { if (lbIntervalRef.current) clearInterval(lbIntervalRef.current) }
  }, [showLeaderboard])"""

if old_effect in session:
    session = session.replace(old_effect, new_effect)

# Update leaderboard display to show avatars
old_lb_row = """                    <div key={i} className={`flex items-center gap-3 p-2 rounded-lg border ${i === 0 ? "bg-yellow-50 border-yellow-200" : i === 1 ? "bg-gray-50 border-gray-200" : i === 2 ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100"}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white ${i === 0 ? "bg-yellow-400" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-orange-400" : "bg-gray-300"}`}>
                        {i === 0 ? "1" : i === 1 ? "2" : i === 2 ? "3" : i + 1}
                      </div>
                      <div className="flex-1 font-medium text-gray-800">{p.name}</div>
                      <div className="text-sm font-bold text-blue-700">{p.score}/{p.total}</div>
                      <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.pct >= 70 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>{p.pct}%</div>
                    </div>"""

new_lb_row = """                    <div key={i} className={`flex items-center gap-3 p-2 rounded-lg border ${i === 0 ? "bg-yellow-50 border-yellow-200" : i === 1 ? "bg-gray-50 border-gray-200" : i === 2 ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100"}`}>
                      <span className="text-base w-6 text-center">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i+1)}</span>
                      {(() => {
                        const colors = ['#0066B3','#00A651','#ED1C24','#7C3AED','#DB2777','#D97706','#0891B2','#059669']
                        const idx = p.name.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % colors.length
                        const initials = p.name.trim().split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
                        return <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{backgroundColor: colors[idx]}}>{initials}</div>
                      })()}
                      <div className="flex-1 font-medium text-gray-800 truncate">{p.name}</div>
                      <div className="text-sm font-bold text-blue-700">{p.score}/{p.total}</div>
                      <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.pct >= 70 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>{p.pct}%</div>
                    </div>"""

if old_lb_row in session:
    session = session.replace(old_lb_row, new_lb_row)

# Remove the manual auto-refresh toggle button since we always auto-refresh
old_toggle = """            {showLeaderboard && <button onClick={() => { setAutoRefresh(!autoRefresh); if (!autoRefresh) fetchLeaderboard() }} className={`text-xs px-2 py-1.5 rounded-lg border ${autoRefresh ? 'bg-green-100 border-green-400 text-green-700' : 'border-gray-300 text-gray-500'}`}>{autoRefresh ? '🔄 Auto' : '🔄 Auto'}</button>}"""
if old_toggle in session:
    session = session.replace(old_toggle, '<span className="text-xs text-green-600 font-medium">🔄 Auto-refresh 2s</span>')

with open(session_path, 'w') as f:
    f.write(session)
print('✅ Session page updated (auto-refresh leaderboard + avatars)')

print('\n🎉 Phase 1 complete! Run: npm run build')
