export const UI_HOVER_DELAY_MS = 700

export type UiLocatorInfo = {
  path: string
  button: string | null
  file: string | null
}

export function locateAt(x: number, y: number): UiLocatorInfo {
  const el = document.elementFromPoint(x, y)
  if (!el) return { path: "", button: null, file: null }

  const layouts: string[] = []
  let file: string | null = null
  let cur: Element | null = el
  while (cur) {
    const layout = cur.getAttribute?.("data-layout")
    if (layout && !layouts.includes(layout)) layouts.unshift(layout)
    if (!file) file = cur.getAttribute?.("data-ui-file") ?? null
    cur = cur.parentElement
  }

  const node = el.closest("button, [role='button'], a")
  const button = node
    ? node.getAttribute("aria-label") ||
      node.getAttribute("title") ||
      node.textContent?.trim() ||
      null
    : null

  return { path: layouts.join(" > "), button, file }
}
