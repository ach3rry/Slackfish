import type { LevelConfig, RankConfig } from '../types/game'

/** 第一关完整数值配置 */
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

  // 被抓罚款
  caughtPenalty: {
    workstation: 10,
    breakroom: 20,
    notAtDesk: 5,
  },

  // 老板吐槽文案池
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

  // 所有行为配置
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

  // 地图区域
  zones: [
    {
      id: 'bossOffice',
      label: '老板办公室',
      color: 0x8b0000,
      borderColor: 0xff4444,
      x: 350, y: 10,
      width: 260, height: 120,
      playerSpawn: { x: 480, y: 70 },
      safeZone: false,
      playerCanEnter: false,
    },
    {
      id: 'workstation',
      label: '工位区',
      color: 0x2a5a2a,
      borderColor: 0x44aa44,
      x: 20, y: 140,
      width: 400, height: 280,
      playerSpawn: { x: 220, y: 300 },
      safeZone: false,
      playerCanEnter: true,
    },
    {
      id: 'breakroom',
      label: '茶水间',
      color: 0x8b6914,
      borderColor: 0xffaa44,
      x: 560, y: 10,
      width: 380, height: 250,
      playerSpawn: { x: 750, y: 140 },
      safeZone: false,
      playerCanEnter: true,
    },
    {
      id: 'restroom',
      label: '卫生间',
      color: 0x1a4a6a,
      borderColor: 0x44aaff,
      x: 560, y: 340,
      width: 380, height: 290,
      playerSpawn: { x: 750, y: 490 },
      safeZone: true,
      playerCanEnter: true,
    },
    {
      id: 'corridor',
      label: '中央走廊',
      color: 0x555555,
      borderColor: 0x888888,
      x: 420, y: 140,
      width: 140, height: 490,
      playerSpawn: { x: 490, y: 390 },
      safeZone: false,
      playerCanEnter: true,
    },
  ],

  // 老板巡查路线
  patrolRoute: [
    { x: 480, y: 70, zone: 'bossOffice' },
    { x: 480, y: 200, zone: 'corridor', waitTime: 1 },
    { x: 220, y: 300, zone: 'workstation', waitTime: 2 },
    { x: 220, y: 200, zone: 'workstation' },
    { x: 480, y: 200, zone: 'corridor', waitTime: 0.5 },
    { x: 750, y: 140, zone: 'breakroom', waitTime: 2 },
    { x: 480, y: 200, zone: 'corridor', waitTime: 0.5 },
    { x: 480, y: 70, zone: 'bossOffice' },
  ],
}

/** 段位配置 */
export const ranks: RankConfig[] = [
  { name: '摸鱼大师', minSlacking: 150, minSalary: 180 },
  { name: '办公室幽灵', minSlacking: 120, minSalary: 150 },
  { name: '摸鱼熟练工', minSlacking: 100, minSalary: 100 },
  { name: '摸鱼新手', minSlacking: 0, minSalary: 0 },
]
