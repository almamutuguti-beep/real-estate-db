import { Instrument_Sans, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const instrument = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })

export const metadata = {
  title: 'Velora | The platform to manage property',
  description:
    'Velora brings owners, tenants, agents, maintenance teams and admins into one calm workspace for listings, leases, payments and repairs.',
  generator: 'v0.app',
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f4f0' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0c0b' },
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${instrument.variable} ${jetbrains.variable}`}>
      <body>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
