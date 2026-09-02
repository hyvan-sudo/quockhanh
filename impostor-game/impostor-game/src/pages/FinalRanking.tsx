import { goToGacha } from '../lib/room'
import type { Room } from '../types'

const MEDALS = ['🥇', '🥈', '🥉']

export default function FinalRanking({
  code,
  room,
  isHost,
}: {
  code: string
  room: Room
  isHost: boolean
}) {
  const ranking = room.finalRanking || []
  const players = room.players || {}

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 paper-texture">
      <div className="w-full max-w-md text-center">
        <p className="text-5xl mb-2">🏆</p>
        <h1 className="text-3xl font-black gold-text mb-6">FINAL RESULTS</h1>

        <div className="card-shell p-5">
          <div className="flex flex-col gap-2">
            {ranking.map((r) => (
              <div
                key={r.playerId}
                className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                  r.rank === 1 ? 'bg-vngold/20 border border-vngold/60' : 'bg-black/25'
                }`}
              >
                <span className="flex items-center gap-2 font-bold">
                  <span className="w-7 text-left">{MEDALS[r.rank - 1] || `${r.rank}.`}</span>
                  {players[r.playerId]?.name}
                </span>
                <span className="font-black text-vngold">{r.score} pts</span>
              </div>
            ))}
          </div>
        </div>

        {isHost && (
          <button className="btn-primary mt-6 w-full" onClick={() => goToGacha(code)}>
            🎰 CONTINUE TO GACHA 2/9
          </button>
        )}
        {!isHost && <p className="text-xs opacity-60 mt-6 animate-pulse">Waiting for host to open Gacha…</p>}
      </div>
    </div>
  )
}
