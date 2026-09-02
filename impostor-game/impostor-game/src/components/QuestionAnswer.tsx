import { useState } from 'react'
import { submitAnswer } from '../lib/room'
import type { Room } from '../types'

export default function QuestionAnswer({ uid, code, room }: { uid: string; code: string; room: Room }) {
  const [text, setText] = useState('')
  const cr = room.currentRound
  const answers = cr?.answers || {}
  const players = Object.values(room.players || {})
  const submittedCount = players.filter((p) => answers[p.id]).length
  const alreadySubmitted = !!answers[uid]

  async function handleSubmit() {
    if (!text.trim()) return
    await submitAnswer(code, uid, text)
  }

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <p className="text-xs opacity-70 tracking-widest mb-4">
        ROUND {room.round} / {room.totalRounds}
      </p>
      <div className="card-shell p-6">
        <p className="text-xs tracking-[0.2em] opacity-70 mb-2">QUESTION</p>
        <p className="text-xl font-bold mb-6">"{cr?.questionText}"</p>

        {!alreadySubmitted ? (
          <div className="flex flex-col gap-3">
            <input
              className="w-full rounded-lg bg-black/30 border border-vngold/30 px-4 py-3 text-center font-semibold placeholder-white/40 focus:outline-none focus:border-vngold"
              placeholder="Your short answer…"
              maxLength={100}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <p className="text-xs opacity-50">{text.length}/100</p>
            <button className="btn-primary" disabled={!text.trim()} onClick={handleSubmit}>
              SUBMIT ANSWER
            </button>
          </div>
        ) : (
          <p className="text-sm text-vngold font-bold animate-pulse">
            Answer locked in ✓ Waiting for others… ({submittedCount}/{players.length})
          </p>
        )}
      </div>
    </div>
  )
}
