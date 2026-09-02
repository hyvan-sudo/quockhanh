import { useState } from 'react'
import { startGame, MAX_PLAYERS, MIN_PLAYERS } from '../lib/room'
import type { Room } from '../types'

export default function Lobby({
  uid,
  code,
  room,
  onLeave,
}: {
  uid: string
  code: string
  room: Room
  onLeave: () => void
}) {
  const [starting, setStarting] = useState(false)
  const players = Object.values(room.players || {}).sort((a, b) => a.joinedAt - b.joinedAt)
  const isHost = room.hostId === uid
  const canStart = players.length >= MIN_PLAYERS && players.length <= MAX_PLAYERS

  async function handleStart() {
    setStarting(true)
    try {
      await startGame(code, room)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10 paper-texture">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl">🇻🇳</div>
          <p className="text-xs opacity-70 mt-1">ROOM CODE</p>
          <p className="text-4xl font-black tracking-[0.3em] gold-text">{code}</p>
        </div>

        <div className="card-shell p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold">PLAYERS</p>
            <p className="font-bold text-vngold">
              {players.length}/{MAX_PLAYERS}
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {players.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center justify-between bg-black/25 rounded-lg px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  <span className="opacity-60 text-sm w-5">{i + 1}.</span>
                  <span className="font-semibold">{p.name}</span>
                  {p.id === room.hostId && <span className="text-xs star-badge">★ HOST</span>}
                  {p.id === uid && <span className="text-xs opacity-60">(you)</span>}
                </span>
                {!p.connected && <span className="text-xs text-red-300">offline</span>}
              </li>
            ))}
          </ul>

          {players.length < MAX_PLAYERS && (
            <p className="text-center text-xs opacity-60 mt-4 animate-pulse">Waiting for players…</p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {isHost ? (
            <button className="btn-primary" disabled={!canStart || starting} onClick={handleStart}>
              {starting ? '...' : canStart ? 'START GAME' : `NEED AT LEAST ${MIN_PLAYERS} PLAYERS`}
            </button>
          ) : (
            <p className="text-center text-sm opacity-70">Waiting for the host to start the game…</p>
          )}
          <button className="btn-secondary" onClick={onLeave}>
            LEAVE ROOM
          </button>
        </div>
      </div>
    </div>
  )
}
