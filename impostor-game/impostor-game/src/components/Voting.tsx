import { useState, useEffect } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../firebase'
import Timer from './Timer'
import { submitVote, submitImpostorGuess, VOTING_SECONDS } from '../lib/room'
import type { Room, PlayerSecret } from '../types'

export default function Voting({
  uid,
  code,
  room,
  isHost,
  onExpire,
}: {
  uid: string
  code: string
  room: Room
  isHost: boolean
  onExpire: () => void
}) {
  const [picked, setPicked] = useState<string | null>(null)
  const cr = room.currentRound
  const votes = cr?.votes || {}
  const players = Object.values(room.players || {}).sort((a, b) => a.joinedAt - b.joinedAt)
  const myVote = votes[uid]?.votedFor
  const votedCount = players.filter((p) => votes[p.id]).length

  const [mySecret, setMySecret] = useState<PlayerSecret | null>(null)
  useEffect(() => {
    const secretRef = ref(db, `secrets/${code}/players/${uid}`)
    const unsub = onValue(secretRef, (snap) => setMySecret(snap.exists() ? (snap.val() as PlayerSecret) : null))
    return unsub
  }, [code, uid])
  const isImpostor = !!mySecret?.isImpostor
  const [guess, setGuess] = useState('')
  const [guessSaved, setGuessSaved] = useState(false)
  useEffect(() => {
    if (mySecret?.guess) {
      setGuess(mySecret.guess)
      setGuessSaved(true)
    }
  }, [mySecret?.guess])

  async function handleVote(targetId: string) {
    if (targetId === uid || myVote) return
    setPicked(targetId)
    try {
      await submitVote(code, uid, targetId)
    } catch {
      setPicked(null)
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <p className="text-xs opacity-70 tracking-widest mb-4">
        ROUND {room.round} / {room.totalRounds}
      </p>
      <div className="card-shell p-6">
        <p className="text-2xl font-black gold-text mb-1">WHO IS THE IMPOSTOR?</p>
        <p className="text-xs opacity-60 mb-5">Tap a player to vote</p>

        {isImpostor && (
          <div className="mb-5 bg-black/25 border border-vngold/30 rounded-lg p-3 text-left">
            <p className="text-xs opacity-70 mb-2">
              🤫 Psst — secretly guess the MAIN word for a +100 bonus if you're right:
            </p>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg bg-black/30 border border-vngold/30 px-3 py-2 text-sm font-semibold placeholder-white/40 focus:outline-none focus:border-vngold"
                placeholder="e.g. INDEPENDENCE"
                maxLength={40}
                value={guess}
                disabled={guessSaved}
                onChange={(e) => setGuess(e.target.value)}
              />
              <button
                className="btn-secondary !py-2 !px-4 text-sm"
                disabled={guessSaved || !guess.trim()}
                onClick={async () => {
                  await submitImpostorGuess(code, uid, guess)
                  setGuessSaved(true)
                }}
              >
                {guessSaved ? 'saved' : 'save'}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 mb-5">
          {players.map((p) => {
            const isSelf = p.id === uid
            const selected = myVote === p.id || picked === p.id
            return (
              <button
                key={p.id}
                disabled={isSelf || !!myVote}
                onClick={() => handleVote(p.id)}
                className={`w-full text-left rounded-lg px-4 py-3 font-semibold border transition ${
                  selected
                    ? 'bg-vngold text-vndeepred border-vngold'
                    : isSelf
                    ? 'bg-black/10 border-white/10 opacity-40 cursor-not-allowed'
                    : 'bg-black/25 border-vngold/20 hover:border-vngold/60'
                }`}
              >
                {p.name} {isSelf && <span className="text-xs opacity-70">(you)</span>}
                {votes[p.id] && !selected && <span className="float-right text-xs opacity-60">voted</span>}
              </button>
            )
          })}
        </div>

        <Timer startedAt={room.phaseStartedAt} seconds={VOTING_SECONDS} onExpire={isHost ? onExpire : undefined} />
        <p className="text-xs opacity-60 mt-3">
          {votedCount}/{players.length} players have voted
        </p>
      </div>
    </div>
  )
}
