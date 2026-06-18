'use client'
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
    sessionLabel: 'Sesi',
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
    sessionLabel: 'Session',
  }
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
  const [countdown, setCountdown] = useState<number | null>(null)
  const [showCountdown, setShowCountdown] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [myRank, setMyRank] = useState<{rank: number, total: number} | null>(null)
  const [podium, setPodium] = useState<any[]>([])
  const { lang } = useLang()
  const t = T[lang as keyof typeof T]

  useEffect(() => {
    if (timeLeft === null) return
    if (timeLeft <= 0) {
      if (currentQ && !answeredQIds.has(currentQ.id) && participantId && session) {
        const autoSubmit = async () => {
          const payload: any = { question_id: currentQ.id, participant_id: participantId, session_id: session.id }
          if (currentQ.question_type === 'mcq') payload.answer_index = selectedAnswer !== null ? Number(selectedAnswer) : null !== null ? Number(selectedAnswer) : null
          else if (currentQ.question_type === 'rating') payload.rating_value = selectedAnswer
          else payload.answer_text = textAnswer || ''
          await supabase.from('responses').upsert(payload, { onConflict: 'question_id,participant_id' })
          const s = new Set(Array.from(answeredQIds))
          s.add(currentQ.id)
          setAnsweredQIds(s)
          setScreen('submitted')
        }
        autoSubmit()
      }
      return
    }
    const t2 = setTimeout(() => setTimeLeft(prev => prev !== null ? prev - 1 : null), 1000)
    return () => clearTimeout(t2)
  }, [timeLeft, currentQ, answeredQIds, participantId, session, selectedAnswer, textAnswer])

  const calcFinalScore = useCallback(async (sessionId: string, pid: string, qs: any[]) => {
    const { data: myResponses } = await supabase.from('responses').select('*').eq('session_id', sessionId).eq('participant_id', pid)
    if (myResponses) {
      let correct = 0
      qs.forEach((q: any) => {
        const r = myResponses.find((r: any) => r.question_id === q.id)
        if (r && r.answer_index === q.correct_option_index) correct++
      })
      setFinalScore({ score: correct, total: qs.length })
    }
  }, [])

  const syncSession = useCallback(async (s: any, pid?: string) => {
    const { data: qs } = await supabase.from('questions').select('*, options(*)').eq('session_id', s.id).order('order_index')
    if (qs) setQuestions(qs)
    if (s.status === 'ended') {
      const activePid = pid || participantId
      if (qs && activePid) await calcFinalScore(s.id, activePid, qs)
      setScreen('ended')
      return
    }
    if (s.status === 'active' && qs) {
      const q = qs[s.current_question_index]
      setCurrentQ(q || null)
      if (q) {
        setScreen('question')
        setSelectedAnswer(null)
        setTextAnswer('')
        if (s.timer_started_at) {
          const elapsed = Math.floor((Date.now() - new Date(s.timer_started_at).getTime()) / 1000)
          const remaining = (s.timer_duration || 30) - elapsed
          setTimeLeft(remaining > 0 ? remaining : 0)
        } else {
          setTimeLeft(null)
        }
      }
    }
  }, [participantId, calcFinalScore])

  useEffect(() => {
    if (!session) return
    const ch = supabase.channel('participant-' + session.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${session.id}` },
        ({ new: updated }: any) => {
          setSession(updated)
          syncSession(updated)
          if (updated.timer_started_at) {
            const elapsed = Math.floor((Date.now() - new Date(updated.timer_started_at).getTime()) / 1000)
            const remaining = (updated.timer_duration || 30) - elapsed
            setTimeLeft(remaining > 0 ? remaining : 0)
          } else {
            setTimeLeft(null)
          }
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
    const { data: p } = await supabase.from('participants').insert({ session_id: s.id, display_name: name.trim() }).select().single()
    if (!p) { setError(t.errorJoin); return }
    setSession(s)
    setParticipantId(p.id)
    if (s.status === 'active') await syncSession(s, p.id)
    else setScreen('waiting')
  }

  async function submitAnswer() {
    if (!currentQ || !participantId || !session) return
    setSubmitting(true)
    const payload: any = { question_id: currentQ.id, participant_id: participantId, session_id: session.id }
    if (currentQ.question_type === 'mcq') payload.answer_index = selectedAnswer !== null ? Number(selectedAnswer) : null
    else if (currentQ.question_type === 'rating') payload.rating_value = selectedAnswer
    else payload.answer_text = textAnswer
    await supabase.from('responses').upsert(payload, { onConflict: 'question_id,participant_id' })
    const s = new Set(Array.from(answeredQIds))
    s.add(currentQ.id)
    setAnsweredQIds(s)
    setSubmitting(false)
    setScreen('submitted')
  }

  if (screen === 'join') return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="text-2xl font-bold text-blue-700">{t.title}</div>
            <p className="text-gray-500 text-xs mt-0.5">{t.subtitle}</p>
          </div>
          <LangToggle />
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">{t.nameLabel}</label>
            <input className="input text-center text-lg" value={name} onChange={e => setName(e.target.value)} placeholder={t.namePlaceholder} onKeyDown={e => e.key === 'Enter' && joinSession()} />
          </div>
          <div>
            <label className="label">{t.codeLabel}</label>
            <input className="input text-center text-3xl font-mono tracking-widest" maxLength={4} value={roomCode} onChange={e => setRoomCode(e.target.value.replace(/\D/g, ''))} placeholder="0000" onKeyDown={e => e.key === 'Enter' && joinSession()} />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button onClick={joinSession} className="btn-primary w-full text-lg py-3">{t.joinBtn}</button>
        </div>
      </div>
    </div>
  )

  if (showCountdown && countdown !== null) return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor:'#0a1628'}}>
      <div className="text-center">
        <div className="text-9xl font-bold text-white animate-ping" style={{animationDuration:'0.8s'}}>{countdown}</div>
        <p className="text-white text-opacity-60 mt-4 text-lg">{lang === 'id' ? 'Bersiap...' : 'Get ready...'}</p>
      </div>
    </div>
  )

  if (screen === 'waiting') return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm text-center">
        <div className="flex justify-end mb-2"><LangToggle /></div>
        <div className="text-4xl mb-4">⏳</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{t.waiting}</h2>
        <p className="text-gray-500 text-sm">Halo <strong>{name}</strong>! {t.waitingDesc}</p>
        {session && (
          <div className="mt-3 bg-blue-50 rounded-lg px-4 py-2 text-sm text-blue-700 font-medium">
            {t.sessionLabel}: {session.title}
          </div>
        )}
        <div className="mt-4 flex justify-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
        </div>
      </div>
    </div>
  )

  if (screen === 'ended') return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm text-center">
        <div className="flex justify-end mb-2"><LangToggle /></div>
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{t.ended}</h2>
        <p className="text-gray-500 text-sm">{t.endedDesc}, <strong>{name}</strong>.</p>
        <p className="text-gray-400 text-xs mt-2">{answeredQIds.size} {t.answered}.</p>
        {finalScore && (
          <div className={`mt-4 p-4 rounded-xl font-bold text-xl ${finalScore.score / finalScore.total >= 0.7 ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-600 border border-red-200'}`}>
            <div>{t.yourScore}: {finalScore.score}/{finalScore.total}</div>
            <div className="text-2xl mt-1">{finalScore.score / finalScore.total >= 0.7 ? t.pass + ' ✅' : t.fail + ' ❌'}</div>
            <div className="text-sm font-normal mt-1 opacity-70">{Math.round(finalScore.score / finalScore.total * 100)}%</div>
          </div>
        )}
        {myRank && (
          <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-semibold text-sm">
            🏆 {lang === 'id' ? 'Peringkat Anda' : 'Your Rank'}: #{myRank.rank} {lang === 'id' ? 'dari' : 'of'} {myRank.total}
          </div>
        )}
        {podium.length >= 2 && (
          <div className="mt-4 w-full">
            <div className="text-xs text-gray-400 mb-3 font-medium text-center">{lang === 'id' ? 'TOP PESERTA' : 'TOP PARTICIPANTS'}</div>
            <div className="flex items-end justify-center gap-2">
              {podium[1] && <div className="flex flex-col items-center"><div className="text-xl mb-1">🥈</div><div className="text-xs font-medium text-gray-700 w-16 text-center truncate">{podium[1].name}</div><div className="text-xs text-gray-500">{podium[1].score}/{podium[1].total}</div><div className="w-14 h-10 bg-gray-300 rounded-t-lg mt-1 flex items-center justify-center text-white font-bold text-sm">2</div></div>}
              {podium[0] && <div className="flex flex-col items-center"><div className="text-2xl mb-1">🥇</div><div className="text-xs font-bold text-gray-800 w-16 text-center truncate">{podium[0].name}</div><div className="text-xs text-gray-600">{podium[0].score}/{podium[0].total}</div><div className="w-14 h-14 bg-yellow-400 rounded-t-lg mt-1 flex items-center justify-center text-white font-bold text-sm">1</div></div>}
              {podium[2] && <div className="flex flex-col items-center"><div className="text-xl mb-1">🥉</div><div className="text-xs font-medium text-gray-700 w-16 text-center truncate">{podium[2].name}</div><div className="text-xs text-gray-500">{podium[2].score}/{podium[2].total}</div><div className="w-14 h-7 bg-orange-400 rounded-t-lg mt-1 flex items-center justify-center text-white font-bold text-sm">3</div></div>}
            </div>
          </div>
        )}
        <button onClick={() => { setScreen('join'); setSession(null); setParticipantId(null); setAnsweredQIds(new Set([])); setFinalScore(null); setMyRank(null); setPodium([]) }}
          className="btn-primary mt-4 w-full">{t.backHome}</button>
      </div>
    </div>
  )

  if (screen === 'submitted') return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{t.submitted}</h2>
        <p className="text-gray-500 text-sm">{t.submittedDesc}</p>
        <div className="mt-4 flex justify-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
          <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
        </div>
      </div>
    </div>
  )

  if (screen === 'question' && currentQ) {
    const alreadyAnswered = answeredQIds.has(currentQ.id)
    const timesUp = timeLeft === 0
    const opts = currentQ.options?.sort((a: any, b: any) => a.option_index - b.option_index) || []
    const typeLabel = currentQ.question_type === 'mcq' ? t.mcq : currentQ.question_type === 'rating' ? t.rating : t.open
    return (
      <div className="min-h-screen flex flex-col p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
          <span>{name}</span>
          <LangToggle />
          <span>{t.qOf} {questions.findIndex((q: any) => q.id === currentQ.id) + 1} / {questions.length}</span>
        </div>
        <div className="card flex-1">
          <div className={`text-xs font-medium px-2 py-1 rounded-full w-fit mb-3 ${currentQ.question_type === 'mcq' ? 'bg-blue-100 text-blue-700' : currentQ.question_type === 'rating' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {typeLabel}
          </div>
          {timeLeft !== null && (
            <div className={`text-center text-5xl font-bold font-mono mb-3 ${timeLeft <= 10 ? 'text-red-600' : 'text-blue-700'}`}>
              {timesUp ? '⏰' : timeLeft + 's'}
            </div>
          )}
          <h2 className="text-lg font-semibold text-gray-800 mb-3">{currentQ.question_text}</h2>
          {!alreadyAnswered && !timesUp && <p className="text-xs text-gray-400 mb-3">💡 {t.canChange}</p>}
          {timesUp && !alreadyAnswered && <p className="text-xs text-red-500 mb-3 font-semibold">⏰ {t.autoSubmitted}</p>}
          {currentQ.question_type === 'mcq' && (
            <div className="space-y-2">
              {opts.map((o: any) => (
                <button key={o.id}
                  onClick={() => { if (!alreadyAnswered && timeLeft !== 0) setSelectedAnswer(o.option_index) }}
                  className={`w-full text-left p-3 rounded-xl border-2 text-sm font-medium transition-all ${selectedAnswer === o.option_index ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700'} ${alreadyAnswered || timesUp ? 'opacity-60 cursor-not-allowed' : 'hover:border-blue-300 cursor-pointer'}`}>
                  <span className="font-bold mr-2">{String.fromCharCode(65 + o.option_index)}.</span>{o.option_text}
                </button>
              ))}
            </div>
          )}
          {currentQ.question_type === 'rating' && (
            <div>
              <div className="flex gap-2 justify-between mb-2">
                {[1,2,3,4,5].map((n: number) => (
                  <button key={n}
                    onClick={() => { if (!alreadyAnswered && timeLeft !== 0) setSelectedAnswer(n) }}
                    className={`flex-1 aspect-square rounded-xl text-xl font-bold border-2 transition-all ${selectedAnswer === n ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-700'} ${alreadyAnswered || timesUp ? 'opacity-60 cursor-not-allowed' : 'hover:border-blue-300 cursor-pointer'}`}>
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>{t.disagree}</span><span>{t.agree}</span></div>
            </div>
          )}
          {currentQ.question_type === 'open' && (
            <textarea className="input" rows={4} value={textAnswer}
              onChange={e => { if (!alreadyAnswered && !timesUp) setTextAnswer(e.target.value) }}
              disabled={alreadyAnswered || timesUp} placeholder={t.writeAnswer} />
          )}
        </div>
        <div className="mt-4">
          {alreadyAnswered ? (
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
