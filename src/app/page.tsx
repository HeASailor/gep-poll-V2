'use client'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center mb-10">
        <div className="text-blue-700 text-5xl font-bold mb-2">GEP Poll</div>
        <p className="text-gray-500 text-lg">Platform Polling Live — Pertamina Phase 5</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Link href="/join" className="btn-primary text-center text-lg py-4 rounded-xl flex-1">
          🙋 Bergabung sebagai Peserta
        </Link>
        <Link href="/admin" className="btn-secondary text-center text-lg py-4 rounded-xl flex-1">
          🎓 Login Trainer
        </Link>
      </div>
    </div>
  )
}
