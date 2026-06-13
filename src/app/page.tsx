'use client'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Pertamina color stripe */}
      <div className="flex h-2 w-full">
        <div className="flex-1" style={{backgroundColor:'#ED1C24'}} />
        <div className="flex-1" style={{backgroundColor:'#0066B3'}} />
        <div className="flex-1" style={{backgroundColor:'#00A651'}} />
      </div>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <img src="/gep-logo.svg" alt="GEP" className="h-8" />
        <img src="/pertamina-logo.svg" alt="Pertamina" className="h-10" />
      </div>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="inline-block bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1 rounded-full mb-4">
          GEP SMART Phase 5 — Training Assessment Platform
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-3">
          Pertamina Training Quiz
        </h1>
        <p className="text-gray-500 mb-8 text-lg">
          Live pre-test & post-test platform for GEP SMART Phase 5 training sessions
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link href="/join" className="btn-primary text-center text-lg py-4 px-8 rounded-xl">
            🙋 Join as Participant
          </Link>
          <Link href="/admin" className="btn-secondary text-center text-lg py-4 px-8 rounded-xl">
            🎓 Trainer Login
          </Link>
        </div>

        {/* Training Schedule */}
        <div className="card text-left mb-6">
          <h2 className="font-semibold text-gray-700 mb-4 text-center">Training Schedule — July 2026</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
              <div className="text-2xl mb-2">👤</div>
              <div className="font-semibold text-blue-700">Key User</div>
              <div className="text-sm text-gray-500 mt-1">13 – 17 Jul 2026</div>
              <div className="text-xs text-gray-400 mt-1">5 Days</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
              <div className="text-2xl mb-2">👥</div>
              <div className="font-semibold text-green-700">End User</div>
              <div className="text-sm text-gray-500 mt-1">20 – 24 Jul 2026</div>
              <div className="text-xs text-gray-400 mt-1">5 Days</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
              <div className="text-2xl mb-2">🏢</div>
              <div className="font-semibold text-amber-700">Vendor</div>
              <div className="text-sm text-gray-500 mt-1">27 – 30 Jul 2026</div>
              <div className="text-xs text-gray-400 mt-1">4 Days</div>
            </div>
          </div>
        </div>

        {/* How to join */}
        <div className="card text-left">
          <h2 className="font-semibold text-gray-700 mb-4 text-center">How to Join the Quiz</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              { step: '1', text: 'Click "Join as Participant"', icon: '👆' },
              { step: '2', text: 'Enter your full name', icon: '✍️' },
              { step: '3', text: 'Enter room code from trainer', icon: '🔢' },
              { step: '4', text: 'Answer questions live!', icon: '✅' },
            ].map(s => (
              <div key={s.step} className="text-center p-3">
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center mx-auto mb-2">{s.step}</div>
                <div className="text-sm text-gray-600">{s.text}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-8">
          Powered by GEP Worldwide • Pertamina Phase 5 Change Management
        </p>
      </div>
    </div>
  )
}
