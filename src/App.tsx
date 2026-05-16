import { useEffect, useState } from 'react'
import { useGameStore } from './store/gameStore'
import { GameCanvas } from './components/GameCanvas'
import { OfficeScene3D } from './3d/OfficeScene3D'
import { HUD } from './components/HUD'
import { ActionBar } from './components/ActionBar'
import { ModalLayer } from './components/ModalLayer'
import { GAME_SIZE, LAYERS } from './data/mobileLevelLayout'

const getStageScale = () => Math.min(window.innerWidth / GAME_SIZE.width, window.innerHeight / GAME_SIZE.height)

export default function App() {
  const phase = useGameStore((s) => s.phase)
  const [mode, setMode] = useState<'2d' | '3d'>('2d')
  const [scale, setScale] = useState(getStageScale)

  useEffect(() => {
    const onResize = () => setScale(getStageScale())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#070b12]">
      <div
        className="absolute left-1/2 top-1/2 overflow-hidden bg-[#0f1117]"
        style={{
          width: GAME_SIZE.width,
          height: GAME_SIZE.height,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center',
        }}
      >
        {phase !== 'start' && (
          <>
            <div className="absolute left-0" style={{ top: LAYERS.map.y, width: LAYERS.map.width, height: LAYERS.map.height }}>
              {mode === '2d' ? <GameCanvas /> : <OfficeScene3D />}
            </div>
            <HUD />
            <ActionBar />
            <button
              onClick={() => setMode(mode === '2d' ? '3d' : '2d')}
              className="absolute z-40 bg-contain bg-center bg-no-repeat text-[0px] active:scale-95"
              style={{
                top: 48,
                right: 18,
                width: 72,
                height: 72,
                backgroundImage: 'url(/ui2d/nav-settings.png)',
                filter: mode === '3d' ? 'drop-shadow(0 0 10px #58a6ff)' : undefined,
              }}
              title={mode === '2d' ? '切换 3D' : '切换 2D'}
              aria-label={mode === '2d' ? '切换 3D' : '切换 2D'}
            >
              ◈
            </button>
          </>
        )}
        <ModalLayer />
      </div>
    </div>
  )
}
