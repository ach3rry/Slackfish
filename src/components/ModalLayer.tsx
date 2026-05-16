import { GAME_CONFIG } from '../game/config'
import { gameBus } from '../game/gameBus'
import { useGameStore } from '../store/gameStore'
import { GuideModal } from './GuideModal'
import { Leaderboard } from './Leaderboard'
import { StartScreen } from './StartScreen'

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

export function ModalLayer() {
  const phase = useGameStore((state) => state.phase)
  const salary = useGameStore((state) => state.salary)
  const fish = useGameStore((state) => state.fish)
  const elapsedSeconds = useGameStore((state) => state.elapsedSeconds)
  const catchNotice = useGameStore((state) => state.catchNotice)
  const finalTitle = useGameStore((state) => state.finalTitle)
  const guideOpen = useGameStore((state) => state.guideOpen)
  const restartGame = useGameStore((state) => state.restartGame)

  const handleRestart = () => {
    restartGame()
    gameBus.restart()
  }

  return (
    <>
      {phase === 'start' ? <StartScreen /> : null}
      {guideOpen && phase === 'playing' ? <GuideModal /> : null}

      {catchNotice ? (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <section className="catch-pop">
            <p className="text-sm font-black text-rose-200">{catchNotice.title}</p>
            <h2 className="mt-1 text-4xl font-black text-rose-100">-{catchNotice.amount} 工资</h2>
            <p className="mt-3 text-base text-slate-100">{catchNotice.message}</p>
          </section>
        </div>
      ) : null}

      {phase === 'won' ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/76 p-6 backdrop-blur-sm">
          <section className="modal-panel grid max-w-[860px] grid-cols-[1fr_320px] gap-6 max-md:grid-cols-1">
            <div>
              <p className="text-sm font-black text-emerald-200">达标通关</p>
              <h2 className="mt-2 text-5xl font-black text-amber-100">{finalTitle || '摸鱼熟练工'}</h2>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div className="result-stat">
                  <span>用时</span>
                  <strong>{formatTime(elapsedSeconds)}</strong>
                </div>
                <div className="result-stat">
                  <span>剩余工资</span>
                  <strong>{Math.round(salary)}</strong>
                </div>
                <div className="result-stat">
                  <span>摸鱼收益</span>
                  <strong>{Math.round(fish)} / {GAME_CONFIG.economy.targetFish}</strong>
                </div>
              </div>
              <button className="start-button mt-7 w-full justify-center" onClick={handleRestart} type="button">
                重新开始
              </button>
            </div>
            <Leaderboard />
          </section>
        </div>
      ) : null}

      {phase === 'lost' ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-sm">
          <section className="modal-panel max-w-[560px] text-center">
            <p className="text-sm font-black text-rose-200">游戏失败</p>
            <h2 className="mt-2 text-5xl font-black text-rose-100">工资被扣光，惨遭辞退</h2>
            <p className="mt-5 text-slate-300">摸鱼收益停在 {Math.floor(fish)}，下次记得把卫生间当安全屋。</p>
            <button className="start-button mt-7 w-full justify-center" onClick={handleRestart} type="button">
              重新开始
            </button>
          </section>
        </div>
      ) : null}
    </>
  )
}
