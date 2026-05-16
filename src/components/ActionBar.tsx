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

  const zones = level1Config.zones.filter(z => z.playerCanEnter)
  const availableActions = level1Config.actions.filter(a => a.availableIn.includes(playerZone))

  const handleZoneClick = (zoneId: Zone) => {
    const scene = getGameScene()
    if (scene) scene.movePlayerToZone(zoneId)
  }

  const handleActionClick = (actionId: PlayerAction) => {
    const scene = getGameScene()
    if (scene) scene.setPlayerAction(actionId)
  }

  const riskStyle: Record<string, { bg: string; border: string; label: string }> = {
    none: { bg: 'rgba(63, 185, 80, 0.08)', border: '#238636', label: '' },
    veryLow: { bg: 'rgba(63, 185, 80, 0.08)', border: '#2ea043', label: '🟢' },
    low: { bg: 'rgba(210, 153, 34, 0.08)', border: '#d29922', label: '🟡' },
    medium: { bg: 'rgba(240, 136, 62, 0.08)', border: '#f0883e', label: '🔶' },
    high: { bg: 'rgba(248, 81, 73, 0.08)', border: '#da3633', label: '⚠️' },
    veryHigh: { bg: 'rgba(248, 81, 73, 0.12)', border: '#f85149', label: '🔴' },
  }

  const zoneIcons: Record<string, string> = {
    workstation: '🏢',
    breakroom: '☕',
    restroom: '🚻',
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30">
      <div className="px-2 pt-2 pb-2"
        style={{ background: 'rgba(13, 17, 23, 0.95)', borderTop: '1px solid #30363d', backdropFilter: 'blur(8px)' }}>

        {/* 区域按钮 */}
        <div className="flex gap-1.5 mb-1.5">
          <span className="text-[10px] text-gray-500 self-center mr-0.5 w-8 shrink-0">区域</span>
          {zones.map(zone => {
            const isActive = playerZone === zone.id
            return (
              <button
                key={zone.id}
                onClick={() => handleZoneClick(zone.id)}
                disabled={playerStunned}
                className="relative flex-1 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer"
                style={{
                  background: isActive ? `rgba(${zone.id === 'workstation' ? '63,185,80' : zone.id === 'breakroom' ? '210,153,34' : '88,166,255'}, 0.15)` : 'rgba(33, 38, 45, 0.8)',
                  border: `1.5px solid ${isActive ? `#${zone.borderColor.toString(16).padStart(6, '0')}` : '#30363d'}`,
                  color: isActive ? '#e6edf3' : '#8b949e',
                  boxShadow: isActive ? `0 0 12px rgba(${zone.id === 'workstation' ? '63,185,80' : zone.id === 'breakroom' ? '210,153,34' : '88,166,255'}, 0.2)` : 'none',
                  opacity: playerStunned ? 0.4 : 1,
                }}>
                <span className="mr-0.5">{zoneIcons[zone.id]}</span>
                {zone.label}
                {zone.safeZone && <span className="absolute -top-1 -right-1 text-[10px]">🛡️</span>}
              </button>
            )
          })}
        </div>

        {/* 行为按钮 */}
        <div className="flex gap-1 flex-wrap">
          <span className="text-[10px] text-gray-500 self-center mr-0.5 w-8 shrink-0">行为</span>
          {availableActions.map(action => {
            const isActive = playerAction === action.id
            const isDisabled = playerStunned || playerAction === 'moving'
            const rs = riskStyle[action.riskLevel]

            return (
              <button
                key={action.id}
                onClick={() => handleActionClick(action.id)}
                disabled={isDisabled}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-150 flex items-center gap-0.5 cursor-pointer"
                style={{
                  background: isActive ? 'rgba(31, 111, 235, 0.2)' : rs.bg,
                  border: `1.5px solid ${isActive ? '#58a6ff' : rs.border}`,
                  color: isActive ? '#e6edf3' : '#c9d1d9',
                  boxShadow: isActive ? '0 0 10px rgba(88, 166, 255, 0.2)' : 'none',
                  opacity: isDisabled ? 0.35 : 1,
                }}>
                <span className="text-sm">{action.emoji}</span>
                <span>{action.label}</span>
                {action.slackingPerSec > 0 && (
                  <span className="text-yellow-400/70 text-[10px] ml-0.5">+{action.slackingPerSec}</span>
                )}
                {action.salaryPerSec > 0 && (
                  <span className="text-green-400/70 text-[10px] ml-0.5">💰+{action.salaryPerSec}</span>
                )}
                {rs.label && <span className="text-[10px]">{rs.label}</span>}
                {action.id === 'fakeWorking' && isActive && (
                  <span className="text-orange-400 text-[10px] animate-pulse ml-0.5">伪装中</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
