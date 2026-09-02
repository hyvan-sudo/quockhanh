import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../firebase'
import { markReady } from '../lib/room'
import type { Room } from '../types'

export default function SecretWord({ uid, code, room }: { uid: string; code: string; room: Room }) {
  const [word, setWord] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const secretRef = ref(db, `secrets/${code}/players/${uid}`)
    const unsub = onValue(secretRef, (snap) => {
      setWord(snap.exists() ? (snap.val().word as string) : null)
    })
    return unsub
  }, [code, uid])

  const readyMap = room.currentRound?.ready || {}
  const players = Object.values(room.players || {})
  const readyCount = players.filter((p) => readyMap[p.id]).length

  async function handleReady() {
    setReady(true)
    await markReady(code, uid)
  }

  const iAmReady = !!readyMap[uid] || ready

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <p className="text-xs opacity-70 tracking-widest mb-4">
        ROUND {room.round} / {room.totalRounds}
      </p>
      <div className="card-shell p-8">
        <div className="border-y-2 border-vngold/40 py-6">
          <p className="text-xs tracking-[0.3em] opacity-70 mb-2">YOUR SECRET WORD</p>
          <div className="text-3xl mb-3">🇻🇳</div>
          {word ? (
            <p className="text-3xl font-black gold-text break-words">{word}</p>
          ) : (
            <p className="opacity-50 animate-pulse">loading…</p>
          )}
        </div>
        <p className="text-xs opacity-60 mt-5">Remember your word. Do not say it out loud.</p>

        {!iAmReady ? (
          <button className="btn-primary mt-6 w-full" onClick={handleReady}>
            I'M READY
          </button>
        ) : (
          <p className="mt-6 text-sm text-vngold font-bold animate-pulse">
            Waiting for others… ({readyCount}/{players.length})
          </p>
        )}
      </div>
    </div>
  )
}
