import Phaser from 'phaser'
import { GameScene } from './GameScene'

let gameInstance: Phaser.Game | null = null

export function createGame(parentId: string): Phaser.Game {
  if (gameInstance) {
    gameInstance.destroy(true)
  }

  const scene = new GameScene()

  gameInstance = new Phaser.Game({
    type: Phaser.AUTO,
    parent: parentId,
    width: 960,
    height: 640,
    backgroundColor: '#1a1a2e',
    scene: scene,
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.EXACT_FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 960,
      height: 640,
    },
    pixelArt: false,
    antialias: true,
  })

  return gameInstance
}

export function getGameScene(): GameScene | null {
  if (!gameInstance) return null
  return gameInstance.scene.getScene('GameScene') as GameScene
}

export function destroyGame() {
  if (gameInstance) {
    gameInstance.destroy(true)
    gameInstance = null
  }
}
