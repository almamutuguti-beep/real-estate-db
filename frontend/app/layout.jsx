import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata = {
  title: 'Velora | Property management workspace',
  description: 'A clear, calm workspace for managing properties, tenants, applications, and rental income.',
  generator: 'v0.app',
}

export const viewport = {
  colorScheme: 'light',
  themeColor: '#ffecd1',
}

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
