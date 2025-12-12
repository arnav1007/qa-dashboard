/**
 * Root layout - wraps all pages with Redux Provider
 */
'use client'

import { Provider } from 'react-redux'
import { store } from './store/store'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>Q&A Dashboard - Real-time Questions & Answers</title>
        <meta name="description" content="Real-time Q&A dashboard for asking and answering questions" />
      </head>
      <body className="min-h-screen bg-gray-50">
        <Provider store={store}>
          {children}
        </Provider>
      </body>
    </html>
  )
}

