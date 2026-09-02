import type { Player } from '../types'

export default function PlayerBadge({
  player,
  right,
  highlight,
}: {
  player: Player
  right?: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2 ${
        highlight ? 'bg-vngold/20 border border-vngold/50' : 'bg-black/25'
      }`}
    >
      <span className="flex items-center gap-2 font-semibold">
        <span
          className={`w-2 h-2 rounded-full ${player.connected ? 'bg-green-400' : 'bg-red-400'}`}
        />
        {player.name}
      </span>
      {right}
    </div>
  )
}
