import { proceedAfterReveal } from '../lib/room'
import type { Room } from '../types'

export default function Reveal({
  code,
  room,
  isHost,
}: {
  uid: string
  code: string
  room: Room
  isHost: boolean
}) {
  const cr = room.currentRound
  const results = cr?.results
  const players = room.players || {}
  const playerList = Object.values(players).sort((a, b) => a.joinedAt - b.joinedAt)

  if (!results) {
    return <p className="text-center opacity-70 animate-pulse">Tallying votes…</p>
  }

  const impostor = players[results.impostorId]

  return (
    <div className="w-full max-w-md mx-auto text-center">
      <p className="text-xs opacity-70 tracking-widest mb-4">
        ROUND {room.round} / {room.totalRounds} — REVEAL
      </p>
      <div className="card-shell p-6">
        <p className="text-xs tracking-[0.2em] opacity-70 mb-3">VOTES</p>
        <div className="flex flex-col gap-1 mb-5 text-sm">
          {Object.entries(cr?.votes || {}).map(([voterId, v]) => (
            <p key={voterId} className="opacity-90">
              <span className="font-semibold">{players[voterId]?.name}</span>
              <span className="opacity-50"> → </span>
              <span className="font-semibold">{players[v.votedFor]?.name}</span>
            </p>
          ))}
        </div>

        <div className="border-y-2 border-vngold/40 py-5 my-4">
          <p className="text-3xl mb-2">🕵️</p>
          <p className="text-xl font-black gold-text">
            {impostor?.name?.toUpperCase()} WAS THE IMPOSTOR!
          </p>
          <p className={`text-sm mt-2 font-bold ${results.impostorCaught ? 'text-green-300' : 'text-red-300'}`}>
            {results.impostorCaught ? '✅ Caught by the majority!' : '❌ The group got it wrong!'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-black/25 rounded-lg p-3">
            <p className="text-xs opacity-60">MAIN WORD</p>
            <p className="font-bold text-vngold">{results.mainWord}</p>
          </div>
          <div className="bg-black/25 rounded-lg p-3">
            <p className="text-xs opacity-60">IMPOSTOR WORD</p>
            <p className="font-bold text-vngold">{results.impostorWord}</p>
          </div>
        </div>

        {results.impostorGuessedMain && (
          <p className="text-sm text-green-300 font-bold mb-4">
            🎯 {impostor?.name} correctly guessed the main word! +100 bonus
          </p>
        )}

        <p className="text-xs tracking-[0.2em] opacity-70 mb-2">SCORE CHANGES</p>
        <div className="flex flex-col gap-1 mb-5">
          {playerList.map((p) => {
            const delta = results.deltas[p.id] || 0
            return (
              <div key={p.id} className="flex justify-between text-sm bg-black/20 rounded px-3 py-1.5">
                <span>{p.name}</span>
                <span className={`font-bold ${delta > 0 ? 'text-green-300 animate-popin' : 'opacity-50'}`}>
                  {delta > 0 ? `+${delta}` : '+0'}
                </span>
              </div>
            )
          })}
        </div>

        {isHost && (
          <button className="btn-primary w-full" onClick={() => proceedAfterReveal(code, room)}>
            {room.round >= room.totalRounds ? 'SEE FINAL RESULTS' : 'NEXT ROUND'}
          </button>
        )}
        {!isHost && <p className="text-xs opacity-60 animate-pulse">Waiting for host to continue…</p>}
      </div>
    </div>
  )
}
