'use client'

import {useEffect, useState} from 'react'
import {client} from '../lib/sanity'

// App-SDK-style live wire: listens to dataset changes and prints them like a
// wire-service bulletin. This is what "the newspaper updates itself" means.
export default function Ticker() {
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    const subscription = client
      .listen('*[_type == "advisory"]', {}, {visibility: 'query'})
      .subscribe((update) => {
        if (update.type === 'mutation' && update.result) {
          const doc = update.result as {title?: string; ghsaId?: string}
          if (doc.ghsaId) {
            setFlash(`BULLETIN — ${doc.ghsaId}: ${doc.title ?? 'advisory updated'}`)
            setTimeout(() => setFlash(null), 12000)
          }
        }
      })
    return () => subscription.unsubscribe()
  }, [])

  if (!flash) return null
  return (
    <div className="ticker">
      <b>● LIVE&nbsp;&nbsp;</b> {flash}
    </div>
  )
}
