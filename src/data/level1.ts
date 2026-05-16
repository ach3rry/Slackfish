import type { LevelConfig, RankConfig } from '../types/game'

/**
 * 地图布局（960 x 640，无缝铺满）
 *
 *   ┌──────────────────────────────────────────────┐
 *   │            老板办公室 (960 x 100)             │
 *   ├──────────────┬──────┬────────────────────────┤
 *   │              │      │                        │
 *   │   工位区     │ 走廊 │      茶水间            │
 *   │  (440x340)  │(80)  │    (440 x 340)         │
 *   │              │      │                        │
 *   ├──────────────┴──────┼────────────────────────┤
 *   │                     │                        │
 *   │    走廊延伸          │       卫生间            │
 *   │   (520 x 200)       │    (440 x 200)         │
 *   │                     │                        │
 *   └─────────────────────┴────────────────────────┘
 */
export const level1Config: LevelConfig = {
  initialSalary: 200,
  targetSlacking: 100,
  actionCooldown: 0.5,
  caughtStunTime: 1.5,
  bossPatrolCooldownMin: 3,
  bossPatrolCooldownMax: 5,
  bossVisionAngle: 90,
  bossVisionDistance: 160,
  bossVisionAlertTime: 1.0,
  bossFirstDelay: 3,
  mapWidth: 960,
  mapHeight: 640,

  caughtPenalty: {
    workstation: 10,
    breakroom: 20,
    notAtDesk: 5,
  },

  bossTaunts: [
    '我让你带薪学习，不是带薪刷视频。',
    '奶茶比 KPI 还重要是吧？',
    '你这不是摸鱼，是开海鲜市场。',
    '上班摸鱼，下班加班，你是时间管理大师？',
    '公司给你工位是来表演葛优瘫的？',
    '我站你后面看了三分钟了，精彩。',
    '你的摸鱼水平比工作水平高多了。',
    '这个月的优秀员工没你了啊。',
    '你是不是以为我眼瞎？',
    '好家伙，上班时间开茶话会呢？',
  ],

  actions: [
    { id: 'idle', label: '待机', emoji: '😐', slackingPerSec: 0, salaryPerSec: 0, riskLevel: 'none', availableIn: ['workstation', 'breakroom', 'restroom'] },
    { id: 'working', label: '正常工作', emoji: '💻', slackingPerSec: 0, salaryPerSec: 2, riskLevel: 'none', availableIn: ['workstation'] },
    { id: 'watching', label: '看视频', emoji: '📺', slackingPerSec: 3, salaryPerSec: 0, riskLevel: 'low', availableIn: ['workstation'] },
    { id: 'chips', label: '吃薯片', emoji: '🍟', slackingPerSec: 2, salaryPerSec: 0, riskLevel: 'veryLow', availableIn: ['workstation'] },
    { id: 'milkTea', label: '喝奶茶', emoji: '🧋', slackingPerSec: 8, salaryPerSec: 0, riskLevel: 'veryHigh', availableIn: ['breakroom'] },
    { id: 'chatting', label: '闲聊摸鱼', emoji: '💬', slackingPerSec: 7, salaryPerSec: 0, riskLevel: 'veryHigh', availableIn: ['breakroom'] },
    { id: 'fakeWorking', label: '假装办公', emoji: '🖥️', slackingPerSec: 4, salaryPerSec: 0, riskLevel: 'medium', availableIn: ['breakroom'] },
    { id: 'phone', label: '刷手机', emoji: '📱', slackingPerSec: 5, salaryPerSec: 0, riskLevel: 'none', availableIn: ['restroom'] },
  ],

  zones: [
    {
      id: 'bossOffice',
      label: '👔 老板办公室',
      color: 0x3d1a1a,
      borderColor: 0xcc4444,
      x: 0, y: 0,
      width: 960, height: 100,
      playerSpawn: { x: 480, y: 50 },
      safeZone: false,
      playerCanEnter: false,
    },
    {
      id: 'workstation',
      label: '💻 工位区',
      color: 0x1e2d1e,
      borderColor: 0x3fb950,
      x: 0, y: 100,
      width: 440, height: 340,
      playerSpawn: { x: 220, y: 280 },
      safeZone: false,
      playerCanEnter: true,
    },
    {
      id: 'corridor',
      label: '中央走廊',
      color: 0x21262d,
      borderColor: 0x484f58,
      x: 440, y: 100,
      width: 80, height: 340,
      playerSpawn: { x: 480, y: 270 },
      safeZone: false,
      playerCanEnter: true,
    },
    {
      id: 'breakroom',
      label: '☕ 茶水间',
      color: 0x2d2510,
      borderColor: 0xd29922,
      x: 520, y: 100,
      width: 440, height: 340,
      playerSpawn: { x: 740, y: 270 },
      safeZone: false,
      playerCanEnter: true,
    },
    {
      id: 'corridorBottom',
      label: '走廊',
      color: 0x21262d,
      borderColor: 0x484f58,
      x: 0, y: 440,
      width: 520, height: 200,
      playerSpawn: { x: 260, y: 540 },
      safeZone: false,
      playerCanEnter: true,
    },
    {
      id: 'restroom',
      label: '🛡️ 卫生间',
      color: 0x102030,
      borderColor: 0x58a6ff,
      x: 520, y: 440,
      width: 440, height: 200,
      playerSpawn: { x: 740, y: 540 },
      safeZone: true,
      playerCanEnter: true,
    },
  ],

  // 老板巡查路线
  patrolRoute: [
    { x: 480, y: 50, zone: 'bossOffice' },
    { x: 480, y: 180, zone: 'corridor', waitTime: 0.8 },
    { x: 220, y: 280, zone: 'workstation', waitTime: 2.5 },
    { x: 220, y: 180, zone: 'workstation' },
    { x: 480, y: 180, zone: 'corridor', waitTime: 0.5 },
    { x: 740, y: 270, zone: 'breakroom', waitTime: 2.5 },
    { x: 480, y: 180, zone: 'corridor', waitTime: 0.5 },
    { x: 480, y: 50, zone: 'bossOffice' },
  ],
}

export const ranks: RankConfig[] = [
  { name: '摸鱼大师', minSlacking: 150, minSalary: 180 },
  { name: '办公室幽灵', minSlacking: 120, minSalary: 150 },
  { name: '摸鱼熟练工', minSlacking: 100, minSalary: 100 },
  { name: '摸鱼新手', minSlacking: 0, minSalary: 0 },
]
