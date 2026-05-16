import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { OfficeScene } from '../game/scenes/OfficeScene'
import { GAME_CONFIG } from '../game/config'

export function GameCanvas() {
  const ref = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!ref.current || gameRef.current) return
    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: ref.current,
      width: GAME_CONFIG.canvas.width,
      height: GAME_CONFIG.canvas.height,
      backgroundColor: GAME_CONFIG.canvas.background,
      scene: new OfficeScene(),
      scale: { mode: Phaser.Scale.NONE },
      physics: { default: 'arcade', arcade: { debug: false } },
      pixelArt: false,
    })
    return () => { gameRef.current?.destroy(true); gameRef.current = null }
  }, [])

  return <div ref={ref} className="relative" style={{ width: GAME_CONFIG.canvas.width, height: GAME_CONFIG.canvas.height }} />
}
