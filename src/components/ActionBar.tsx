import { useEffect, useMemo, useState } from 'react'
import { ACTION_BUTTONS, BOTTOM_NAV_BUTTONS, LAYERS, ZONE_TAB_BUTTONS } from '../data/mobileLevelLayout'
import { gameBus } from '../game/gameBus'
import { useGameStore } from '../store/gameStore'
import type { AreaId } from '../types/game'

const actionImage: Record<string, string> = {
  working: '/ui2d/action-working-live.png',
  watching: '/ui2d/action-watching-live.png',
  chips: '/ui2d/action-chips-live.png',
  milkTea: '/ui2d/action-milk-tea-live.png',
  fakeWorking: '/ui2d/action-fake-working-live.png',
  phone: '/ui2d/action-phone-live.png',
}

const zoneImage: Record<AreaId, string> = {
  workstation: '/ui2d/zone-workstation-live.png',
  pantry: '/ui2d/zone-pantry-live.png',
  restroom: '/ui2d/zone-restroom-live.png',
  bossOffice: '/ui2d/zone-workstation-live.png',
  corridor: '/ui2d/zone-workstation-live.png',
}

const zoneInactiveImage: Record<AreaId, string> = {
  workstation: '/ui2d/zone-workstation.png',
  pantry: '/ui2d/zone-pantry.png',
  restroom: '/ui2d/zone-restroom.png',
  bossOffice: '/ui2d/zone-workstation.png',
  corridor: '/ui2d/zone-workstation.png',
}

const rectStyle = (rect: { x: number; y: number; width: number; height: number; zIndex?: number }) => ({
  left: rect.x,
  top: rect.y,
  width: rect.width,
  height: rect.height,
  zIndex: rect.zIndex,
})

export function ActionBar() {
  const [clock, setClock] = useState(() => performance.now())
  const phase = useGameStore((s) => s.phase)
  const currentArea = useGameStore((s) => s.currentArea)
  const currentAction = useGameStore((s) => s.currentAction)
  const bossStatus = useGameStore((s) => s.bossStatus)
  const threatText = useGameStore((s) => s.threatText)
  const subPage = useGameStore((s) => s.subPage)
  const setSubPage = useGameStore((s) => s.setSubPage)
  const cooldownUntil = useGameStore((s) => s.cooldownUntil)
  const stunnedUntil = useGameStore((s) => s.stunnedUntil)

  useEffect(() => { const iv = setInterval(() => setClock(performance.now()), 100); return () => clearInterval(iv) }, [])

  const stunnedRemaining = Math.max(0, stunnedUntil - clock)
  const locked = phase !== 'playing' || stunnedRemaining > 0

  const lockText = useMemo(() => {
    if (stunnedRemaining > 0) return `僵直 ${(stunnedRemaining / 1000).toFixed(1)}s`
    if (currentAction === 'moving') return '移动中'
    return '可行动'
  }, [currentAction, stunnedRemaining])

  return (
    <>
      <div className="absolute z-30 text-lg font-black text-cyan-100" style={{ left: 28, top: 1430 }}>{lockText}</div>
      {(threatText.includes('暴露') || threatText.includes('注意') || threatText.includes('危险')) ? (
        <div
          className="pointer-events-none absolute z-40 bg-contain bg-center bg-no-repeat"
          style={{ left: 188, top: 1232, width: 340, height: 200, backgroundImage: 'url(/ui2d/warning-high-risk-live.png)' }}
        />
      ) : null}

      {/* 区域切换按钮：当前区域亮，其他暗但不灰 */}
      <section className="absolute z-30" style={rectStyle(LAYERS.zoneTabs)}>
        {ZONE_TAB_BUTTONS.map((button) => {
          const active = currentArea === button.id
          return (
            <button
              key={button.id}
              disabled={locked}
              onClick={() => gameBus.moveToArea(button.id)}
              type="button"
              className={`absolute bg-contain bg-center bg-no-repeat transition-all duration-150 ${locked ? 'opacity-50' : 'active:scale-95'}`}
              style={{
                left: button.x - LAYERS.zoneTabs.x,
                top: button.y - LAYERS.zoneTabs.y,
                width: button.width,
                height: button.height,
                backgroundImage: `url(${active ? zoneImage[button.id] : zoneInactiveImage[button.id]})`,
                filter: active ? 'drop-shadow(0 0 10px rgba(250,204,21,0.8)) brightness(1.15)' : 'brightness(0.6) saturate(0.4)',
                transform: active ? 'scale(1.04)' : undefined,
              }}
              aria-label={button.label}
              title={button.label}
            />
          )
        })}
      </section>

      {/* 行为按钮：只有当前区域的动作可用（亮），其他灰 */}
      <section className="absolute z-30" style={rectStyle(LAYERS.actionButtons)}>
        {ACTION_BUTTONS.map((button) => {
          const avail = button.availableAreas.includes(currentArea)
          const active = currentAction === button.id
          const filterStyle = !avail
            ? 'grayscale(1) brightness(0.4)'
            : active
              ? 'brightness(1.2) drop-shadow(0 0 10px rgba(250,204,21,0.8))'
              : 'brightness(0.85)'
          return (
            <button
              key={button.id}
              disabled={!avail || locked}
              onClick={() => avail && gameBus.setAction(button.id)}
              type="button"
              className={`absolute bg-contain bg-center bg-no-repeat transition-all duration-150 ${locked ? 'opacity-50' : 'active:scale-95'}`}
              style={{
                left: button.x - LAYERS.actionButtons.x,
                top: button.y - LAYERS.actionButtons.y,
                width: button.width,
                height: button.height,
                backgroundImage: `url(${actionImage[button.id]})`,
                filter: filterStyle,
                opacity: !avail ? 0.35 : 1,
                transform: active ? 'scale(1.04)' : undefined,
              }}
              aria-label={button.label}
              title={button.label}
            />
          )
        })}
      </section>

      {/* 底部导航 */}
      <nav className="absolute z-30" style={rectStyle(LAYERS.bottomNav)}>
        {BOTTOM_NAV_BUTTONS.map((button) => {
          const isActive = button.id === 'office' ? !subPage : subPage === button.id
          return (
            <button
              key={button.id}
              type="button"
              className="absolute bg-contain bg-center bg-no-repeat active:scale-95 transition-all duration-150"
              style={{
                left: button.x - LAYERS.bottomNav.x,
                top: button.y - LAYERS.bottomNav.y,
                width: button.width,
                height: button.height,
                backgroundImage: `url(/ui2d/${button.iconKey}-live.png)`,
                filter: isActive ? 'brightness(1.3) drop-shadow(0 0 8px rgba(250,204,21,0.6))' : 'brightness(0.7)',
                transform: isActive ? 'scale(1.05)' : undefined,
              }}
              onClick={() => setSubPage(button.id === 'office' ? null : button.id)}
              aria-label={button.label}
              title={button.label}
            />
          )
        })}
      </nav>
    </>
  )
}
