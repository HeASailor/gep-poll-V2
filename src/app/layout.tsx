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
      <body className="bg-gray-50 min-h-screen"><LangProvider>{children}</LangProvider></body>
    </html>
  )
}
