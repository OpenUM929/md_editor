const STORAGE_KEY = "recentColors"
const MAX_COLORS = 3

export function getRecentColors(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.slice(0, MAX_COLORS) : []
  } catch {
    return []
  }
}

export function addRecentColor(color: string): string[] {
  if (typeof window === "undefined") return []
  const normalized = color.toLowerCase()
  const existing = getRecentColors().filter((c) => c.toLowerCase() !== normalized)
  const next = [color, ...existing].slice(0, MAX_COLORS)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch { /* noop */ }
  return next
}
