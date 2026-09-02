export type Phase =
  | 'lobby'
  | 'secret'
  | 'answering'
  | 'discussion'
  | 'voting'
  | 'reveal'
  | 'scoreupdate'
  | 'final'
  | 'gacha'

export interface Player {
  id: string
  name: string
  score: number
  connected: boolean
  isHost: boolean
  joinedAt: number
}

export interface AnswerEntry {
  text: string
  submittedAt: number
}

export interface VoteEntry {
  votedFor: string
  submittedAt: number
}

export interface RoundResults {
  voteCounts: Record<string, number>
  mostVotedId: string | null
  impostorId: string
  impostorCaught: boolean
  mainWord: string
  impostorWord: string
  impostorGuessedMain: boolean
  deltas: Record<string, number>
}

export interface CurrentRound {
  // NOTE: mainWord / impostorWord / impostorId are intentionally NOT here.
  // They live under /secrets/{code}/round, a separate DB branch with rules
  // that only allow reading them once the phase reaches "reveal" or later.
  questionIndex: number
  questionText: string
  answers: Record<string, AnswerEntry>
  votes: Record<string, VoteEntry>
  ready: Record<string, boolean>
  results?: RoundResults
}

export interface PlayerSecret {
  word: string
  isImpostor: boolean
  guess?: string
}

export interface GachaSpinResult {
  slotIndex: number
  label: string
  isPrize: boolean
  code?: string
}

export interface GachaSpin {
  playerId: string
  turnNumber: number
  result: GachaSpinResult
  spinAt: number
}

export interface GachaTurnOrderEntry {
  playerId: string
  turnNumber: number
}

export interface GachaState {
  order: GachaTurnOrderEntry[]
  currentIndex: number
  status: 'pending' | 'spinning' | 'done'
  spins: Record<string, GachaSpin>
}

export interface RankingEntry {
  playerId: string
  score: number
  rank: number
}

export interface Room {
  code: string
  hostId: string
  status: 'lobby' | 'playing' | 'finished'
  createdAt: number
  round: number
  totalRounds: number
  phase: Phase
  phaseStartedAt: number
  usedPairIndices?: Record<number, boolean>
  players: Record<string, Player>
  currentRound?: CurrentRound
  finalRanking?: RankingEntry[]
  gacha?: GachaState
}
