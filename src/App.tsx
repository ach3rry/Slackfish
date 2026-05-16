import { useState } from 'react'
import { useGameStore } from './store/gameStore'
import { GameCanvas } from './components/GameCanvas'
import { OfficeScene3D } from './3d/OfficeScene3D'
import { HUD } from './components/HUD'
import { ActionBar } from './components/ActionBar'
import { ModalLayer } from './components/ModalLayer'

export default function App() {
  const phase = useGameStore((s) => s.phase)
  const [mode, setMode] = useState<'2d' | '3d'>('2d')

  return (
    <div className="relative w-screen h-screen bg-[#0f1117] overflow-hidden flex items-center justify-center">
      {phase !== 'start' && (
        <div className="relative" style={{ width: 1080, height: 760 }}>
          {mode === '2d' ? <GameCanvas /> : <OfficeScene3D />}
          <HUD />
          <ActionBar />
          {/* 2D/3D 切换按钮 */}
          <button
            onClick={() => setMode(mode === '2d' ? '3d' : '2d')}
            className="absolute top-2 right-2 z-40 px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer transition-all active:scale-95"
            style={{
              background: 'rgba(13,17,23,0.85)',
              borderColor: mode === '3d' ? '#58a6ff' : '#30363d',
              color: mode === '3d' ? '#58a6ff' : '#8b949e',
              backdropFilter: 'blur(4px)',
            }}
          >
            {mode === '2d' ? '🔲 切换3D' : '🔲 切换2D'}
          </button>
        </div>
      )}
      <ModalLayer />
    </div>
  )
}
