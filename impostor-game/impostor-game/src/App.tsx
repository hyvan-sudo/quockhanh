import { useEffect, useState } from 'react'
import { usePlayerId } from './hooks/usePlayerId'
import { subscribeRoom, maybeClaimHost } from './lib/room'
import type { Room } from './types'
import Landing from './pages/Landing'
import Lobby from './pages/Lobby'
import GameRoot from './pages/GameRoot'

const LS_ROOM = 'impostor_room_code'

export default function App() {
  const { uid, error } = usePlayerId()
  const [roomCode, setRoomCode] = useState<string | null>(() => localStorage.getItem(LS_ROOM))
  const [room, setRoom] = useState<Room | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!roomCode) return
    setNotFound(false)
    const unsub = subscribeRoom(roomCode, (r) => {
      if (!r) {
        setNotFound(true)
        setRoom(null)
        return
      }
      setRoom(r)
    })
    return unsub
  }, [roomCode])

  // Host failover: if host tab vanished, a connected player claims host.
  useEffect(() => {
    if (!uid || !room || !roomCode) return
    maybeClaimHost(roomCode, uid, room)
  }, [uid, room, roomCode])

  function handleEnterRoom(code: string) {
    localStorage.setItem(LS_ROOM, code)
    setRoomCode(code)
  }

  function handleLeaveRoom() {
    localStorage.removeItem(LS_ROOM)
    setRoomCode(null)
    setRoom(null)
  }

  if (error) {
    return (
      <Centered>
        <p className="text-vngold font-bold">Connection error</p>
        <p className="text-sm opacity-80 mt-2">{error}</p>
        <p className="text-xs opacity-60 mt-4">Check your Firebase configuration (.env file).</p>
      </Centered>
    )
  }

  if (!uid) {
    return (
      <Centered>
        <div className="animate-pulse text-vngold font-bold">Connecting… 🇻🇳</div>
      </Centered>
    )
  }

  if (!roomCode) {
    return <Landing uid={uid} onEnterRoom={handleEnterRoom} />
  }

  if (notFound) {
    return (
      <Centered>
        <p className="text-vngold font-bold text-xl">Room not found</p>
        <p className="text-sm opacity-80 mt-2">It may have ended, or the code is wrong.</p>
        <button className="btn-secondary mt-6" onClick={handleLeaveRoom}>
          ← Back to home
        </button>
      </Centered>
    )
  }

  if (!room) {
    return (
      <Centered>
        <div className="animate-pulse text-vngold font-bold">Loading room…</div>
      </Centered>
    )
  }

  if (room.status === 'lobby') {
    return <Lobby uid={uid} code={roomCode} room={room} onLeave={handleLeaveRoom} />
  }

  return <GameRoot uid={uid} code={roomCode} room={room} onLeave={handleLeaveRoom} />
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center paper-texture">
      <div>{children}</div>
    </div>
  )
}
