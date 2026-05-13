import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Live ADU',
  description: 'A modern web interface for Hikvision cameras, built with Next.js and Tailwind CSS.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  )
}
