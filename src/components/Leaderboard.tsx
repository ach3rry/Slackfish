import { useGameStore } from '../store/gameStore'

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

export function Leaderboard() {
  const leaderboard = useGameStore((state) => state.leaderboard)

  return (
    <section className="leaderboard">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="hud-title">最近通关</h2>
        <span className="text-xs text-slate-400">localStorage</span>
      </div>
      {leaderboard.length === 0 ? (
        <p className="rounded-md border border-slate-500/30 bg-slate-950/55 px-3 py-3 text-sm text-slate-300">
          还没有通关记录，第一条等你写上去。
        </p>
      ) : (
        <ol className="space-y-2">
          {leaderboard.map((entry, index) => (
            <li key={entry.id} className="leaderboard-row">
              <span className="rank-badge">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-left font-black text-amber-100">{entry.title}</span>
              <span>{formatTime(entry.elapsedSeconds)}</span>
              <span>🪙 {entry.salary}</span>
              <span>🐟 {entry.fish}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
