import { getRootPath } from "@/lib/fs-access"

export function docDirOf(filePath: string): string {
  const norm = filePath.replace(/\\/g, "/")
  const idx = norm.lastIndexOf("/")
  return idx < 0 ? "" : norm.slice(0, idx)
}

function joinRel(dir: string, rel: string): string {
  const parts = (dir ? dir.split("/") : []).concat(rel.split("/"))
  const stack: string[] = []
  for (const p of parts) {
    if (!p || p === ".") continue
    if (p === "..") stack.pop()
    else stack.push(p)
  }
  return stack.join("/")
}

export function resolveImageSrcs(html: string, filePath: string): string {
  const root = getRootPath()
  if (!root) return html
  const dir = docDirOf(filePath)
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const m = /\ssrc\s*=\s*("([^"]*)"|'([^']*)')/i.exec(tag)
    if (!m) return tag
    const src = (m[2] ?? m[3] ?? "").trim()
    if (!src || /^(https?:|data:|blob:|\/)/i.test(src)) return tag
    if (/\bdata-canonical-src=/i.test(tag)) return tag
    // marked 가 한글 등 비ASCII 경로를 이미 percent-encode 하므로, 먼저 디코드해
    // 이중 인코딩(%25EA…)으로 인한 404 를 막는다. canonical 도 디코드본을 저장해
    // 저장 시 원본 마크다운 경로 그대로 왕복되게 한다.
    let decoded = src
    try { decoded = decodeURIComponent(src) } catch { /* 이미 디코드된 경로 */ }
    const rel = joinRel(dir, decoded)
    const url = `/api/asset?root=${encodeURIComponent(root)}&path=${encodeURIComponent(rel)}`
    return tag.replace(m[1], `"${url}"`).replace(/<img\b/i, `<img data-canonical-src="${decoded.replace(/"/g, "&quot;")}"`)
  })
}
