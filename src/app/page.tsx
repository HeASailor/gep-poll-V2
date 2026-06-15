'use client'
import Link from 'next/link'
import { useState } from 'react'

export default function Home() {
  const [lang, setLang] = useState<'id' | 'en'>('id')

  const T = {
    id: {
      badge: 'Platform Penilaian Pelatihan Live',
      title: 'Pertamina Training Quiz',
      subtitle: 'Platform pre-test & post-test real-time untuk sesi pelatihan GEP SMART Phase 5',
      join: '🙋 Bergabung sebagai Peserta',
      login: '🎓 Login Trainer',
      schedule: 'Jadwal Pelatihan — Juli 2026',
      howto: 'Cara Bergabung',
      steps: ['Klik "Bergabung sebagai Peserta"', 'Masukkan nama lengkap Anda', 'Masukkan kode ruangan dari trainer', 'Jawab pertanyaan secara live!'],
      footer: 'Didukung oleh GEP Worldwide • Pertamina Phase 5 Change Management',
      days: 'Hari',
    },
    en: {
      badge: 'Live Training Assessment Platform',
      title: 'Pertamina Training Quiz',
      subtitle: 'Real-time pre-test & post-test platform for GEP SMART Phase 5 training sessions',
      join: '🙋 Join as Participant',
      login: '🎓 Trainer Login',
      schedule: 'Training Schedule — July 2026',
      howto: 'How to Join',
      steps: ['Click "Join as Participant"', 'Enter your full name', 'Enter room code from trainer', 'Answer questions live!'],
      footer: 'Powered by GEP Worldwide • Pertamina Phase 5 Change Management',
      days: 'Days',
    }
  }
  const t = T[lang]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dark hero header */}
      <div className="relative overflow-hidden" style={{backgroundColor:'#0a1628', minHeight:'420px'}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize:'30px 30px'}} />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{backgroundColor:'#ED1C24', transform:'translate(30%, -30%)'}} />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{backgroundColor:'#0066B3', transform:'translate(-30%, 30%)'}} />

        {/* Logo bar with language toggle */}
        <div className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-white border-opacity-10">
          <div className="flex items-center gap-2 bg-white bg-opacity-10 backdrop-blur-sm px-4 py-2 rounded-full border border-white border-opacity-20">
            <span className="font-bold text-white text-sm tracking-wider">GEP</span>
            <div className="w-px h-4 bg-white opacity-30" />
            <span className="font-bold text-white text-sm tracking-wider">PERTAMINA</span>
            <div className="w-2 h-2 rounded-full" style={{backgroundColor:'#ED1C24'}} />
          </div>
          {/* Language toggle */}
          <div className="flex items-center gap-1 bg-white bg-opacity-10 rounded-full p-1">
            <button onClick={() => setLang('id')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${lang === 'id' ? 'bg-white text-gray-800' : 'text-white'}`}>🇮🇩 ID</button>
            <button onClick={() => setLang('en')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${lang === 'en' ? 'bg-white text-gray-800' : 'text-white'}`}>🇬🇧 EN</button>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-6 border" style={{backgroundColor:'rgba(237,28,36,0.15)', borderColor:'rgba(237,28,36,0.3)', color:'#ff6b6b'}}>
            🔴 LIVE — {t.badge}
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">{t.title}</h1>
          <p className="text-gray-400 mb-10 text-lg">{t.subtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/join" className="text-white font-semibold text-lg py-4 px-8 rounded-xl transition-all" style={{backgroundColor:'#ED1C24'}}>
              {t.join}
            </Link>
            <Link href="/admin" className="text-white font-semibold text-lg py-4 px-8 rounded-xl border border-white border-opacity-30 hover:bg-white hover:bg-opacity-10 transition-all">
              {t.login}
            </Link>
          </div>
        </div>
      </div>

      {/* Training schedule */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h2 className="text-center font-semibold text-gray-700 mb-6">{t.schedule}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            {icon:'👤', title:'Key User', color:'#0066B3', bg:'#EFF6FF', dates:'13 – 17 Jul 2026', days:'5'},
            {icon:'👥', title:'End User', color:'#00A651', bg:'#F0FDF4', dates:'20 – 24 Jul 2026', days:'5'},
            {icon:'🏢', title:'Vendor', color:'#ED1C24', bg:'#FFF5F5', dates:'27 – 30 Jul 2026', days:'4'},
          ].map(s => (
            <div key={s.title} className="rounded-xl p-5 text-center border" style={{backgroundColor:s.bg, borderColor:s.color+'33'}}>
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="font-bold text-base mb-1" style={{color:s.color}}>{s.title}</div>
              <div className="text-sm text-gray-500">{s.dates}</div>
              <div className="text-xs text-gray-400 mt-1">{s.days} {t.days}</div>
            </div>
          ))}
        </div>

        {/* How to join */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-5 text-center">{t.howto}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['👆','✍️','🔢','✅'].map((icon, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl mb-2">{icon}</div>
                <div className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center mx-auto mb-2" style={{backgroundColor:'#0a1628'}}>{i+1}</div>
                <div className="text-xs text-gray-500">{t.steps[i]}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">{t.footer}</p>
      </div>
    </div>
  )
}
