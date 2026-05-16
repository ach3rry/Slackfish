import { useEffect, useRef } from 'react'
import { useGameStore } from './store/gameStore'
import { createGame, getGameScene, destroyGame } from './game/createGame'
import { StartPage } from './components/StartPage'
import { HUD } from './components/HUD'
import { ActionBar } from './components/ActionBar'
import { CaughtPopup, WinPopup, LosePopup } from './components/Popups'

export default function App() {
  const phase = useGameStore((s) => s.phase)
  const gameCreatedRef = useRef(false)

  useEffect(() => {
    if (phase === 'playing' && !gameCreatedRef.current) {
      gameCreatedRef.current = true
      // 延迟一帧确保 DOM 已渲染
      requestAnimationFrame(() => {
        createGame('game-container')
        const checkScene = setInterval(() => {
          const scene = getGameScene()
          if (scene) clearInterval(checkScene)
        }, 100)
      })
    }

    if (phase === 'menu') {
      gameCreatedRef.current = false
      destroyGame()
    }
  }, [phase])

  if (phase === 'menu') {
    return <StartPage />
  }

  return (
    <div className="relative w-screen h-screen bg-[#0f0f23] overflow-hidden flex items-center justify-center">
      {/* 游戏 wrapper：960x640 区域，相对定位用于 HUD 叠加 */}
      <div className="relative" style={{ width: 960, height: 640 }}>
        {/* Phaser 画布 */}
        <div id="game-container" className="absolute inset-0" />

        {/* HUD 叠加层 */}
        <HUD />
        <ActionBar />
        <CaughtPopup />
      </div>

      {/* 全屏弹窗 */}
      {phase === 'won' && <WinPopup />}
      {phase === 'lost' && <LosePopup />}
    </div>
  )
}
