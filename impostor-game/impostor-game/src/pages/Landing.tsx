import { useState } from 'react'
import { createRoom, joinRoom } from '../lib/room'

const LS_NAME = 'impostor_player_name'

export default function Landing({
  uid,
  onEnterRoom,
}: {
  uid: string
  onEnterRoom: (code: string) => void
}) {
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home')
  const [name, setName] = useState(localStorage.getItem(LS_NAME) || '')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim()) return setErr('Enter your name first.')
    setErr(null)
    setLoading(true)
    try {
      localStorage.setItem(LS_NAME, name.trim())
      const newCode = await createRoom(name, uid)
      onEnterRoom(newCode)
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!name.trim()) return setErr('Enter your name first.')
    if (code.trim().length < 4) return setErr('Enter a valid room code.')
    setErr(null)
    setLoading(true)
    try {
      localStorage.setItem(LS_NAME, name.trim())
      await joinRoom(code, name, uid)
      onEnterRoom(code.trim().toUpperCase())
    } catch (e: any) {
      setErr(e?.message || 'Could not join room.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 paper-texture">
      <div className="w-full max-w-md text-center">
        <div className="text-6xl mb-3">🇻🇳</div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight gold-text leading-tight">
          WHO'S THE
          <br />
          IMPOSTOR?
        </h1>
        <p className="mt-3 text-vngold/90 font-bold tracking-wide">"2/9 SPECIAL EDITION"</p>
        <p className="mt-1 text-sm opacity-80">7 players. One impostor. Trust nobody.</p>

        <div className="mt-10 card-shell p-6">
          {mode === 'home' && (
            <div className="flex flex-col gap-3">
              <button className="btn-primary" onClick={() => setMode('create')}>
                CREATE ROOM
              </button>
              <button className="btn-secondary" onClick={() => setMode('join')}>
                JOIN ROOM
              </button>
            </div>
          )}

          {mode !== 'home' && (
            <div className="flex flex-col gap-3">
              <input
                className="w-full rounded-lg bg-black/30 border border-vngold/30 px-4 py-3 text-center font-semibold placeholder-white/40 focus:outline-none focus:border-vngold"
                placeholder="Your name"
                maxLength={20}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {mode === 'join' && (
                <input
                  className="w-full rounded-lg bg-black/30 border border-vngold/30 px-4 py-3 text-center font-semibold tracking-[0.3em] uppercase placeholder-white/40 focus:outline-none focus:border-vngold"
                  placeholder="ROOM CODE"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
              )}
              {err && <p className="text-sm text-red-200 bg-red-900/40 rounded-lg py-2 px-3">{err}</p>}
              <button
                className="btn-primary"
                disabled={loading}
                onClick={mode === 'create' ? handleCreate : handleJoin}
              >
                {loading ? '...' : mode === 'create' ? 'CREATE ROOM' : 'JOIN ROOM'}
              </button>
              <button className="text-sm opacity-70 hover:opacity-100 mt-1" onClick={() => setMode('home')}>
                ← back
              </button>
            </div>
          )}
        </div>

        <p className="mt-8 text-xs opacity-60">National Day Special — September 2nd</p>
      </div>
    </div>
  )
}
