content = open('/Users/himanshu/Desktop/gep-poll/src/app/admin/session/[id]/page.tsx').read()

# Find the full present tab section
start = content.find("tab === 'present' && (")
end = content.find("\n      )}\n\n      {tab === 'results'", start)
old_present = content[start:end]

new_present = """tab === 'present' && (
        <div className="space-y-0">
          {/* Kahoot-style presenter view */}
          {!currentQ ? (
            /* Waiting / Lobby screen */
            <div className="rounded-2xl overflow-hidden" style={{background:'linear-gradient(135deg,#1a0533 0%,#0a1628 100%)',minHeight:'400px'}}>
              <div className="p-8 text-center">
                <div className="text-white text-opacity-60 text-sm mb-2 uppercase tracking-widest">GEP TrainIQ</div>
                <h2 className="text-3xl font-black text-white mb-6">{session.title}</h2>
                <div className="inline-block bg-white rounded-2xl px-8 py-6 mb-6 shadow-2xl">
                  <div className="text-gray-500 text-sm font-medium mb-1">{lang === "en" ? "Join at" : "Bergabung di"}</div>
                  <div className="text-blue-700 font-bold text-sm mb-3">gep-poll.vercel.app/join</div>
                  <div className="text-6xl font-black font-mono text-gray-900 tracking-widest">{session?.room_code || '...'}</div>
                  <div className="text-gray-400 text-xs mt-2">{lang === "en" ? "Room Code" : "Kode Ruangan"}</div>
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
        </div>"""

if old_present in content:
    content = content.replace(old_present, new_present)
    print('✅ Present tab redesigned!')
else:
    print('❌ Could not find present tab - showing first 100 chars:')
    print(repr(old_present[:100]))

with open('/Users/himanshu/Desktop/gep-poll/src/app/admin/session/[id]/page.tsx', 'w') as f:
    f.write(content)
