// Seals agent events into a local NoireBox journal (POST /api/v1/events).
// Sealing failures never crash the agent, but they are printed loudly and
// reported as `sealed: false` — nothing may claim a proof it did not produce.

import type {Config} from './config.ts'

export class NoireBoxJournal {
  private jwt: string | null = null

  constructor(private cfg: Config) {}

  private async auth(): Promise<string | null> {
    if (this.jwt) return this.jwt
    if (!this.cfg.noireboxClientId || !this.cfg.noireboxClientSecret) return null
    const res = await fetch(`${this.cfg.noireboxUrl.replace(/\/+$/, '')}/api/v1/token`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({client_id: this.cfg.noireboxClientId, client_secret: this.cfg.noireboxClientSecret}),
    })
    if (!res.ok) throw new Error(`token ${res.status}`)
    const json = (await res.json()) as {access_token: string}
    this.jwt = json.access_token
    return this.jwt
  }

  async seal(type: string, payload: Record<string, unknown>): Promise<boolean> {
    try {
      const token = await this.auth()
      const headers: Record<string, string> = {'Content-Type': 'application/json'}
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await fetch(`${this.cfg.noireboxUrl.replace(/\/+$/, '')}/api/v1/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({type, payload}),
      })
      if (!res.ok) {
        console.error(`[noirebox] seal failed (${res.status}) — event NOT sealed: ${type}`)
        return false
      }
      return true
    } catch (err) {
      console.error(`[noirebox] unreachable (${err instanceof Error ? err.message : err}) — event NOT sealed: ${type}`)
      return false
    }
  }

  async verify(): Promise<{ok: boolean; body: unknown}> {
    try {
      const res = await fetch(`${this.cfg.noireboxUrl.replace(/\/+$/, '')}/api/v1/verify`)
      const body = await res.json()
      return {ok: res.ok, body}
    } catch (err) {
      return {ok: false, body: {error: err instanceof Error ? err.message : String(err)}}
    }
  }
}
