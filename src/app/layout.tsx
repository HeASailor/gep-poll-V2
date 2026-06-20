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
      <body className="bg-gray-50 min-h-screen"><LangProvider>{children}</LangProvider></body>
    </html>
  )
}
// cache bust Mon Jun 15 13:09:30 IST 2026
