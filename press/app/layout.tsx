import type {Metadata} from 'next'
import './globals.css'
import Ticker from '../components/Ticker'

export const metadata: Metadata = {
  title: 'ZéroJour — the zero-day paper',
  description: 'A newspaper printed live from a structured security-advisory dataset (Sanity). Every headline is a real advisory; every number is a typed field.',
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <Ticker />
        <header className="masthead">
          <h1>ZÉROJOUR</h1>
          <div className="tagline">The zero-day paper — printed from structured content, not scraped prose.</div>
          <div className="dateline">
            <span>Permanent edition</span>
            <span>Public dataset · Sanity GROQ</span>
            <span>GHSA × CISA KEV</span>
          </div>
        </header>
        {children}
        <main>
          <hr className="footer-rule" />
          <p className="fineprint">
            ZéroJour prints itself from a Sanity dataset of real advisories (GitHub Advisory Database, CC-BY-4.0; CISA KEV). No scraping,
            no keyword search — headlines are typed fields, scores are numbers, fixes are versions. The newsroom composes, a human approves.
          </p>
        </main>
      </body>
    </html>
  )
}
