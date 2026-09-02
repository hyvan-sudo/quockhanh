import type { Room } from '../types'

export default function ScoreUpdate({ room }: { room: Room }) {
  const players = Object.values(room.players || {}).sort((a, b) => b.score - a.score)
  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <div className="card-shell p-6">
        <p className="text-lg font-black gold-text mb-4">SCOREBOARD</p>
        <div className="flex flex-col gap-2">
          {players.map((p, i) => (
            <div key={p.id} className="flex justify-between bg-black/25 rounded-lg px-4 py-2">
              <span className="font-semibold">
                {i + 1}. {p.name}
              </span>
              <span className="font-bold text-vngold">{p.score}</span>
            </div>
          ))}
        </div>
        <p className="text-xs opacity-60 mt-5 animate-pulse">Next round starting…</p>
      </div>
    </div>
  )
}
