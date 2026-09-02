import { ref, runTransaction } from 'firebase/database'
import { db } from '../firebase'
import { GACHA_SLOTS } from '../data/gacha'
import type { GachaSpinResult, Room } from '../types'

function randomVoucherCode(name: string) {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  const safeName = (name || 'PLAYER').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'PLAYER'
  return `29-${safeName}-${rand}`
}

export function currentTurn(room: Room) {
  const gacha = room.gacha
  if (!gacha) return null
  if (gacha.currentIndex >= gacha.order.length) return null
  return gacha.order[gacha.currentIndex]
}

/**
 * Spins for the current player's turn. Transaction-guarded on the specific
 * spin key so a duplicate click / two tabs can never produce two results,
 * and refreshing never grants an extra spin.
 */
export async function spinGacha(code: string, uid: string, turnNumber: number, name: string): Promise<GachaSpinResult> {
  const key = `${uid}_${turnNumber}`
  const spinRef = ref(db, `rooms/${code}/gacha/spins/${key}`)

  const slotIndex = Math.floor(Math.random() * GACHA_SLOTS.length)
  const slot = GACHA_SLOTS[slotIndex]
  const result: GachaSpinResult = {
    slotIndex,
    label: slot.label,
    isPrize: slot.isPrize,
    ...(slot.isPrize ? { code: randomVoucherCode(name) } : {}),
  }

  const tx = await runTransaction(spinRef, (current) => {
    if (current) return undefined // already spun — abort, keep existing result
    return { playerId: uid, turnNumber, result, spinAt: Date.now() }
  })

  if (!tx.committed) {
    // Someone (this player, another tab) already recorded a result — use it.
    const existing = tx.snapshot.val()
    return existing.result as GachaSpinResult
  }
  return result
}

/** Advances to the next entry in the gacha order. Safe against double-advance races. */
export async function advanceGachaTurn(code: string, expectedIndex: number, orderLength: number) {
  const idxRef = ref(db, `rooms/${code}/gacha/currentIndex`)
  await runTransaction(idxRef, (current) => {
    if (current !== expectedIndex) return undefined
    return current + 1
  })
  if (expectedIndex + 1 >= orderLength) {
    const statusRef = ref(db, `rooms/${code}/gacha/status`)
    await runTransaction(statusRef, () => 'done')
  }
}
