import { useGameStore } from '../store/gameStore'
import { level1Config } from '../data/level1'
import type { PlayerAction, Zone } from '../types/game'
import { getGameScene } from '../game/createGame'

export function ActionBar() {
  const playerZone = useGameStore((s) => s.playerZone)
  const playerAction = useGameStore((s) => s.playerAction)
  const playerStunned = useGameStore((s) => s.playerStunned)
  const phase = useGameStore((s) => s.phase)

  if (phase !== 'playing') return null

  // 可用区域
  const zones = level1Config.zones.filter(z => z.playerCanEnter)

  // 当前区域可用行为
  const availableActions = level1Config.actions.filter(
    a => a.availableIn.includes(playerZone)
  )

  const handleZoneClick = (zoneId: Zone) => {
    const scene = getGameScene()
    if (scene) {
      scene.movePlayerToZone(zoneId)
    }
  }

  const handleActionClick = (actionId: PlayerAction) => {
    const scene = getGameScene()
    if (scene) {
      scene.setPlayerAction(actionId)
    }
  }

  const riskColors: Record<string, string> = {
    none: 'text-green-400',
    veryLow: 'text-green-300',
    low: 'text-yellow-300',
    medium: 'text-orange-400',
    high: 'text-red-400',
    veryHigh: 'text-red-500',
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30">
      <div className="bg-black/85 backdrop-blur-sm border-t border-white/10 px-3 py-2">
        {/* 区域按钮 */}
        <div className="flex gap-2 mb-2">
          <span className="text-xs text-gray-500 self-center mr-1">区域:</span>
          {zones.map(zone => (
            <button
              key={zone.id}
              onClick={() => handleZoneClick(zone.id)}
              disabled={playerStunned}
              className={`
                px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-150
                border-2
                ${playerZone === zone.id
                  ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300 shadow-lg shadow-yellow-500/20'
                  : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-400 hover:bg-gray-700/50'
                }
                ${playerStunned ? 'opacity-40 cursor-not-allowed' : 'active:scale-95 cursor-pointer'}
                ${zone.safeZone ? 'relative' : ''}
              `}
            >
              {zone.safeZone && <span className="absolute -top-1 -right-1 text-xs">🛡️</span>}
              {zone.label}
            </button>
          ))}
        </div>

        {/* 行为按钮 */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-gray-500 self-center mr-1">行为:</span>
          {availableActions.map(action => {
            const isActive = playerAction === action.id
            const isDisabled = playerStunned || playerAction === 'moving'

            return (
              <button
                key={action.id}
                onClick={() => handleActionClick(action.id)}
                disabled={isDisabled}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150
                  border-2 flex items-center gap-1
                  ${isActive
                    ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300 shadow-lg shadow-cyan-500/20'
                    : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-400 hover:bg-gray-700/50'
                  }
                  ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95 cursor-pointer'}
                `}
              >
                <span className="text-base">{action.emoji}</span>
                <span>{action.label}</span>
                {action.slackingPerSec > 0 && (
                  <span className="text-yellow-400/80 ml-1">+{action.slackingPerSec}/s</span>
                )}
                {action.salaryPerSec > 0 && (
                  <span className="text-green-400/80 ml-1">+{action.salaryPerSec}💰</span>
                )}
                {action.riskLevel !== 'none' && action.id !== 'idle' && (
                  <span className={`ml-1 ${riskColors[action.riskLevel]}`}>
                    {action.riskLevel === 'veryHigh' ? '⚠️' :
                     action.riskLevel === 'high' ? '⚠️' :
                     action.riskLevel === 'medium' ? '🔶' :
                     action.riskLevel === 'low' ? '🟡' : '🟢'}
                  </span>
                )}
                {action.id === 'fakeWorking' && isActive && (
                  <span className="text-orange-400 text-xs animate-pulse">伪装中</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
