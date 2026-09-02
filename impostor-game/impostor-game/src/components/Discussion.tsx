import Timer from './Timer'
import type { Room } from '../types'
import { DISCUSSION_SECONDS } from '../lib/room'

export default function Discussion({
  room,
  isHost,
  onExpire,
}: {
  room: Room
  isHost: boolean
  onExpire: () => void
}) {
  const cr = room.currentRound
  const players = Object.values(room.players || {}).sort((a, b) => a.joinedAt - b.joinedAt)

  return (
    <div className="w-full max-w-lg mx-auto">
      <p className="text-xs opacity-70 tracking-widest mb-4 text-center">
        ROUND {room.round} / {room.totalRounds} — DISCUSSION
      </p>
      <div className="card-shell p-5">
        <p className="text-xs tracking-[0.2em] opacity-70 mb-1 text-center">QUESTION</p>
        <p className="text-lg font-bold mb-5 text-center">"{cr?.questionText}"</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
          {players.map((p) => (
            <div key={p.id} className="bg-black/25 rounded-lg px-3 py-2">
              <p className="text-xs opacity-60">{p.name}</p>
              <p className="font-semibold">{cr?.answers?.[p.id]?.text || '—'}</p>
            </div>
          ))}
        </div>

        <Timer startedAt={room.phaseStartedAt} seconds={DISCUSSION_SECONDS} onExpire={isHost ? onExpire : undefined} />
        <p className="text-center text-xs opacity-60 mt-3">
          Discuss out loud (voice call / in person). Who sounds off?
        </p>
      </div>
    </div>
  )
}
