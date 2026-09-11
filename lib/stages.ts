// lib/stages.ts

export type StageDef = {
  category: string
  items: string[]
  /** 細項可個別隱藏唔俾客人睇（例如安裝工程） */
  allowHideItems?: boolean
}

export const INITIAL_STAGES: StageDef[] = [
  { category: '清拆工程', items: ['入場清拆', '清拆進行中', '清拆完成'] },
  { category: '棚架工程', items: ['搭棚', '拆棚'] },
  { category: '鋁窗工程', items: ['現場度尺', '拆舊窗', '換新窗', '窗邊執修'] },
  {
    category: '水電工程',
    items: [
      '現場夾位',
      'MARK位',
      '介坑',
      '放喉',
      '試水（水喉工程）',
      '封泥',
      '穿線（電力工程）',
      '安裝制面（電力工程）',
      '完成（水喉工程）',
    ],
  },
  {
    category: '泥水工程',
    items: [
      '磚牆間隔',
      '磚牆批盪',
      '廚房牆身批盪',
      '浴室牆身批盪',
      '盪平地台',
      '廚房鋪磚',
      '浴室鋪磚',
      '客廳及房間鋪磚',
    ],
  },
  { category: '防水工程', items: ['防水塗層處理', '12小時試水'] },
  { category: '雲石工程', items: ['現場度尺', '安裝雲石'] },
  { category: '油漆工程', items: ['剷底', '批灰', '省灰', '髹油'] },
  {
    category: '木器工程',
    items: ['現場度尺', '出圖', '圖紙確認', '傢俬製作', '傢俬到場', '安裝傢私', '收口唧膠'],
  },
  {
    category: '安裝工程',
    allowHideItems: true,
    items: ['安裝木門', '安裝浴屏', '安裝燈具', '安裝潔具'],
  },
]

/** 舊大項名 → 新大項名（讀舊 stages_state 時遷移） */
export const CATEGORY_ALIASES: Record<string, string> = {
  水喉工程: '水電工程',
}

/** 各大項內舊細項名 → 新細項名 */
export const ITEM_ALIASES: Record<string, Record<string, string>> = {
  清拆工程: { 進場清拆: '入場清拆' },
  水電工程: {
    試水: '試水（水喉工程）',
    穿線: '穿線（電力工程）',
    裝制面: '安裝制面（電力工程）',
  },
  油漆工程: {
    磨平牆身灰: '省灰',
    上面油: '髹油',
  },
}

export type StageState = {
  [category: string]: {
    enabled: boolean
    items: { [item: string]: boolean }
    /** true = 唔俾客人睇（只對 allowHideItems 大項有意義） */
    hidden_items?: { [item: string]: boolean }
  }
}

export function isCategoryEnabled(category: string, state: StageState) {
  return state[category]?.enabled ?? true
}

export function isItemHidden(category: string, item: string, state: StageState) {
  return state[category]?.hidden_items?.[item] === true
}

export function isItemChecked(category: string, item: string, state: StageState) {
  return state[category]?.items?.[item] === true
}

/** 前台可見嘅細項（已啟用大項，且未隱藏） */
export function getVisibleItems(stage: StageDef, state: StageState) {
  if (!isCategoryEnabled(stage.category, state)) return []
  return stage.items.filter((item) => !isItemHidden(stage.category, item, state))
}

export function calculateStageProgress(state: StageState) {
  let total = 0
  let completed = 0
  INITIAL_STAGES.forEach((stage) => {
    getVisibleItems(stage, state).forEach((item) => {
      total++
      if (isItemChecked(stage.category, item, state)) completed++
    })
  })
  return {
    total,
    completed,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
}

function applyItemAliases(
  category: string,
  items: Record<string, boolean> | undefined
): Record<string, boolean> {
  const aliases = ITEM_ALIASES[category] || {}
  const next: Record<string, boolean> = { ...(items || {}) }
  Object.entries(aliases).forEach(([from, to]) => {
    if (next[from] !== undefined && next[to] === undefined) {
      next[to] = next[from]
    }
  })
  return next
}

export function defaultStageState(): StageState {
  const state: StageState = {}
  INITIAL_STAGES.forEach((stage) => {
    state[stage.category] = {
      enabled: true,
      items: stage.items.reduce((acc, item) => ({ ...acc, [item]: false }), {}),
      hidden_items: stage.allowHideItems
        ? stage.items.reduce((acc, item) => ({ ...acc, [item]: false }), {})
        : {},
    }
  })
  return state
}

export function mergeStageState(raw: any): StageState {
  const merged = defaultStageState()
  if (!raw || typeof raw !== 'object') return merged

  // 先將舊大項 alias 併入新名
  const normalized: Record<string, any> = { ...raw }
  Object.entries(CATEGORY_ALIASES).forEach(([from, to]) => {
    if (normalized[from] && !normalized[to]) {
      normalized[to] = normalized[from]
    } else if (normalized[from] && normalized[to]) {
      normalized[to] = {
        ...normalized[from],
        ...normalized[to],
        items: {
          ...(normalized[from].items || {}),
          ...(normalized[to].items || {}),
        },
        hidden_items: {
          ...(normalized[from].hidden_items || {}),
          ...(normalized[to].hidden_items || {}),
        },
      }
    }
  })

  Object.keys(normalized).forEach((cat) => {
    const targetCat = CATEGORY_ALIASES[cat] || cat
    if (!merged[targetCat]) return
    const rawItems = applyItemAliases(targetCat, normalized[cat]?.items || {})
    merged[targetCat] = {
      enabled: normalized[cat]?.enabled ?? true,
      items: {
        ...merged[targetCat].items,
        ...rawItems,
      },
      hidden_items: {
        ...(merged[targetCat].hidden_items || {}),
        ...(normalized[cat]?.hidden_items || {}),
      },
    }
  })

  return merged
}

export type ProjectType = 'renovation' | 'repair'

export function isRenovationProject(projectType: string | null | undefined) {
  return projectType !== 'repair'
}
