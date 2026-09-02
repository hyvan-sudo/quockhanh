import { useEffect } from 'react'
import type { Room } from '../types'
import {
  maybeAdvanceFromSecret,
  maybeAdvanceFromAnswering,
  advanceFromDiscussion,
  maybeAdvanceFromVoting,
  forceAdvanceFromVoting,
} from '../lib/room'
import SecretWord from '../components/SecretWord'
import QuestionAnswer from '../components/QuestionAnswer'
import Discussion from '../components/Discussion'
import Voting from '../components/Voting'
import Reveal from '../components/Reveal'
import ScoreUpdate from '../components/ScoreUpdate'
import FinalRanking from './FinalRanking'
import GachaScreen from './GachaScreen'

export default function GameRoot({
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
  const isHost = room.hostId === uid

  // Reactive, race-safe auto-advances: any client that observes "everyone
  // is done" nudges the phase forward. Transactions in lib/room.ts make
  // this safe even if several clients fire at once.
  useEffect(() => {
    if (room.phase === 'secret') maybeAdvanceFromSecret(code, room)
    if (room.phase === 'answering') maybeAdvanceFromAnswering(code, room)
    if (room.phase === 'voting') maybeAdvanceFromVoting(code, room)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, room.phase, room.currentRound?.ready, room.currentRound?.answers, room.currentRound?.votes])

  if (room.status === 'finished') {
    if (room.phase === 'gacha') return <GachaScreen uid={uid} code={code} room={room} />
    return <FinalRanking code={code} room={room} isHost={isHost} />
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 paper-texture">
      <div className="w-full flex justify-end max-w-lg mb-2">
        <button className="text-xs opacity-50 hover:opacity-90" onClick={onLeave}>
          leave game
        </button>
      </div>

      {room.phase === 'secret' && <SecretWord uid={uid} code={code} room={room} />}

      {room.phase === 'answering' && <QuestionAnswer uid={uid} code={code} room={room} />}

      {room.phase === 'discussion' && (
        <Discussion room={room} isHost={isHost} onExpire={() => advanceFromDiscussion(code, room)} />
      )}

      {room.phase === 'voting' && (
        <Voting
          uid={uid}
          code={code}
          room={room}
          isHost={isHost}
          onExpire={() => forceAdvanceFromVoting(code, room)}
        />
      )}

      {room.phase === 'reveal' && <Reveal uid={uid} code={code} room={room} isHost={isHost} />}

      {room.phase === 'scoreupdate' && <ScoreUpdate room={room} />}
    </div>
  )
}
