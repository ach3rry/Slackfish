import { BOSS_VISION_CONFIG, GAME_SIZE, LAYERS } from '../data/mobileLevelLayout'

export const GAME_CONFIG = {
  title: '工位摸鱼：伪装局',
  screen: GAME_SIZE,
  canvas: { width: LAYERS.map.width, height: LAYERS.map.height, background: '#121821' },
  economy: { initialSalary: 100, targetFish: 100, maxLeaderboardEntries: 10 },
  timing: {
    actionCooldownMs: 400, catchStunMs: 1000, firstPatrolDelayMs: 2500,
    bossWarningMs: 800, bossRestMinMs: 600, bossRestMaxMs: 1800,
    illegalExposureMs: 700, catchNoticeMs: 2000,
    guideStorageKey: 'slackfish-guide-seen', leaderboardStorageKey: 'slackfish-leaderboard',
    dtCapSeconds: 0.033,
  },
  movement: { playerSpeed: 230, bossSpeed: 235, arrivalDistance: 7 },
  vision: { distance: BOSS_VISION_CONFIG.distance, angleDegrees: BOSS_VISION_CONFIG.angleDeg },
  penalties: { workstationSlacking: 35, minorSlacking: 18, pantrySlacking: 55, offSeat: 25, fakeWorkFail: 15 },
  boss: {
    openingMs: 800, scanDurationMs: 2200, scanRotationSpeed: 2.0,
  },
  exposure: {
    thresholdMs: 800, decayMultiplier: 0.8,
    multipliers: { workstation: 1.3, pantry: 2.2, fakeWorking: 0.6, corridor: 1.8, restroom: 0 } as Record<string, number>,
  },
  limits: {
    fakeWorkMaxMs: 8000, fakeWorkCooldownMs: 6000,
    restroomMaxEntries: 3, restroomPhoneMaxMs: 10000,
    restroomWarningMs: 8000, restroomWarningIntervalMs: 5000, restroomStayAutoStopMs: 10000,
  },
  defaults: {
    areaActions: { workstation: 'working', pantry: 'chatting', restroom: 'phone' } as Record<string, import('../types/game').PlayerAction>,
  },

  // ── 新增系统 ──

  suspicion: {
    max: 100, startValue: 0,
    exposureGainPerTick: 0.3,
    bossSightingNpcFishGain: 5,
    crowdPantryGain: 3,
    decayPerSecond: 2,
    patrolIntervalMultiplier: (s: number) => Math.max(0.3, 1 - s / 150),
    moodThresholds: { calm: 0, suspicious: 30, angry: 60, furious: 85 } as Record<string, number>,
  },

  bossAI: {
    fakeReturnChance: 0.25,
    fakeReturnDelayMs: 600,
    suddenStopChance: 0.18,
    suddenStopDurationMs: 1500,
    lookBackChance: 0.30,
    lookBackAngle: Math.PI,
    lookBackDurationMs: 800,
    angryExtraSpeed: 50,
    furiousExtraSpeed: 80,
    routeVariationCount: 6,
    npcCatchRadius: 120,
    npcCatchSuspicionGain: 15,
    huntChance: { angry: 0.45, furious: 0.7 } as Record<string, number>,
    moodExposureMultiplier: { calm: 1, suspicious: 1.3, angry: 1.7, furious: 2.2 } as Record<string, number>,
    moodScanSpeedMultiplier: { calm: 1, suspicious: 1, angry: 1.3, furious: 1.6 } as Record<string, number>,
  },

  rhythm: {
    phases: {
      calm: { durationMin: 6, durationMax: 10, bossChance: 0.3, suspicionDrain: 3 },
      patrol: { durationMin: 8, durationMax: 15, bossChance: 0.8, suspicionDrain: 0 },
      pressure: { durationMin: 5, durationMax: 8, bossChance: 1, suspicionDrain: -2 },
      buffer: { durationMin: 3, durationMax: 5, bossChance: 0.1, suspicionDrain: 5 },
    } as Record<string, { durationMin: number; durationMax: number; bossChance: number; suspicionDrain: number }>,
    phaseOrder: ['calm', 'patrol', 'pressure', 'buffer'] as const,
  },

  disguise: {
    levels: [
      { level: 1, requiredFish: 0, exposureMultiplier: 1.0, name: '初级伪装' },
      { level: 2, requiredFish: 30, exposureMultiplier: 0.7, name: '熟练伪装' },
      { level: 3, requiredFish: 65, exposureMultiplier: 0.4, name: '大师伪装' },
    ] as { level: number; requiredFish: number; exposureMultiplier: number; name: string }[],
  },

  npc: {
    count: 8,
    spawnPositions: [
      { x: 120, y: 350 }, { x: 300, y: 350 }, { x: 180, y: 550 },
      { x: 340, y: 700 }, { x: 100, y: 900 }, { x: 280, y: 1000 },
      { x: 150, y: 1150 }, { x: 350, y: 1200 },
    ],
    personalities: ['serious', 'slacker', 'social', 'loner'] as const,
    namePool: ['小王', '阿杰', '小美', '老张', '阿丽', '大刘', '小陈', '阿强'],
    stateTimers: { idle: [2, 5], working: [5, 15], fishWorking: [3, 8], fakeWorking: [3, 6], chatting: [3, 8], pantryRelax: [4, 10], restroomBreak: [3, 6], walking: [1, 3], stunned: [2, 3] },
    reactionSpeeds: { serious: 0.3, slacker: 0.8, social: 0.5, loner: 0.6 },
    fishTendency: { serious: 0.1, slacker: 0.5, social: 0.3, loner: 0.2 },
    socialTendency: { serious: 0.1, slacker: 0.3, social: 0.8, loner: 0.05 },
    tints: { serious: 0xcccccc, slacker: 0x88ccff, social: 0xffcc88, loner: 0xaa99cc },
    speed: 100,
    separationRadius: 50,
    separationForce: 30,
    decisionIntervalMs: [1000, 3000],
    bubbleTexts: {
      friendly: ['老板刚过去', '快切屏！', '茶水间安全', '加油摸', '小心点'],
      slacker: ['摸会儿鱼吧', '摸了摸了', '好困', '不想干活'],
      warning: ['老板来了！', '快收手机！', '注意！', '老板在看你！'],
      random: ['今天好累', '咖啡续命', '下班了吗', '摸鱼一时爽'],
    },
    crowdExposureReduction: 0.3,
  },

  feedback: {
    screenShakeOnCatch: { duration: 400, intensity: 0.015 },
    screenShakeOnWarning: { duration: 200, intensity: 0.005 },
    redFlashOnCatch: { duration: 300 },
    bossAngerPulse: { intervalMs: 500, scale: 0.05 },
  },

  exposureStages: {
    safe: { minPct: 0, maxPct: 30 },
    warning: { minPct: 30, maxPct: 70 },
    danger: { minPct: 70, maxPct: 100 },
  } as Record<string, { minPct: number; maxPct: number }>,

  distanceFalloff: {
    zones: [
      { maxDistance: 150, rate: 1.0 },
      { maxDistance: 300, rate: 0.7 },
      { maxDistance: 450, rate: 0.45 },
    ] as { maxDistance: number; rate: number }[],
  },

  visionFeedback: {
    coneAlpha: 0.40,
    coneExposureAlphaMax: 0.65,
    vignetteMaxAlpha: 0.85,
    heartbeatStartPct: 35,
    heartbeatSpeed: 7.0,
    ringColors: {
      safe: { stroke: 0x66bb6a, alpha: 0.7 },
      warning: { stroke: 0xfbbf24, alpha: 0.85 },
      danger: { stroke: 0xef4444, alpha: 1.0 },
    } as Record<string, { stroke: number; alpha: number }>,
    stageDecayMultipliers: { safe: 1.0, warning: 0.6, danger: 0.3 } as Record<string, number>,
    bossWarningTurnMs: 350,
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

export const BOSS_NPC_TRASH_TALK = [
  '你看看你，上班时间不干活！',
  '全公司就你最闲是吧？',
  '这个月的绩效你别想要了。',
  '我刚才就看到你在玩手机。',
] as const

export const RANK_TITLES = [
  { title: '摸鱼大师', minFish: 100, minSalary: 190 },
  { title: '办公室幽灵', minFish: 100, minSalary: 150 },
  { title: '摸鱼熟练工', minFish: 100, minSalary: 80 },
  { title: '摸鱼新手', minFish: 0, minSalary: 0 },
] as const
