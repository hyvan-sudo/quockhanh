import { useEffect, useMemo, useRef, useState } from 'react'
import { GACHA_SLOTS } from '../data/gacha'
import { spinGacha, advanceGachaTurn, currentTurn } from '../lib/gacha'
import type { Room, GachaSpinResult } from '../types'

const SLOT_ANGLE = 360 / GACHA_SLOTS.length
const SLOT_COLORS = ['#C8102E', '#7A0C1E']

export default function GachaScreen({ uid, code, room }: { uid: string; code: string; room: Room }) {
  const gacha = room.gacha
  const players = room.players || {}
  const order = gacha?.order || []
  const entry = gacha ? currentTurn(room) : null
  const finished = !!gacha && gacha.currentIndex >= order.length

  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [modalResult, setModalResult] = useState<GachaSpinResult | null>(null)
  const advancedFor = useRef<string | null>(null)

  const isMyTurn = !!entry && entry.playerId === uid
  const myTotalSpins = order.filter((e) => e.playerId === uid).length

  const spinKey = entry ? `${entry.playerId}_${entry.turnNumber}` : null
  const existingSpin = spinKey ? gacha?.spins?.[spinKey] : undefined

  // When a result exists for the active turn, animate to it (once) then
  // schedule the auto-advance to the next player — any client can do this,
  // it's guarded by a transaction so it only ever runs once.
  useEffect(() => {
    if (!existingSpin || !entry) return
    if (advancedFor.current === spinKey) return

    const result = existingSpin.result
    animateTo(result.slotIndex)
    setSpinning(true)
    const showModalTimer = setTimeout(() => {
      setSpinning(false)
      setModalResult(result)
    }, 3200)

    const elapsed = Date.now() - existingSpin.spinAt
    const remainingBeforeAdvance = Math.max(500, 6500 - elapsed)
    const advanceTimer = setTimeout(() => {
      advancedFor.current = spinKey
      advanceGachaTurn(code, gacha!.currentIndex, order.length)
    }, remainingBeforeAdvance)

    return () => {
      clearTimeout(showModalTimer)
      clearTimeout(advanceTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey, !!existingSpin])

  function animateTo(slotIndex: number) {
    const center = slotIndex * SLOT_ANGLE + SLOT_ANGLE / 2
    const finalMod = (360 - center + 360) % 360
    setRotation((prev) => {
      const extra = (finalMod - (prev % 360) + 360) % 360
      return prev + 360 * 5 + extra
    })
  }

  async function handleSpin() {
    if (!entry || !isMyTurn || existingSpin || spinning) return
    setSpinning(true)
    setModalResult(null)
    await spinGacha(code, uid, entry.turnNumber, players[uid]?.name || 'Player')
    // The useEffect above picks up the written result via the room subscription
    // and drives the actual wheel animation from shared state.
  }

  const wheelBackground = useMemo(() => {
    const stops: string[] = []
    GACHA_SLOTS.forEach((_, i) => {
      const color = SLOT_COLORS[i % 2]
      stops.push(`${color} ${i * SLOT_ANGLE}deg ${(i + 1) * SLOT_ANGLE}deg`)
    })
    return `conic-gradient(${stops.join(',')})`
  }, [])

  if (finished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 paper-texture text-center">
        <p className="text-5xl mb-4">🎉</p>
        <h1 className="text-3xl font-black gold-text mb-2">THAT'S A WRAP!</h1>
        <p className="opacity-80 mb-8">Chúc mừng Quốc Khánh 2/9! 🇻🇳</p>
        <div className="card-shell p-5 w-full max-w-sm text-left">
          <p className="text-xs opacity-70 tracking-widest mb-3 text-center">GACHA RESULTS</p>
          <div className="flex flex-col gap-2">
            {order.map((e, i) => {
              const key = `${e.playerId}_${e.turnNumber}`
              const s = gacha?.spins?.[key]
              return (
                <div key={key + i} className="flex justify-between bg-black/25 rounded-lg px-3 py-2 text-sm">
                  <span className="font-semibold">{players[e.playerId]?.name}</span>
                  <span className={s?.result.isPrize ? 'text-vngold font-bold' : 'opacity-70'}>
                    {s ? `${GACHA_SLOTS[s.result.slotIndex].emoji} ${s.result.isPrize ? s.result.code : 'no prize'}` : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-8 paper-texture">
      <h1 className="text-2xl font-black gold-text mb-1">🇻🇳 GACHA 2/9</h1>
      <p className="text-sm opacity-80 mb-6">
        {entry ? `Congratulations, ${players[entry.playerId]?.name}!` : ''}
      </p>

      {/* Wheel */}
      <div className="relative w-72 h-72 mb-3">
        <div className="absolute left-1/2 -top-2 -translate-x-1/2 z-10 text-3xl drop-shadow-lg">🔻</div>
        <div
          className="w-full h-full rounded-full border-4 border-vngold shadow-2xl relative overflow-hidden"
          style={{
            background: wheelBackground,
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 3.1s cubic-bezier(0.15, 0.85, 0.25, 1)',
          }}
        >
          {GACHA_SLOTS.map((slot, i) => {
            const angle = i * SLOT_ANGLE + SLOT_ANGLE / 2
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 text-lg"
                style={{
                  transform: `rotate(${angle}deg) translate(0, -108px) rotate(${-angle}deg)`,
                  marginLeft: '-10px',
                  marginTop: '-10px',
                }}
              >
                {slot.emoji}
              </div>
            )
          })}
        </div>
        <div className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-vngold border-4 border-vndeepred flex items-center justify-center text-xl font-black text-vndeepred">
          2/9
        </div>
      </div>

      {isMyTurn ? (
        <>
          <p className="text-xs opacity-70 mb-4">
            Your turn: spin {entry!.turnNumber} of {myTotalSpins}
          </p>
          <button className="btn-primary" disabled={spinning || !!existingSpin} onClick={handleSpin}>
            {spinning ? 'SPINNING…' : existingSpin ? 'DONE' : '🎰 SPIN'}
          </button>
        </>
      ) : (
        <p className="text-sm opacity-70 mb-4 animate-pulse">Watching {players[entry?.playerId || '']?.name || '…'} spin…</p>
      )}

      {/* Order list */}
      <div className="card-shell p-4 mt-8 w-full max-w-xs">
        <p className="text-xs tracking-widest opacity-70 mb-2 text-center">GACHA ORDER</p>
        <div className="flex flex-col gap-1 text-sm">
          {order.map((e, i) => {
            const isCurrent = gacha!.currentIndex === i
            const isDone = i < gacha!.currentIndex
            return (
              <div
                key={`${e.playerId}_${e.turnNumber}_${i}`}
                className={`flex justify-between rounded px-2 py-1 ${
                  isCurrent ? 'bg-vngold/25 font-bold' : isDone ? 'opacity-40 line-through' : 'opacity-80'
                }`}
              >
                <span>
                  {isCurrent && '🟢 '}
                  {players[e.playerId]?.name} {myTotalSpinsLabel(e, order)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {modalResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-6">
          <div className="card-shell p-8 text-center max-w-sm w-full animate-popin bg-vndeepred">
            {modalResult.isPrize ? (
              <>
                <p className="text-4xl mb-2">🎉</p>
                <p className="text-xl font-black gold-text mb-1">CHÚC MỪNG!</p>
                <p className="text-lg font-bold mb-4">{modalResult.label}</p>
                <div className="bg-black/30 border border-vngold/40 rounded-lg py-3 px-4">
                  <p className="text-xs opacity-70">MÃ QUÀ / CLAIM CODE</p>
                  <p className="text-xl font-black tracking-widest text-vngold">{modalResult.code}</p>
                </div>
              </>
            ) : (
              <>
                <p className="text-4xl mb-2">{GACHA_SLOTS[modalResult.slotIndex].emoji}</p>
                <p className="text-lg font-bold">{modalResult.label}</p>
              </>
            )}
            <button className="btn-secondary mt-6" onClick={() => setModalResult(null)}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function myTotalSpinsLabel(e: { playerId: string; turnNumber: number }, order: { playerId: string }[]) {
  const total = order.filter((o) => o.playerId === e.playerId).length
  return total > 1 ? `(spin ${e.turnNumber}/${total})` : ''
}
