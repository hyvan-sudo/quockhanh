import {
  ref,
  get,
  set,
  update,
  onValue,
  runTransaction,
  onDisconnect,
  serverTimestamp,
} from 'firebase/database'
import { db } from '../firebase'
import { KEYWORD_PAIRS } from '../data/keywords'
import { QUESTIONS } from '../data/questions'
import type { Phase, Room, RoundResults } from '../types'

export const MAX_PLAYERS = 7
export const MIN_PLAYERS = 3
export const TOTAL_ROUNDS = 5
export const DISCUSSION_SECONDS = 60
export const VOTING_SECONDS = 20

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I ambiguity

function makeRoomCode(): string {
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return out
}

function roomRef(code: string) {
  return ref(db, `rooms/${code}`)
}

export async function createRoom(name: string, uid: string): Promise<string> {
  // Try a few codes in case of collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeRoomCode()
    const snap = await get(roomRef(code))
    if (snap.exists()) continue

    const room: Room = {
      code,
      hostId: uid,
      status: 'lobby',
      createdAt: Date.now(),
      round: 0,
      totalRounds: TOTAL_ROUNDS,
      phase: 'lobby',
      phaseStartedAt: Date.now(),
      players: {
        [uid]: {
          id: uid,
          name: name.trim().slice(0, 20) || 'Player',
          score: 0,
          connected: true,
          isHost: true,
          joinedAt: Date.now(),
        },
      },
    }
    await set(roomRef(code), room)
    attachPresence(code, uid)
    return code
  }
  throw new Error('Could not generate a free room code, please try again.')
}

export async function joinRoom(code: string, name: string, uid: string): Promise<void> {
  const cleanCode = code.trim().toUpperCase()
  const snap = await get(roomRef(cleanCode))
  if (!snap.exists()) throw new Error('Room not found. Check the code and try again.')
  const room = snap.val() as Room
  const players = room.players || {}

  if (players[uid]) {
    // Rejoining (e.g. after refresh) — just mark connected again.
    await update(ref(db, `rooms/${cleanCode}/players/${uid}`), {
      connected: true,
      name: name.trim().slice(0, 20) || players[uid].name,
    })
    attachPresence(cleanCode, uid)
    return
  }

  if (room.status !== 'lobby') {
    throw new Error('This game has already started.')
  }

  const activeCount = Object.values(players).length
  if (activeCount >= MAX_PLAYERS) {
    throw new Error('This room is full (7/7 players).')
  }

  await update(ref(db, `rooms/${cleanCode}/players/${uid}`), {
    id: uid,
    name: name.trim().slice(0, 20) || 'Player',
    score: 0,
    connected: true,
    isHost: false,
    joinedAt: Date.now(),
  })
  attachPresence(cleanCode, uid)
}

function attachPresence(code: string, uid: string) {
  const connRef = ref(db, `rooms/${code}/players/${uid}/connected`)
  onDisconnect(connRef).set(false)
}

export function subscribeRoom(code: string, cb: (room: Room | null) => void) {
  const r = roomRef(code)
  const unsub = onValue(r, (snap) => {
    cb(snap.exists() ? (snap.val() as Room) : null)
  })
  return unsub
}

/** If the current host is disconnected, any connected player may claim host. */
export async function maybeClaimHost(code: string, myUid: string, room: Room) {
  const host = room.players?.[room.hostId]
  if (host && host.connected) return
  const me = room.players?.[myUid]
  if (!me || !me.connected) return
  await runTransaction(ref(db, `rooms/${code}/hostId`), (current) => {
    if (current === room.hostId) return myUid
    return current // someone else already changed it — abort our write
  })
  await update(ref(db, `rooms/${code}/players/${myUid}`), { isHost: true })
}

// ---------- Game flow (host-driven) ----------

function pickRandomInt(n: number) {
  return Math.floor(Math.random() * n)
}

export async function startGame(code: string, room: Room) {
  if (room.status !== 'lobby') return
  await update(roomRef(code), { status: 'playing', round: 0, usedPairIndices: {} })
  await startRound(code, 1, room)
}

export async function startRound(code: string, roundNumber: number, room: Room) {
  const playerIds = Object.keys(room.players || {})
  if (playerIds.length < 2) return

  const used = room.usedPairIndices || {}
  let pairIndex = pickRandomInt(KEYWORD_PAIRS.length)
  let tries = 0
  while (used[pairIndex] && tries < 50) {
    pairIndex = pickRandomInt(KEYWORD_PAIRS.length)
    tries++
  }
  const pair = KEYWORD_PAIRS[pairIndex]
  const impostorId = playerIds[pickRandomInt(playerIds.length)]
  const questionIndex = pickRandomInt(QUESTIONS.length)

  const updates: Record<string, unknown> = {}
  updates[`rooms/${code}/round`] = roundNumber
  updates[`rooms/${code}/phase`] = 'secret'
  updates[`rooms/${code}/phaseStartedAt`] = Date.now()
  updates[`rooms/${code}/usedPairIndices/${pairIndex}`] = true
  // Public round data — deliberately excludes mainWord/impostorWord/impostorId.
  updates[`rooms/${code}/currentRound`] = {
    questionIndex,
    questionText: QUESTIONS[questionIndex],
    answers: {},
    votes: {},
    ready: {},
  }
  // Sensitive round data lives in a SEPARATE top-level branch (/secrets),
  // not nested under /rooms, so the broad "/rooms/$code" read rule can
  // never leak it. /secrets/{code}/round is only readable once the phase
  // reaches "reveal". /secrets/{code}/players/{uid} is only readable by
  // that player (until reveal, when it opens up too).
  updates[`secrets/${code}/round`] = {
    mainWord: pair.main,
    impostorWord: pair.impostor,
    impostorId,
  }
  for (const pid of playerIds) {
    updates[`secrets/${code}/players/${pid}`] = {
      word: pid === impostorId ? pair.impostor : pair.main,
      isImpostor: pid === impostorId,
    }
  }

  await update(ref(db), updates)
}

export async function markReady(code: string, uid: string) {
  await set(ref(db, `rooms/${code}/currentRound/ready/${uid}`), true)
}

/** Called by any client after writing "ready" — advances phase once everyone is ready. */
export async function maybeAdvanceFromSecret(code: string, room: Room) {
  if (room.phase !== 'secret' || !room.currentRound) return
  const ids = Object.keys(room.players || {})
  const ready = room.currentRound.ready || {}
  if (ids.every((id) => ready[id])) {
    await transitionPhase(code, 'secret', 'answering')
  }
}

export async function submitAnswer(code: string, uid: string, text: string) {
  await set(ref(db, `rooms/${code}/currentRound/answers/${uid}`), {
    text: text.trim().slice(0, 100),
    submittedAt: Date.now(),
  })
}

export async function maybeAdvanceFromAnswering(code: string, room: Room) {
  if (room.phase !== 'answering' || !room.currentRound) return
  const ids = Object.keys(room.players || {})
  const answers = room.currentRound.answers || {}
  if (ids.every((id) => answers[id])) {
    await transitionPhase(code, 'answering', 'discussion')
  }
}

export async function forceAdvanceFromAnswering(code: string, room: Room) {
  // timer ran out — fill blanks with "(no answer)" then move on
  if (room.phase !== 'answering' || !room.currentRound) return
  const ids = Object.keys(room.players || {})
  const answers = room.currentRound.answers || {}
  const updates: Record<string, unknown> = {}
  for (const id of ids) {
    if (!answers[id]) {
      updates[`rooms/${code}/currentRound/answers/${id}`] = {
        text: '(no answer)',
        submittedAt: Date.now(),
      }
    }
  }
  if (Object.keys(updates).length) await update(ref(db), updates)
  await transitionPhase(code, 'answering', 'discussion')
}

export async function advanceFromDiscussion(code: string, room: Room) {
  if (room.phase !== 'discussion') return
  await transitionPhase(code, 'discussion', 'voting')
}

export async function submitVote(code: string, uid: string, votedFor: string) {
  if (uid === votedFor) throw new Error('You cannot vote for yourself.')
  await set(ref(db, `rooms/${code}/currentRound/votes/${uid}`), {
    votedFor,
    submittedAt: Date.now(),
  })
}

export async function maybeAdvanceFromVoting(code: string, room: Room) {
  if (room.phase !== 'voting' || !room.currentRound) return
  const ids = Object.keys(room.players || {})
  const votes = room.currentRound.votes || {}
  if (ids.every((id) => votes[id])) {
    await revealAndScore(code, room)
  }
}

export async function forceAdvanceFromVoting(code: string, room: Room) {
  if (room.phase !== 'voting' || !room.currentRound) return
  const ids = Object.keys(room.players || {})
  const votes = room.currentRound.votes || {}
  const updates: Record<string, unknown> = {}
  for (const id of ids) {
    if (!votes[id]) {
      const others = ids.filter((o) => o !== id)
      const randomTarget = others[pickRandomInt(others.length)]
      updates[`rooms/${code}/currentRound/votes/${id}`] = {
        votedFor: randomTarget,
        submittedAt: Date.now(),
      }
    }
  }
  if (Object.keys(updates).length) await update(ref(db), updates)
  const freshSnap = await get(roomRef(code))
  const freshRoom = freshSnap.val() as Room
  await revealAndScore(code, freshRoom)
}

async function revealAndScore(code: string, room: Room) {
  const won = await transitionPhase(code, 'voting', 'reveal')
  if (!won || !room.currentRound) return

  // Only readable now that phase has flipped to "reveal" (see database.rules.json).
  const roundSecretSnap = await get(ref(db, `secrets/${code}/round`))
  const roundSecret = roundSecretSnap.val() as { mainWord: string; impostorWord: string; impostorId: string }
  const impostorId = roundSecret.impostorId
  const mainWord = roundSecret.mainWord
  const impostorWord = roundSecret.impostorWord

  const guessSnap = await get(ref(db, `secrets/${code}/players/${impostorId}/guess`))
  const impostorGuessRaw = (guessSnap.val() as string | null) || ''

  const ids = Object.keys(room.players || {})
  const votes = room.currentRound.votes || {}

  const voteCounts: Record<string, number> = {}
  for (const id of ids) voteCounts[id] = 0
  for (const v of Object.values(votes)) {
    voteCounts[v.votedFor] = (voteCounts[v.votedFor] || 0) + 1
  }
  let mostVotedId: string | null = null
  let maxVotes = -1
  for (const id of ids) {
    if (voteCounts[id] > maxVotes) {
      maxVotes = voteCounts[id]
      mostVotedId = id
    }
  }
  const impostorCaught = mostVotedId === impostorId

  const impostorGuess = impostorGuessRaw.trim().toUpperCase()
  const impostorGuessedMain = impostorGuess.length > 0 && impostorGuess === mainWord.toUpperCase()

  const deltas: Record<string, number> = {}
  for (const id of ids) deltas[id] = 0

  if (impostorCaught) {
    for (const [voterId, v] of Object.entries(votes)) {
      if (v.votedFor === impostorId) deltas[voterId] = (deltas[voterId] || 0) + 100
    }
    deltas[impostorId] = (deltas[impostorId] || 0) + 50
  } else {
    deltas[impostorId] = (deltas[impostorId] || 0) + 150
  }
  if (impostorGuessedMain) {
    deltas[impostorId] = (deltas[impostorId] || 0) + 100
  }

  const results: RoundResults = {
    voteCounts,
    mostVotedId,
    impostorId,
    impostorCaught,
    mainWord,
    impostorWord,
    impostorGuessedMain,
    deltas,
  }

  const updates: Record<string, unknown> = {}
  updates[`rooms/${code}/currentRound/results`] = results
  for (const id of ids) {
    updates[`rooms/${code}/players/${id}/score`] = (room.players[id]?.score || 0) + deltas[id]
  }
  await update(ref(db), updates)
}

export async function submitImpostorGuess(code: string, uid: string, guess: string) {
  // Stored in /secrets so other players can't peek at it before reveal.
  await set(ref(db, `secrets/${code}/players/${uid}/guess`), guess.trim().slice(0, 40))
}

export async function proceedAfterReveal(code: string, room: Room) {
  if (room.phase !== 'reveal') return
  const nextRound = (room.round || 1) + 1
  if (nextRound > TOTAL_ROUNDS) {
    await finishGame(code, room)
  } else {
    const won = await transitionPhase(code, 'reveal', 'scoreupdate')
    if (won) {
      setTimeout(() => {
        get(roomRef(code)).then((snap) => {
          const fresh = snap.val() as Room
          if (fresh && fresh.phase === 'scoreupdate') {
            startRound(code, nextRound, fresh)
          }
        })
      }, 2500)
    }
  }
}

async function finishGame(code: string, room: Room) {
  const ids = Object.keys(room.players || {})
  const sorted = [...ids].sort((a, b) => (room.players[b].score || 0) - (room.players[a].score || 0))
  const finalRanking = sorted.map((id, idx) => ({
    playerId: id,
    score: room.players[id].score || 0,
    rank: idx + 1,
  }))

  const order: { playerId: string; turnNumber: number }[] = []
  sorted.forEach((id, idx) => {
    order.push({ playerId: id, turnNumber: 1 })
    if (idx === 0) order.push({ playerId: id, turnNumber: 2 }) // winner gets +1 extra spin
  })

  const updates: Record<string, unknown> = {}
  updates[`rooms/${code}/status`] = 'finished'
  updates[`rooms/${code}/phase`] = 'final'
  updates[`rooms/${code}/phaseStartedAt`] = Date.now()
  updates[`rooms/${code}/finalRanking`] = finalRanking
  updates[`rooms/${code}/gacha`] = {
    order,
    currentIndex: 0,
    status: 'pending',
    spins: {},
  }
  await update(ref(db), updates)
}

export async function goToGacha(code: string) {
  await set(ref(db, `rooms/${code}/phase`), 'gacha')
}

/**
 * Generic one-time phase transition guarded by a transaction so that even
 * if multiple clients race, the phase only changes once.
 */
async function transitionPhase(code: string, from: Phase, to: Phase): Promise<boolean> {
  const phaseRef = ref(db, `rooms/${code}/phase`)
  const result = await runTransaction(phaseRef, (current) => {
    if (current === from) return to
    return undefined // abort — someone already transitioned, or unexpected state
  })
  if (result.committed) {
    await update(ref(db, `rooms/${code}`), { phaseStartedAt: serverTimestamp() as unknown as number })
  }
  return result.committed
}
