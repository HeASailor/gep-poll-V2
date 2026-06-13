import type { Metadata } from 'next'
import './globals.css'
import { LangProvider } from '@/lib/lang'

export const metadata: Metadata = {
  title: 'GEP Poll — Pertamina Training',
  description: 'Live polling untuk sesi pelatihan Pertamina Phase 5',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-gray-50 min-h-screen"><LangProvider>      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <img src="/gep-logo.svg" alt="GEP" className="h-8" />
        <img src="/pertamina-logo.svg" alt="Pertamina" className="h-8" />
      </header>{children}</LangProvider></body>
    </html>
  )
}
