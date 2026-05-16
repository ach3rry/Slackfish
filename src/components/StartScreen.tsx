import { GAME_CONFIG } from '../game/config'
import { gameBus } from '../game/gameBus'
import { useGameStore } from '../store/gameStore'
import { Leaderboard } from './Leaderboard'

export function StartScreen() {
  const startGame = useGameStore((state) => state.startGame)

  const handleStart = () => {
    const shouldShowGuide = window.localStorage.getItem(GAME_CONFIG.timing.guideStorageKey) !== '1'
    startGame()
    if (!shouldShowGuide) {
      gameBus.start()
    }
  }

  return (
    <div className="absolute inset-0 z-50 grid grid-cols-[1fr_360px] overflow-hidden bg-slate-950/96 text-left backdrop-blur-sm max-lg:grid-cols-1">
      <main className="relative flex min-h-0 flex-col justify-center px-12 py-10 max-md:px-6">
        <div className="start-map-glow" />
        <p className="mb-4 text-lg font-black text-cyan-200">办公室潜行摸鱼小游戏</p>
        <h1 className="title-text mb-4 text-7xl font-black leading-tight text-amber-100 max-md:text-5xl">
          《工位摸鱼：伪装局》
        </h1>
        <p className="max-w-[720px] text-2xl font-bold text-slate-100 max-md:text-xl">
          在老板眼皮底下，快乐摸鱼！
        </p>
        <p className="mt-5 max-w-[650px] text-base leading-8 text-slate-300">
          点击地图或底部区域按钮移动，按所在区域切换行为。茶水间收益高但危险，卫生间是绝对安全区；
          工资清零会被辞退，摸鱼收益达到 100 就能通关。
        </p>
        <button className="start-button mt-9 w-fit" onClick={handleStart} type="button">
          开始摸鱼
        </button>
      </main>
      <aside className="border-l border-cyan-200/20 bg-slate-900/70 p-6 max-lg:hidden">
        <Leaderboard />
      </aside>
    </div>
  )
}
