import { BOSS_VISION_CONFIG, GAME_SIZE, LAYERS } from '../data/mobileLevelLayout'

export const GAME_CONFIG = {
  title: '工位摸鱼：伪装局',
  screen: GAME_SIZE,
  canvas: { width: LAYERS.map.width, height: LAYERS.map.height, background: '#121821' },
  economy: { initialSalary: 200, targetFish: 100, maxLeaderboardEntries: 10 },
  timing: {
    actionCooldownMs: 500, catchStunMs: 800, firstPatrolDelayMs: 3000,
    bossWarningMs: 1000, bossRestMinMs: 1500, bossRestMaxMs: 4500,
    illegalExposureMs: 700, catchNoticeMs: 2000,
    guideStorageKey: 'slackfish-guide-seen', leaderboardStorageKey: 'slackfish-leaderboard',
    dtCapSeconds: 0.033,
  },
  movement: { playerSpeed: 230, bossSpeed: 215, arrivalDistance: 7 },
  vision: { distance: BOSS_VISION_CONFIG.distance, angleDegrees: BOSS_VISION_CONFIG.angleDeg },
  penalties: { workstationSlacking: 30, minorSlacking: 12, pantrySlacking: 50, offSeat: 20, fakeWorkFail: 10 },
  boss: {
    openingMs: 800, scanDurationMs: 1050, scanRotationSpeed: 3.4,
  },
  exposure: {
    thresholdMs: 700, decayMultiplier: 1.5,
    multipliers: { workstation: 1, pantry: 2, fakeWorking: 0.5, corridor: 1.5, restroom: 0 } as Record<string, number>,
  },
  limits: {
    fakeWorkMaxMs: 8000, fakeWorkCooldownMs: 6000,
    restroomMaxEntries: 3, restroomPhoneMaxMs: 10000,
    restroomWarningMs: 8000, restroomWarningIntervalMs: 5000, restroomStayAutoStopMs: 10000,
  },
  defaults: {
    areaActions: { workstation: 'working', pantry: 'chatting', restroom: 'phone' } as Record<string, import('../types/game').PlayerAction>,
  },
}

export const BOSS_TRASH_TALK = [
  '我让你带薪学习，不是带薪刷视频。',
  '奶茶比 KPI 还重要是吧？',
  '你这不是摸鱼，是开海鲜市场。',
  '电脑带来了，绩效怎么没带来？',
  '薯片声比键盘声还响。',
  '卫生间我不去，但茶水间我熟。',
  '上班摸鱼，下班加班，你是时间管理大师？',
  '公司给你工位是来表演葛优瘫的？',
  '你的摸鱼水平比工作水平高多了。',
  '好家伙，上班时间开茶话会呢？',
] as const

export const RANK_TITLES = [
  { title: '摸鱼大师', minFish: 100, minSalary: 190 },
  { title: '办公室幽灵', minFish: 100, minSalary: 150 },
  { title: '摸鱼熟练工', minFish: 100, minSalary: 80 },
  { title: '摸鱼新手', minFish: 0, minSalary: 0 },
] as const
