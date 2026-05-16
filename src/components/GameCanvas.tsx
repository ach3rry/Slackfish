import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { GAME_CONFIG } from '../game/config'
import { OfficeScene } from '../game/scenes/OfficeScene'

export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!hostRef.current || gameRef.current) {
      return
    }

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      width: GAME_CONFIG.canvas.width,
      height: GAME_CONFIG.canvas.height,
      backgroundColor: GAME_CONFIG.canvas.background,
      scene: [OfficeScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias: true,
        pixelArt: false,
      },
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return <div ref={hostRef} className="h-full w-full overflow-hidden rounded-[8px]" />
}
