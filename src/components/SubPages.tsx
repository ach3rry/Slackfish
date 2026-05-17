import React, { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { BOTTOM_NAV_BUTTONS, LAYERS } from '../data/mobileLevelLayout'
import {
  TASKS_CARDS, TASKS_CLAIM_BUTTONS, TASKS_TABS,
  EMPLOYEE_TABS, EMPLOYEE_AVATAR, EMPLOYEE_INFO,
  EMPLOYEE_STATS, EMPLOYEE_SKILL_CARDS, EMPLOYEE_REFRESH_BTN,
  ACHIEVEMENT_CARDS, ACHIEVEMENT_FILTER_TABS, ACHIEVEMENT_SORT_BTN,
  SHOP_ITEMS, SHOP_ACTION_BTNS, SHOP_CURRENCY,
} from '../data/subPageLayout'
import type { LayoutRect } from '../data/subPageLayout'

const showPlaceholder = () => useGameStore.getState().showPlaceholder()

const pageConfig = {
  employee: { bg: '/images2d/subpages/employee.png' },
  tasks: { bg: '/images2d/subpages/tasks.png' },
  achievements: { bg: '/images2d/subpages/achievements.jpg' },
  shop: { bg: '/images2d/subpages/shop.png' },
}

/* ── shared overlay primitives ── */

function Hit({ rect: rc, onClick, active, label, glow, children }: {
  rect: LayoutRect; onClick?: () => void; active?: boolean; label?: string; glow?: boolean
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="absolute active:scale-[0.97]"
      style={{
        left: rc.left, top: rc.top, width: rc.width, height: rc.height,
        background: active
          ? 'rgba(250,204,21,0.12)'
          : 'transparent',
        border: active
          ? '2px solid rgba(250,204,21,0.5)'
          : '2px solid transparent',
        borderRadius: 8,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: glow && active ? '0 0 12px rgba(250,204,21,0.4)' : 'none',
        transition: 'all 0.15s ease',
      }}
    >
      {children}
    </button>
  )
}

function TabBar({ tabs, activeId, onSelect }: {
  tabs: { id: string; label: string; rect: LayoutRect }[]
  activeId: string
  onSelect: (id: string) => void
}) {
  return (
    <>
      {tabs.map((t) => (
        <Hit
          key={t.id}
          rect={t.rect}
          label={t.label}
          active={activeId === t.id}
          onClick={() => onSelect(t.id)}
        />
      ))}
    </>
  )
}

/* ── inline info helpers ── */

function ProgressLine({ current, target }: { current: number; target: number }) {
  const pct = Math.min(100, (current / target) * 100)
  const done = current >= target
  return (
    <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 6, background: 'rgba(0,0,0,0.5)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: done ? '#66bb6a' : '#fbbf24',
          borderRadius: 3, transition: 'width 0.3s',
        }} />
      </div>
      <span style={{
        color: done ? '#66bb6a' : 'rgba(255,255,255,0.85)',
        fontSize: 11, fontWeight: 600,
        textShadow: '0 1px 3px rgba(0,0,0,0.9)',
        whiteSpace: 'nowrap',
      }}>
        {current}/{target}
      </span>
    </div>
  )
}

function Badge({ children, color = '#fbbf24', bg = 'rgba(0,0,0,0.75)' }: {
  children: React.ReactNode; color?: string; bg?: string
}) {
  return (
    <span style={{
      position: 'absolute', top: 6, right: 6,
      background: bg, color,
      fontSize: 11, padding: '3px 10px',
      borderRadius: 6, fontWeight: 700,
      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    }}>
      {children}
    </span>
  )
}

/* ── page-specific overlays ── */

function TasksOverlay() {
  const [tab, setTab] = useState('daily')

  return (
    <>
      {TASKS_CARDS.map((card) => {
        const done = card.progress >= card.target
        return (
          <Hit
            key={card.id}
            rect={card.rect}
            label={card.name}
            onClick={showPlaceholder}
          >
            <div style={{
              position: 'absolute', inset: 0,
              padding: '8px 12px 10px',
              display: 'flex', flexDirection: 'column',
              justifyContent: 'flex-end',
            }}>
              {done && <Badge color="#fff" bg="rgba(250,204,21,0.85)">可领取</Badge>}
              {!done && <Badge>¥{card.reward}</Badge>}
              <ProgressLine current={card.progress} target={card.target} />
            </div>
          </Hit>
        )
      })}
      {TASKS_CLAIM_BUTTONS.map((btn) => (
        <Hit
          key={`claim-${btn.taskId}`}
          rect={btn.rect}
          label="领取奖励"
          active
          glow
          onClick={showPlaceholder}
        />
      ))}
      <TabBar tabs={TASKS_TABS} activeId={tab} onSelect={setTab} />
    </>
  )
}

function EmployeeOverlay() {
  const [tab, setTab] = useState('profile')
  const salary = useGameStore((s) => s.salary)
  const fish = useGameStore((s) => s.fish)

  return (
    <>
      <TabBar tabs={EMPLOYEE_TABS} activeId={tab} onSelect={setTab} />
      <Hit rect={EMPLOYEE_AVATAR} label="头像" onClick={showPlaceholder} />
      <Hit rect={EMPLOYEE_INFO} label="员工信息" onClick={showPlaceholder}>
        <div style={{
          position: 'absolute', bottom: 6, left: 10,
          display: 'flex', gap: 12,
        }}>
          <span style={{ color: '#fbbf24', fontSize: 12, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
            ¥{salary}
          </span>
          <span style={{ color: '#60a5fa', fontSize: 12, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
            🐟{fish}
          </span>
        </div>
      </Hit>
      {EMPLOYEE_STATS.map((s) => (
        <Hit key={s.id} rect={s.rect} label={s.label} onClick={showPlaceholder} />
      ))}
      {EMPLOYEE_SKILL_CARDS.map((sc) => (
        <Hit
          key={sc.id}
          rect={sc.rect}
          label={sc.name}
          onClick={showPlaceholder}
        >
          <div style={{
            position: 'absolute', top: 6, left: 10,
            color: '#fff', fontSize: 12, fontWeight: 500,
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
          }}>
            {sc.name}
          </div>
        </Hit>
      ))}
      <Hit rect={EMPLOYEE_REFRESH_BTN} label="刷新技能卡" onClick={showPlaceholder} />
    </>
  )
}

function AchievementsOverlay() {
  const [filter, setFilter] = useState('all')

  const visible = filter === 'all'
    ? ACHIEVEMENT_CARDS
    : filter === 'unlocked'
      ? ACHIEVEMENT_CARDS.filter((c) => c.unlocked)
      : ACHIEVEMENT_CARDS.filter((c) => (c.progress ?? 0) >= 50)

  return (
    <>
      <TabBar tabs={ACHIEVEMENT_FILTER_TABS} activeId={filter} onSelect={setFilter} />
      <Hit rect={ACHIEVEMENT_SORT_BTN} label="排序" onClick={showPlaceholder} />
      {visible.map((card) => (
        <Hit
          key={card.id}
          rect={card.rect}
          label={card.name}
          glow={card.unlocked}
          onClick={showPlaceholder}
        >
          <div style={{ position: 'absolute', bottom: 8, left: 12, right: 12 }}>
            {card.unlocked ? (
              <span style={{
                color: '#66bb6a', fontSize: 11, fontWeight: 700,
                textShadow: '0 1px 3px rgba(0,0,0,0.9)',
              }}>
                ✓ 已解锁
              </span>
            ) : (
              <ProgressLine current={card.progress} target={100} />
            )}
          </div>
        </Hit>
      ))}
    </>
  )
}

function ShopOverlay() {
  const [actionTab, setActionTab] = useState('buy')
  const salary = useGameStore((s) => s.salary)

  return (
    <>
      <Hit rect={SHOP_CURRENCY} label={`工资余额: ¥${salary}`}>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            color: '#fbbf24', fontSize: 14, fontWeight: 700,
            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
          }}>
            ¥{salary}
          </span>
        </div>
      </Hit>

      {SHOP_ITEMS.map((item) => (
        <Hit
          key={`card-${item.id}`}
          rect={item.rect}
          label={item.name}
          onClick={showPlaceholder}
        >
          <span style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'rgba(0,0,0,0.7)',
            color: '#fbbf24',
            fontSize: 12, padding: '3px 10px',
            borderRadius: 6, fontWeight: 700,
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }}>
            ¥{item.price}
          </span>
        </Hit>
      ))}
      {SHOP_ITEMS.map((item) => (
        <Hit
          key={`buy-${item.id}`}
          rect={item.buyRect}
          label={`购买 ${item.name}`}
          active
          glow
          onClick={showPlaceholder}
        />
      ))}
      <TabBar tabs={SHOP_ACTION_BTNS} activeId={actionTab} onSelect={setActionTab} />
    </>
  )
}

/* ── main component ── */

const overlayMap: Record<string, () => React.ReactElement> = {
  tasks: TasksOverlay,
  employee: EmployeeOverlay,
  achievements: AchievementsOverlay,
  shop: ShopOverlay,
}

export default function SubPages() {
  const subPage = useGameStore((s) => s.subPage)
  const setSubPage = useGameStore((s) => s.setSubPage)

  if (!subPage || !pageConfig[subPage as keyof typeof pageConfig]) return null

  const config = pageConfig[subPage as keyof typeof pageConfig]!
  const Overlay = overlayMap[subPage]

  return (
    <div className="absolute inset-0" style={{ width: 1080, height: 1920, zIndex: 40 }}>
      <div className="absolute inset-0" style={{ background: '#0d1117' }} />

      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${config.bg})` }}
      />

      {Overlay && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 50 }}>
          <div className="absolute inset-0 pointer-events-auto">
            <Overlay />
          </div>
        </div>
      )}

      <nav
        className="absolute left-0 right-0"
        style={{ top: LAYERS.bottomNav.y, height: LAYERS.bottomNav.height, zIndex: 60 }}
      >
        <div className="absolute inset-0" style={{ background: '#0d1117' }} />
        {BOTTOM_NAV_BUTTONS.map((button) => {
          const isActive = button.id === 'office' ? false : subPage === button.id
          return (
            <button
              key={button.id}
              type="button"
              className="absolute bg-contain bg-center bg-no-repeat active:scale-95 transition-all duration-150"
              style={{
                left: button.x - LAYERS.bottomNav.x,
                top: 0,
                width: button.width,
                height: button.height,
                backgroundImage: `url(/ui2d/${button.iconKey}-live.png)`,
                filter: isActive
                  ? 'brightness(1.3) drop-shadow(0 0 8px rgba(250,204,21,0.6))'
                  : 'brightness(0.7)',
                transform: isActive ? 'scale(1.05)' : undefined,
              }}
              onClick={() => setSubPage(button.id === 'office' ? null : button.id)}
              aria-label={button.label}
              title={button.label}
            />
          )
        })}
      </nav>
    </div>
  )
}
