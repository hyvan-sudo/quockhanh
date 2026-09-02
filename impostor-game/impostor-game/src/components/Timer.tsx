import { useEffect, useState } from 'react'

export default function Timer({
  startedAt,
  seconds,
  onExpire,
}: {
  startedAt: number
  seconds: number
  onExpire?: () => void
}) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000
      const left = Math.max(0, Math.ceil(seconds - elapsed))
      setRemaining(left)
      if (left <= 0 && onExpire) onExpire()
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, seconds])

  const pct = Math.max(0, Math.min(100, (remaining / seconds) * 100))
  const urgent = remaining <= 5

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs opacity-70 mb-1">
        <span>⏱ Time left</span>
        <span className={urgent ? 'text-red-300 font-bold' : ''}>{remaining}s</span>
      </div>
      <div className="h-2 rounded-full bg-black/30 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${urgent ? 'bg-red-400' : 'bg-vngold'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
