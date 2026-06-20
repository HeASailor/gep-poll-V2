'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const clients = [
  {
    id: 'pertamina',
    name: 'Pertamina',
    subtitle: 'Phase 5 GEP SMART Implementation',
    logo: '🛢️',
    color: '#00A651',
    status: 'active',
    batches: [
      { name: 'Key User', dates: '13–17 Jul 2026', count: '~80 participants', icon: '👤' },
      { name: 'End User', dates: '20–24 Jul 2026', count: '~300 participants', icon: '👥' },
      { name: 'Vendor', dates: '27–30 Jul 2026', count: '~1500 participants', icon: '🏢' },
    ],
  },
]

const stats = [
  { value: '10+', label: 'Sessions per Program' },
  { value: '1000+', label: 'Participants Trained' },
  { value: '∞', label: 'Questions/Session' },
  { value: '100%', label: 'Real-time' },
]

const features = [
  { icon: '⚡', title: 'Live Quiz', desc: 'Real-time questions with instant feedback' },
  { icon: '📊', title: 'Smart Reports', desc: 'Pre vs Post analysis with Excel & PPT export' },
  { icon: '🏆', title: 'Leaderboard', desc: 'Live rankings with animated podium' },
  { icon: '🎯', title: 'Answer Analytics', desc: 'See exactly how many picked each option' },
  { icon: '📱', title: 'Mobile First', desc: 'Works on any device, no app needed' },
  { icon: '🌐', title: 'Bilingual', desc: 'English & Bahasa Indonesia support' },
]

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div style={{fontFamily: "'Inter', system-ui, sans-serif", backgroundColor: '#070B14', minHeight: '100vh', color: 'white'}}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
        @keyframes float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        * { box-sizing: border-box; }
        a:hover { opacity: 0.85 !important; }
      `}</style>

      {/* Nav */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,padding:'0 24px',height:'64px',display:'flex',alignItems:'center',justifyContent:'space-between',transition:'all 0.3s',backgroundColor:scrolled?'rgba(7,11,20,0.95)':'transparent',backdropFilter:scrolled?'blur(12px)':'none',borderBottom:scrolled?'1px solid rgba(255,255,255,0.08)':'none'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'linear-gradient(135deg,#E21B3C,#1368CE)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',fontWeight:900,color:'white'}}>T</div>
          <span style={{fontWeight:800,fontSize:'18px',letterSpacing:'-0.5px'}}>GEP <span style={{color:'#E21B3C', marginLeft:'4px'}}>TrainIQ</span></span>
        </div>
        <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
          <a href="/join" style={{color:'rgba(255,255,255,0.6)',textDecoration:'none',fontSize:'14px',fontWeight:500}}>Join Session</a>
          <a href="/admin" style={{backgroundColor:'#E21B3C',color:'white',textDecoration:'none',fontSize:'14px',fontWeight:700,padding:'8px 20px',borderRadius:'8px'}}>Trainer Login</a>
        </div>
      </nav>

      {/* Hero */}
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'80px 24px 60px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle at 50% 40%, rgba(226,27,60,0.15) 0%, transparent 60%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',backgroundSize:'60px 60px',pointerEvents:'none'}}/>

        <div style={{position:'relative',maxWidth:'800px'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:'8px',backgroundColor:'rgba(226,27,60,0.15)',border:'1px solid rgba(226,27,60,0.3)',borderRadius:'100px',padding:'6px 16px',marginBottom:'32px'}}>
            <div style={{width:'6px',height:'6px',borderRadius:'50%',backgroundColor:'#E21B3C',animation:'pulse 2s infinite'}}/>
            <span style={{fontSize:'13px',color:'#E21B3C',fontWeight:600}}>Live Training Platform by GEP</span>
          </div>

          <h1 style={{fontSize:'clamp(40px, 8vw, 80px)',fontWeight:900,lineHeight:1.05,letterSpacing:'-2px',marginBottom:'24px',margin:'0 0 24px 0'}}>
            Training that feels<br/>
            <span style={{background:'linear-gradient(135deg,#E21B3C 0%,#1368CE 50%,#26890C 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>like a game.</span>
          </h1>

          <p style={{fontSize:'18px',color:'rgba(255,255,255,0.5)',lineHeight:1.7,maxWidth:'520px',margin:'0 auto 48px'}}>
            Built for GEP consultants. Run live training assessments, measure knowledge gaps, and deliver client-ready reports — all in one platform.
          </p>

          <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
            <a href="/join" style={{backgroundColor:'#E21B3C',color:'white',textDecoration:'none',fontSize:'16px',fontWeight:700,padding:'14px 32px',borderRadius:'12px',boxShadow:'0 8px 24px rgba(226,27,60,0.4)',display:'inline-block'}}>
              🙋 Join a Session
            </a>
            <a href="/admin" style={{backgroundColor:'rgba(255,255,255,0.08)',color:'white',textDecoration:'none',fontSize:'16px',fontWeight:600,padding:'14px 32px',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.12)',display:'inline-block'}}>
              🎓 Trainer Login →
            </a>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1px',backgroundColor:'rgba(255,255,255,0.08)',borderRadius:'16px',overflow:'hidden',maxWidth:'600px',width:'100%',marginTop:'80px'}}>
          {stats.map((s,i) => (
            <div key={i} style={{backgroundColor:'rgba(255,255,255,0.04)',padding:'20px 16px',textAlign:'center'}}>
              <div style={{fontSize:'28px',fontWeight:900}}>{s.value}</div>
              <div style={{fontSize:'12px',color:'rgba(255,255,255,0.4)',marginTop:'4px'}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Clients */}
      <div style={{padding:'80px 24px',maxWidth:'960px',margin:'0 auto'}}>
        <div style={{marginBottom:'48px'}}>
          <div style={{fontSize:'12px',fontWeight:700,color:'#E21B3C',letterSpacing:'2px',marginBottom:'12px',textTransform:'uppercase'}}>Active Engagements</div>
          <h2 style={{fontSize:'36px',fontWeight:800,letterSpacing:'-1px',margin:0}}>Current Training Programs</h2>
        </div>

        {clients.map((client,i) => (
          <div key={i} style={{backgroundColor:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'20px',padding:'32px',marginBottom:'16px',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:'3px',background:`linear-gradient(90deg,${client.color},transparent)`}}/>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:'20px',marginBottom:'24px'}}>
              <div style={{display:'flex',gap:'16px',alignItems:'center'}}>
                <div style={{width:'56px',height:'56px',borderRadius:'14px',backgroundColor:`${client.color}20`,border:`1px solid ${client.color}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px'}}>
                  {client.logo}
                </div>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
                    <h3 style={{fontSize:'22px',fontWeight:800,margin:0}}>{client.name}</h3>
                    <span style={{fontSize:'11px',fontWeight:700,backgroundColor:`${client.color}20`,color:client.color,padding:'3px 10px',borderRadius:'100px',border:`1px solid ${client.color}40`,textTransform:'uppercase',letterSpacing:'1px'}}>● LIVE</span>
                  </div>
                  <p style={{color:'rgba(255,255,255,0.5)',fontSize:'14px',margin:0}}>{client.subtitle}</p>
                </div>
              </div>
              <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
                <a href="/join" style={{backgroundColor:'rgba(255,255,255,0.08)',color:'white',textDecoration:'none',fontSize:'14px',fontWeight:600,padding:'10px 20px',borderRadius:'10px',border:'1px solid rgba(255,255,255,0.12)',display:'inline-block'}}>
                  Join as Participant
                </a>
                <a href="/admin" style={{backgroundColor:client.color,color:'white',textDecoration:'none',fontSize:'14px',fontWeight:700,padding:'10px 20px',borderRadius:'10px',display:'inline-block'}}>
                  Trainer Dashboard →
                </a>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px'}}>
              {client.batches.map((b,j) => (
                <div key={j} style={{backgroundColor:'rgba(255,255,255,0.04)',borderRadius:'12px',padding:'16px',border:'1px solid rgba(255,255,255,0.06)'}}>
                  <div style={{fontSize:'20px',marginBottom:'8px'}}>{b.icon}</div>
                  <div style={{fontWeight:700,fontSize:'14px',marginBottom:'4px'}}>{b.name}</div>
                  <div style={{color:'rgba(255,255,255,0.5)',fontSize:'12px'}}>{b.dates}</div>
                  <div style={{color:client.color,fontSize:'12px',fontWeight:600,marginTop:'4px'}}>{b.count}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* New Client CTA */}
        <div style={{backgroundColor:'rgba(255,255,255,0.02)',border:'2px dashed rgba(255,255,255,0.12)',borderRadius:'20px',padding:'40px',textAlign:'center'}}>
          <div style={{fontSize:'36px',marginBottom:'16px',animation:'float 3s ease-in-out infinite'}}>✦</div>
          <h3 style={{fontSize:'22px',fontWeight:700,marginBottom:'8px',margin:'0 0 8px 0'}}>Starting a New Engagement?</h3>
          <p style={{color:'rgba(255,255,255,0.4)',fontSize:'15px',marginBottom:'28px',lineHeight:1.6,margin:'0 0 28px 0'}}>
            Set up your client's training program in minutes.<br/>Build questions, invite participants, run live sessions.
          </p>
          <a href="/admin" style={{backgroundColor:'#1368CE',color:'white',textDecoration:'none',fontSize:'15px',fontWeight:700,padding:'14px 32px',borderRadius:'12px',display:'inline-block',boxShadow:'0 8px 24px rgba(19,104,206,0.4)'}}>
            Start New Program →
          </a>
        </div>
      </div>

      {/* Features */}
      <div style={{padding:'80px 24px',maxWidth:'960px',margin:'0 auto'}}>
        <div style={{marginBottom:'48px',textAlign:'center'}}>
          <div style={{fontSize:'12px',fontWeight:700,color:'#1368CE',letterSpacing:'2px',marginBottom:'12px',textTransform:'uppercase'}}>What it does</div>
          <h2 style={{fontSize:'36px',fontWeight:800,letterSpacing:'-1px',margin:0}}>Built for enterprise training</h2>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'16px'}}>
          {features.map((f,i) => (
            <div key={i} style={{backgroundColor:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'14px',padding:'24px',transition:'border-color 0.2s'}}>
              <div style={{fontSize:'28px',marginBottom:'12px'}}>{f.icon}</div>
              <div style={{fontWeight:700,fontSize:'16px',marginBottom:'6px'}}>{f.title}</div>
              <div style={{color:'rgba(255,255,255,0.45)',fontSize:'14px',lineHeight:1.6}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{borderTop:'1px solid rgba(255,255,255,0.08)',padding:'32px 24px',textAlign:'center'}}>
        <div style={{color:'rgba(255,255,255,0.25)',fontSize:'13px'}}>
          GEP TrainIQ — Enterprise Training Platform • Built by GEP Worldwide
        </div>
      </div>
    </div>
  )
}
