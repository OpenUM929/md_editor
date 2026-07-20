export type MarginPresetId = "very-narrow" | "narrow" | "medium"

export type MarginValues = {
  top: number
  bottom: number
  left: number
  right: number
}

export type MarginPreset = {
  label: string
  values: MarginValues
}

export const A4_MARGIN_PRESETS: Record<MarginPresetId, MarginPreset> = {
  "very-narrow": {
    label: "매우좁게",
    values: { top: 20, bottom: 20, left: 20, right: 20 },
  },
  narrow: {
    label: "좁게",
    values: { top: 30, bottom: 30, left: 30, right: 30 },
  },
  medium: {
    label: "중간",
    values: { top: 40, bottom: 40, left: 40, right: 40 },
  },
}

export const DEFAULT_MARGIN_PRESET: MarginPresetId = "very-narrow"

export const A4_DIMENSIONS = {
  width: 210,
  height: 297,
  gap: 8,
} as const

export function mmToPx(mm: number): number {
  return mm * (96 / 25.4)
}

export function getPrintableHeight(values: MarginValues): number {
  return A4_DIMENSIONS.height - values.top - values.bottom
}
