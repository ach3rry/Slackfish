export const GAME_CONFIG = {
  title: '工位摸鱼：伪装局',
  canvas: { width: 1080, height: 760, background: '#121821' },
  economy: { initialSalary: 200, targetFish: 100, maxLeaderboardEntries: 10 },
  timing: {
    actionCooldownMs: 500, catchStunMs: 1500, firstPatrolDelayMs: 3000,
    bossWarningMs: 1000, bossRestMinMs: 3000, bossRestMaxMs: 5000,
    illegalExposureMs: 1000, catchNoticeMs: 2000,
    guideStorageKey: 'slackfish-guide-seen', leaderboardStorageKey: 'slackfish-leaderboard',
  },
  movement: { playerSpeed: 230, bossSpeed: 116, arrivalDistance: 7 },
  vision: { distance: 160, angleDegrees: 90 },
  penalties: { workstationFish: 10, pantryFish: 20, awayFromDesk: 5 },
} as const

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
