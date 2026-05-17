export type LayoutRect = { left: number; top: number; width: number; height: number }

const r = (x1: number, y1: number, x2: number, y2: number): LayoutRect => ({
  left: Math.round(x1 * 1080),
  top: Math.round(y1 * 1920),
  width: Math.round((x2 - x1) * 1080),
  height: Math.round((y2 - y1) * 1920),
})

// === Tasks page ===
export const TASKS_CARDS = [
  { id: 1, rect: r(0.048, 0.327, 0.952, 0.423), name: '认真工作10秒', progress: 5, target: 10, reward: 50 },
  { id: 2, rect: r(0.048, 0.435, 0.952, 0.531), name: '成功躲避老板3次', progress: 1, target: 3, reward: 100 },
  { id: 3, rect: r(0.048, 0.543, 0.952, 0.639), name: '累计摸鱼60秒', progress: 23, target: 60, reward: 80 },
  { id: 4, rect: r(0.048, 0.651, 0.952, 0.747), name: '喝奶茶5次', progress: 2, target: 5, reward: 60 },
  { id: 5, rect: r(0.048, 0.759, 0.952, 0.855), name: '假装工作骗过老板', progress: 1, target: 1, reward: 150 },
  { id: 6, rect: r(0.048, 0.867, 0.952, 0.880), name: '茶水间摸鱼30秒', progress: 0, target: 30, reward: 120 },
]

export const TASKS_CLAIM_BUTTONS = [
  { taskId: 5, rect: r(0.821, 0.785, 0.938, 0.829) },
]

export const TASKS_TABS = [
  { id: 'daily', label: '每日任务', rect: r(0.048, 0.884, 0.324, 0.930) },
  { id: 'longterm', label: '长期成就', rect: r(0.368, 0.884, 0.644, 0.930) },
  { id: 'hidden', label: '隐藏挑战', rect: r(0.688, 0.884, 0.964, 0.930) },
]

// === Employee page ===
export const EMPLOYEE_TABS = [
  { id: 'profile', label: '档案', rect: r(0.044, 0.191, 0.176, 0.226) },
  { id: 'skills', label: '技能', rect: r(0.226, 0.191, 0.358, 0.226) },
  { id: 'ranking', label: '排行', rect: r(0.408, 0.191, 0.540, 0.226) },
]

export const EMPLOYEE_AVATAR = r(0.056, 0.076, 0.164, 0.157)
export const EMPLOYEE_INFO = r(0.226, 0.076, 0.434, 0.169)

export const EMPLOYEE_STATS = [
  { id: 'health', label: '健康等级', rect: r(0.477, 0.076, 0.660, 0.145) },
  { id: 'salary', label: '工资余额', rect: r(0.711, 0.076, 0.944, 0.121) },
  { id: 'status', label: '精神状态', rect: r(0.477, 0.150, 0.660, 0.169) },
  { id: 'rating', label: '公司表现', rect: r(0.660, 0.247, 0.944, 0.275) },
]

export const EMPLOYEE_ATTRIBUTES = [
  { id: 'attr1', label: '属性1', rect: r(0.056, 0.247, 0.324, 0.336) },
  { id: 'attr2', label: '属性2', rect: r(0.324, 0.247, 0.660, 0.336) },
  { id: 'record', label: '档案记录', rect: r(0.660, 0.362, 0.944, 0.522) },
]

export const EMPLOYEE_SKILL_CARDS = [
  { id: 1, rect: r(0.056, 0.637, 0.434, 0.897), name: '技能树' },
  { id: 2, rect: r(0.477, 0.637, 0.944, 0.897), name: '装备技能卡' },
]

export const EMPLOYEE_REFRESH_BTN = r(0.711, 0.897, 0.944, 0.930)

// === Achievements page ===
export const ACHIEVEMENT_CARDS = [
  { id: 1, rect: r(0.031, 0.248, 0.481, 0.382), name: '工位幽灵', progress: 100, unlocked: true },
  { id: 2, rect: r(0.504, 0.248, 0.954, 0.382), name: '厕所之王', progress: 45, unlocked: false },
  { id: 3, rect: r(0.031, 0.392, 0.481, 0.526), name: '年度演员', progress: 30, unlocked: false },
  { id: 4, rect: r(0.504, 0.392, 0.954, 0.526), name: '资本对抗者', progress: 60, unlocked: false },
  { id: 5, rect: r(0.031, 0.536, 0.481, 0.67), name: '摸鱼大师', progress: 15, unlocked: false },
  { id: 6, rect: r(0.504, 0.536, 0.954, 0.67), name: '茶水间社牛', progress: 80, unlocked: false },
  { id: 7, rect: r(0.031, 0.68, 0.481, 0.814), name: '回头杀幸存者', progress: 50, unlocked: false },
  { id: 8, rect: r(0.504, 0.68, 0.954, 0.814), name: '老板克星', progress: 25, unlocked: false },
]

export const ACHIEVEMENT_FILTER_TABS = [
  { id: 'all', label: '全部', rect: r(0.031, 0.194, 0.198, 0.23) },
  { id: 'unlocked', label: '已解锁', rect: r(0.244, 0.194, 0.412, 0.23) },
  { id: 'rare', label: '稀有', rect: r(0.458, 0.194, 0.626, 0.23) },
]

export const ACHIEVEMENT_SORT_BTN = r(0.743, 0.194, 0.968, 0.23)

// === Shop page ===
export const SHOP_ITEMS = [
  { id: 1, rect: r(0.041, 0.236, 0.449, 0.331), buyRect: r(0.331, 0.294, 0.449, 0.331), name: '能量饮料', price: 200 },
  { id: 2, rect: r(0.551, 0.236, 0.959, 0.331), buyRect: r(0.841, 0.294, 0.959, 0.331), name: '超级咖啡因', price: 500 },
  { id: 3, rect: r(0.041, 0.344, 0.449, 0.439), buyRect: r(0.331, 0.402, 0.449, 0.439), name: '摸鱼加速鞋', price: 800 },
  { id: 4, rect: r(0.551, 0.344, 0.959, 0.439), buyRect: r(0.841, 0.402, 0.959, 0.439), name: '反老板监控器', price: 1200 },
  { id: 5, rect: r(0.041, 0.452, 0.449, 0.547), buyRect: r(0.331, 0.510, 0.449, 0.547), name: '自动点击组件', price: 1500 },
  { id: 6, rect: r(0.551, 0.452, 0.959, 0.547), buyRect: r(0.841, 0.510, 0.959, 0.547), name: '办公室装饰', price: 600 },
  { id: 7, rect: r(0.041, 0.560, 0.449, 0.655), buyRect: r(0.331, 0.618, 0.449, 0.655), name: '奶茶VIP卡', price: 300 },
  { id: 8, rect: r(0.551, 0.560, 0.959, 0.655), buyRect: r(0.841, 0.618, 0.959, 0.655), name: '老板狩猎许可', price: 2000 },
  { id: 9, rect: r(0.041, 0.668, 0.449, 0.763), buyRect: r(0.331, 0.726, 0.449, 0.763), name: '摸鱼增益卡', price: 400 },
]

export const SHOP_HEADER = r(0.041, 0.069, 0.959, 0.123)
export const SHOP_CURRENCY = r(0.665, 0.019, 0.768, 0.058)

export const SHOP_ACTION_BTNS = [
  { id: 'buy', label: '购买', rect: r(0.041, 0.840, 0.331, 0.886) },
  { id: 'equip', label: '装备', rect: r(0.331, 0.840, 0.621, 0.886) },
  { id: 'inventory', label: '库存', rect: r(0.621, 0.840, 0.959, 0.886) },
]
