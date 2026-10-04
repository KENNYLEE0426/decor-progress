export const PROJECT_DOCUMENT_CATEGORIES = [
  '報價單',
  '發票收據',
  '改動平面尺寸圖',
  '水喉標示平面圖',
  '電位平面圖',
  '電位正視圖',
  '窗戶設計正視圖',
  '牆身物料劃分圖',
  '地面物料劃分圖',
  '油漆顏料分佈圖',
] as const

export type ProjectDocumentCategory = (typeof PROJECT_DOCUMENT_CATEGORIES)[number]

export function isProjectDocumentCategory(value: string): value is ProjectDocumentCategory {
  return (PROJECT_DOCUMENT_CATEGORIES as readonly string[]).includes(value)
}
