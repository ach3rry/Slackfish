import { useGameStore } from './store/gameStore'
import { GameCanvas } from './components/GameCanvas'
import { HUD } from './components/HUD'
import { ActionBar } from './components/ActionBar'
import { ModalLayer } from './components/ModalLayer'

export default function App() {
  const phase = useGameStore((s) => s.phase)

  return (
    <div className="relative w-screen h-screen bg-[#0f1117] overflow-hidden flex items-center justify-center">
      {phase !== 'start' && (
        <div className="relative" style={{ width: 1080, height: 760 }}>
          <GameCanvas />
          <HUD />
          <ActionBar />
        </div>
      )}
      <ModalLayer />
    </div>
  )
}
