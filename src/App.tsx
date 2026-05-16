import { ActionBar } from './components/ActionBar'
import { GameCanvas } from './components/GameCanvas'
import { HUD } from './components/HUD'
import { ModalLayer } from './components/ModalLayer'

function App() {
  return (
    <main className="relative min-h-svh overflow-hidden bg-[#111827] text-slate-100">
      <div className="game-shell">
        <div className="game-stage">
          <GameCanvas />
          <HUD />
          <ActionBar />
          <ModalLayer />
        </div>
      </div>
    </main>
  )
}

export default App
