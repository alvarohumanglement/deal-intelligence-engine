import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Deal Intelligence Engine — Heritage Experience Platforms',
  description: 'AI-powered deal screening for premium hospitality investments. Deterministic scoring against a calibrated PE thesis. IC-ready output in 30 seconds.',
  openGraph: {
    title: 'Deal Intelligence Engine',
    description: 'First-pass deal analysis in 30 seconds — scored against a calibrated investment thesis for premium hospitality.',
    type: 'website',
    siteName: 'Heritage Experience Platforms',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deal Intelligence Engine',
    description: 'AI-powered deal screening for premium hospitality investments. IC-ready output in 30 seconds.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-paper text-ink antialiased">
        {children}
      </body>
    </html>
  )
}
