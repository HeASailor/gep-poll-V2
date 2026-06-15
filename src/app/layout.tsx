import type { Metadata } from 'next'
import './globals.css'
import { LangProvider } from '@/lib/lang'

export const metadata: Metadata = {
  title: 'GEP TrainIQ — Training Assessment Platform',
  description: 'GEP TrainIQ — Real-time training assessment platform for GEP implementations',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-gray-50 min-h-screen"><LangProvider>      <header style={{backgroundColor:'#0a1628'}} className="px-4 py-3 flex items-center justify-between border-b border-white border-opacity-10">
        <div className="flex items-center gap-2 bg-white bg-opacity-10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white border-opacity-20">
          <span className="font-bold text-white text-xs tracking-wider">GEP</span>
          <div className="w-px h-3 bg-white opacity-30" />
          <span className="font-bold text-white text-xs tracking-wider">PERTAMINA</span>
          <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:'#ED1C24'}} />
        </div>
        <span className="text-white text-opacity-40 text-xs hidden sm:block">GEP SMART Phase 5</span>
      </header>{children}</LangProvider></body>
    </html>
  )
}
// cache bust Mon Jun 15 13:09:30 IST 2026
