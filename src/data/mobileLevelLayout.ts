import type { AreaId, PlayerAction } from '../types/game'

type Direction = 'up' | 'down' | 'left' | 'right'
type LayoutRect = { x: number; y: number; width: number; height: number; zIndex?: number }
type LayoutPoint = { x: number; y: number }
type AreaKey = AreaId | 'mainCorridor' | 'teaRoom'

export const GAME_SIZE = { width: 1080, height: 1920, aspectRatio: '9:16' }

export const SAFE_AREA = { top: 44, bottom: 36, left: 24, right: 24 }

export const LAYERS = {
  topHud: { x: 0, y: 0, width: 1080, height: 150, zIndex: 30 },
  map: { x: 0, y: 150, width: 1080, height: 1300, zIndex: 10 },
  zoneTabs: { x: 0, y: 1450, width: 1080, height: 104, zIndex: 30 },
  actionButtons: { x: 0, y: 1566, width: 1080, height: 220, zIndex: 30 },
  bottomNav: { x: 0, y: 1804, width: 1080, height: 116, zIndex: 30 },
  modal: { x: 0, y: 0, width: 1080, height: 1920, zIndex: 60 },
} satisfies Record<string, LayoutRect>

// === 基于切图边缘坐标 (ASSET_PLACEMENT) 的区域定义 ===
// 地图尺寸: 1080 x 1300
// 关键边界: 工位右墙 x=458 | 走廊 x=458~608 | 右侧房间 x=608+
// 右侧纵向: 茶水间 y=0~464 | 卫生间 y=464~805 | 老板办 y=805~1300
export const AREAS = {
  workstation: {
    id: 'workstation', name: '工位区', type: 'room', riskLevel: 'low',
    x: 0, y: 0, width: 458, height: 1300,
    center: { x: 229, y: 500 }, labelPosition: { x: 229, y: 30 }, actionPoint: { x: 229, y: 400 },
    isSafeZone: false, playerBlocked: false, bossAllowed: true,
  },
  mainCorridor: {
    id: 'mainCorridor', name: '主走廊', type: 'corridor', riskLevel: 'medium',
    x: 458, y: 0, width: 150, height: 1300,
    center: { x: 533, y: 650 }, labelPosition: { x: 533, y: 650 }, actionPoint: { x: 533, y: 650 },
    isSafeZone: false, playerBlocked: false, bossAllowed: true,
  },
  teaRoom: {
    id: 'teaRoom', name: '茶水间', type: 'room', riskLevel: 'high',
    x: 608, y: 0, width: 472, height: 464,
    center: { x: 844, y: 232 }, labelPosition: { x: 844, y: 30 }, actionPoint: { x: 844, y: 250 },
    isSafeZone: false, playerBlocked: false, bossAllowed: true,
  },
  restroom: {
    id: 'restroom', name: '卫生间', type: 'room', riskLevel: 'safe',
    x: 608, y: 464, width: 472, height: 341,
    center: { x: 844, y: 635 }, labelPosition: { x: 844, y: 480 }, actionPoint: { x: 844, y: 635 },
    isSafeZone: true, playerBlocked: false, bossAllowed: false,
  },
  bossOffice: {
    id: 'bossOffice', name: '领导办公室', type: 'room', riskLevel: 'boss',
    x: 608, y: 805, width: 472, height: 495,
    center: { x: 844, y: 1053 }, labelPosition: { x: 844, y: 820 }, actionPoint: { x: 844, y: 1053 },
    isSafeZone: false, playerBlocked: true, bossAllowed: true,
  },
} satisfies Record<string, {
  id: AreaKey
  name: string
  type: string
  riskLevel: string
  x: number
  y: number
  width: number
  height: number
  center: LayoutPoint
  labelPosition: LayoutPoint
  actionPoint: LayoutPoint
  isSafeZone: boolean
  playerBlocked: boolean
  bossAllowed: boolean
}>

// 门洞坐标: 工位右墙 x=458, 右侧房间左墙 x=608
export const ROOM_DOORS = [
  // 工位区上门: 工位右墙 x=458
  { id: 'workstation-upper', from: 'workstation', to: 'mainCorridor', x: 445, y: 320, width: 26, height: 40, enterPointFrom: { x: 445, y: 340 }, enterPointTo: { x: 470, y: 340 }, bossOnly: false, playerAllowed: true },
  // 工位区下门
  { id: 'workstation-lower', from: 'workstation', to: 'mainCorridor', x: 445, y: 560, width: 26, height: 40, enterPointFrom: { x: 445, y: 580 }, enterPointTo: { x: 470, y: 580 }, bossOnly: false, playerAllowed: true },
  // 茶水间门: 右侧房间左墙 x=608
  { id: 'teaRoom-main', from: 'teaRoom', to: 'mainCorridor', x: 595, y: 212, width: 26, height: 40, enterPointFrom: { x: 608, y: 232 }, enterPointTo: { x: 595, y: 232 }, bossOnly: false, playerAllowed: true },
  // 卫生间门
  { id: 'restroom-main', from: 'restroom', to: 'mainCorridor', x: 595, y: 615, width: 26, height: 40, enterPointFrom: { x: 608, y: 635 }, enterPointTo: { x: 595, y: 635 }, bossOnly: false, playerAllowed: true },
  // 老板办公室门
  { id: 'bossOffice-main', from: 'bossOffice', to: 'mainCorridor', x: 595, y: 880, width: 26, height: 40, enterPointFrom: { x: 608, y: 900 }, enterPointTo: { x: 595, y: 900 }, bossOnly: true, playerAllowed: false },
]

export const INTERACTION_POINTS = {
  workstationSeats: [
    { id: 'seat-1', x: 150, y: 270 }, { id: 'seat-2', x: 340, y: 270 },
    { id: 'seat-3', x: 150, y: 520 }, { id: 'seat-4', x: 340, y: 520 },
    { id: 'seat-5', x: 150, y: 770 }, { id: 'seat-6', x: 340, y: 770 },
  ],
  workstationDesks: [
    { id: 'desk-1', x: 150, y: 214 }, { id: 'desk-2', x: 340, y: 214 },
    { id: 'desk-3', x: 150, y: 464 }, { id: 'desk-4', x: 340, y: 464 },
    { id: 'desk-5', x: 150, y: 714 }, { id: 'desk-6', x: 340, y: 714 },
  ],
  teaRoomTable: { id: 'tea-table', x: 844, y: 300 },
  teaRoomCoffeeMachine: { id: 'coffee-machine', x: 810, y: 135 },
  teaRoomFridge: { id: 'fridge', x: 680, y: 150 },
  restroomSafePoint: { id: 'restroom-safe', x: 844, y: 680 },
  restroomStall: { id: 'restroom-stall', x: 800, y: 740 },
  bossOfficeDesk: { id: 'boss-desk', x: 844, y: 1053 },
}

export const PLAYER_SPAWN_AND_TARGETS = {
  initialSpawn: { x: 229, y: 400, faceDirection: 'down' as Direction, areaId: 'workstation' as AreaId },
  workstationTarget: { x: 229, y: 400, faceDirection: 'down' as Direction, areaId: 'workstation' as AreaId },
  teaRoomTarget: { x: 844, y: 250, faceDirection: 'down' as Direction, areaId: 'pantry' as AreaId },
  restroomTarget: { x: 844, y: 635, faceDirection: 'down' as Direction, areaId: 'restroom' as AreaId },
  corridorWaitPoint: { x: 533, y: 650, faceDirection: 'up' as Direction, areaId: 'corridor' as AreaId },
  emergencyHidePoint: { x: 844, y: 635, faceDirection: 'down' as Direction, areaId: 'restroom' as AreaId },
}

type Waypoint = { id: string; x: number; y: number; areaId: AreaId; faceDirection: Direction; waitMs: number; visionEnabled: boolean; action: string }

const wp = (id: string, x: number, y: number, faceDirection: Direction, waitMs: number, action: string, visionEnabled = true): Waypoint =>
  ({ id, x, y, areaId: x < 458 ? 'workstation' as AreaId : x >= 608 ? (y < 464 ? 'pantry' as AreaId : y < 805 ? 'restroom' as AreaId : 'bossOffice' as AreaId) : 'corridor' as AreaId, faceDirection, waitMs, visionEnabled, action })

export const BOSS_SPAWN_AND_PATROL = {
  bossSpawn: { x: 844, y: 1053, areaId: 'bossOffice' as AreaId, faceDirection: 'down' as Direction },
  patrolRoutes: [
    // 路线A：出办公室 → 走廊 → 查工位区 → 走廊 → 查茶水间 → 回
    [
      wp('leave-office', 533, 805, 'up', 250, 'walk'),
      wp('corridor-mid', 533, 500, 'up', 350, 'scan'),
      wp('check-workstation', 380, 400, 'left', 1000, 'check'),
      wp('corridor-mid-b', 533, 400, 'up', 250, 'walk'),
      wp('check-tea-room', 700, 232, 'right', 1000, 'check'),
      wp('return-door', 533, 805, 'down', 250, 'return'),
      wp('rest', 844, 1053, 'down', 0, 'rest', false),
    ],
    // 路线B：出办公室 → 直上走廊顶 → 查茶水间 → 回走廊 → 查工位区 → 回
    [
      wp('leave-office', 533, 805, 'up', 250, 'walk'),
      wp('corridor-top', 533, 150, 'up', 400, 'scan'),
      wp('check-tea-room', 700, 232, 'right', 1000, 'check'),
      wp('corridor-mid', 533, 500, 'down', 250, 'walk'),
      wp('check-workstation', 380, 500, 'left', 1000, 'check'),
      wp('return-door', 533, 805, 'down', 250, 'return'),
      wp('rest', 844, 1053, 'down', 0, 'rest', false),
    ],
    // 路线C：短路线 → 查工位区 → 走廊顶扫描 → 回
    [
      wp('leave-office', 533, 805, 'up', 200, 'walk'),
      wp('corridor-mid', 533, 500, 'up', 300, 'scan'),
      wp('check-workstation', 380, 500, 'left', 900, 'check'),
      wp('corridor-top', 533, 150, 'up', 500, 'scan'),
      wp('return-door', 533, 805, 'down', 250, 'return'),
      wp('rest', 844, 1053, 'down', 0, 'rest', false),
    ],
  ] as Waypoint[][],
}

export const BOSS_VISION_CONFIG = {
  angleDeg: 56,
  distance: 330,
  color: 0xff2626,
  alpha: 0.32,
  originOffset: { x: 0, y: -28 },
  warningDistance: 390,
  catchExposeMs: 1000,
  facingAngles: { up: -90, down: 90, left: 180, right: 0 } satisfies Record<Direction, number>,
}

export const HUD_LAYOUT = {
  playerPanel: { x: 18, y: 24, width: 120, height: 120, anchor: 'top-left', zIndex: 30 },
  salaryPanel: { x: 330, y: 26, width: 214, height: 112, anchor: 'top-left', zIndex: 30 },
  fishProgressPanel: { x: 558, y: 26, width: 168, height: 112, anchor: 'top-left', zIndex: 30 },
  bossStatusPanel: { x: 742, y: 26, width: 220, height: 112, anchor: 'top-left', zIndex: 30 },
  settingsButton: { x: 990, y: 48, width: 68, height: 68, anchor: 'top-right', zIndex: 31 },
}

export const ZONE_TAB_BUTTONS = [
  { id: 'workstation' as AreaId, label: '工位区', x: 132, y: 1456, width: 254, height: 96, iconKey: 'zone-workstation', availableAreas: ['workstation'] as AreaId[] },
  { id: 'pantry' as AreaId, label: '茶水间', x: 414, y: 1456, width: 254, height: 96, iconKey: 'zone-pantry', availableAreas: ['pantry'] as AreaId[] },
  { id: 'restroom' as AreaId, label: '卫生间', x: 696, y: 1456, width: 254, height: 96, iconKey: 'zone-restroom', availableAreas: ['restroom'] as AreaId[] },
]

export const ACTION_BUTTONS = [
  { id: 'working' as PlayerAction, label: '认真工作', x: 20, y: 1568, width: 155, height: 212, iconKey: 'action-working', availableAreas: ['workstation'] as AreaId[], hotkeyName: 'work' },
  { id: 'watching' as PlayerAction, label: '看视频', x: 190, y: 1568, width: 155, height: 212, iconKey: 'action-watching', availableAreas: ['workstation'] as AreaId[], hotkeyName: 'video' },
  { id: 'chips' as PlayerAction, label: '吃薯片', x: 360, y: 1568, width: 155, height: 212, iconKey: 'action-chips', availableAreas: ['workstation'] as AreaId[], hotkeyName: 'chips' },
  { id: 'milkTea' as PlayerAction, label: '喝奶茶', x: 530, y: 1568, width: 155, height: 212, iconKey: 'action-milk-tea', availableAreas: ['pantry'] as AreaId[], hotkeyName: 'tea' },
  { id: 'fakeWorking' as PlayerAction, label: '假装工作', x: 700, y: 1568, width: 155, height: 212, iconKey: 'action-fake-working', availableAreas: ['pantry'] as AreaId[], hotkeyName: 'fake' },
  { id: 'phone' as PlayerAction, label: '玩手机', x: 870, y: 1568, width: 155, height: 212, iconKey: 'action-phone', availableAreas: ['restroom'] as AreaId[], hotkeyName: 'phone' },
]

export const BOTTOM_NAV_BUTTONS = [
  { id: 'office', label: '办公室', x: 0, y: 1804, width: 216, height: 116, iconKey: 'nav-office' },
  { id: 'employee', label: '员工', x: 216, y: 1804, width: 216, height: 116, iconKey: 'nav-employee' },
  { id: 'tasks', label: '任务', x: 432, y: 1804, width: 216, height: 116, iconKey: 'nav-tasks' },
  { id: 'achievements', label: '成就', x: 648, y: 1804, width: 216, height: 116, iconKey: 'nav-achievements' },
  { id: 'shop', label: '商店', x: 864, y: 1804, width: 216, height: 116, iconKey: 'nav-shop' },
]

export const WARNING_AND_MODAL_LAYOUT = {
  highRiskWarningPanel: { x: 650, y: 185, width: 360, height: 110, zIndex: 42 },
  caughtModal: { x: 190, y: 650, width: 700, height: 320, zIndex: 60 },
  winModal: { x: 160, y: 620, width: 760, height: 420, zIndex: 60 },
  loseModal: { x: 160, y: 620, width: 760, height: 420, zIndex: 60 },
  bossSpeechBubble: { x: 600, y: 470, width: 360, height: 96, zIndex: 45 },
  floatingRewardText: { x: 540, y: 760, width: 220, height: 64, zIndex: 50 },
}

export const ASSET_PLACEMENT = [
  { assetKey: 'map-mobile', fileName: 'mobile-map.png', targetArea: 'map', x: 0, y: 0, width: 1080, height: 1300, fitMode: 'stretch', zIndex: 0 },
  { assetKey: 'workstation-room', fileName: '工位.png', targetArea: 'workstation', x: 28, y: 46, width: 430, height: 880, fitMode: 'cover', zIndex: 1 },
  { assetKey: 'tea-room', fileName: '茶水间.png', targetArea: 'teaRoom', x: 608, y: 48, width: 444, height: 415, fitMode: 'cover', zIndex: 1 },
  { assetKey: 'restroom-room', fileName: '厕所.png', targetArea: 'restroom', x: 608, y: 464, width: 444, height: 340, fitMode: 'cover', zIndex: 1 },
  { assetKey: 'boss-office', fileName: '老板办公室.png', targetArea: 'bossOffice', x: 608, y: 805, width: 444, height: 455, fitMode: 'cover', zIndex: 1 },
  { assetKey: 'employee-atlas', fileName: '员工.svg', targetArea: 'sprites', x: 0, y: 0, width: 96, height: 128, fitMode: 'crop', zIndex: 20 },
  { assetKey: 'boss-atlas', fileName: '老板.svg', targetArea: 'sprites', x: 0, y: 0, width: 110, height: 150, fitMode: 'crop', zIndex: 22 },
  { assetKey: 'button-sheet', fileName: '各按钮设计.png', targetArea: 'ui', x: 0, y: 1450, width: 1080, height: 470, fitMode: 'crop', zIndex: 30 },
  { assetKey: 'ui-overview', fileName: '总览及各UI.png', targetArea: 'reference', x: 0, y: 0, width: 1080, height: 1920, fitMode: 'reference', zIndex: 0 },
  { assetKey: 'overview', fileName: '各场景总视图.png', targetArea: 'reference', x: 0, y: 150, width: 1080, height: 1300, fitMode: 'reference', zIndex: 0 },
]

export const MAP_TO_AREA_ID: Record<AreaKey, AreaId> = {
  workstation: 'workstation',
  mainCorridor: 'corridor',
  corridor: 'corridor',
  teaRoom: 'pantry',
  pantry: 'pantry',
  restroom: 'restroom',
  bossOffice: 'bossOffice',
}
