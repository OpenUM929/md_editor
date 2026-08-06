import { marked } from "marked"
import TurndownService from "turndown"
import matter from "gray-matter"

const PAGE_BREAK_TOKEN = "---pb---"

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
})

turndown.addRule("taskList", {
  filter: (node) => {
    return node.classList?.contains("task-list-item") ?? false
  },
  replacement: (content, node) => {
    const isChecked = (node as HTMLElement).getAttribute("data-checked") === "true"
    return `- [${isChecked ? "x" : " "}] ${content.trim()}\n`
  },
})

turndown.addRule("strikethrough", {
  filter: ["s", "del"],
  replacement: (content) => `~~${content}~~`,
})

// 헤딩별 개별 스타일(강조 바 색상/두께, 글자 크기, 굵기 — custom-heading.ts) 보존.
// turndown 기본 heading 규칙은 h1~h6을 "#" 접두사로만 바꾸고 style 속성은 통째로
// 버린다(실측 확인). 그러면 저장할 때마다 이 헤딩들의 개별 스타일이 사라진다.
// → style이 실제로 있는 헤딩만 앞줄에 HTML 주석 디렉티브로 값을 실어두고,
//   mdToHtml()의 applyHeadingDirectives()가 다시 읽어 style로 복원한다(FRONTMATTER_TEMPLATE_RE
//   와 같은 "숨은 메타데이터 왕복" 패턴). style이 없는 헤딩은 이 규칙이 걸리지 않아
//   기존 출력과 완전히 동일하다(회귀 없음).
turndown.addRule("headingStyleDirective", {
  filter: (node) => {
    if (!/^H[1-6]$/.test(node.nodeName)) return false
    const el = node as HTMLElement
    return !!(el.style.borderLeftColor || el.style.borderLeftWidth || el.style.fontSize || el.style.fontWeight)
  },
  replacement: (content, node) => {
    const el = node as HTMLElement
    const level = Number(el.nodeName.charAt(1))
    const parts: string[] = []
    if (el.style.borderLeftColor) parts.push(`accentColor=${el.style.borderLeftColor}`)
    if (el.style.borderLeftWidth) parts.push(`accentWidth=${el.style.borderLeftWidth}`)
    if (el.style.fontSize) parts.push(`fontSize=${el.style.fontSize}`)
    if (el.style.fontWeight) {
      const isBold = el.style.fontWeight === "bold" || parseInt(el.style.fontWeight, 10) >= 600
      parts.push(`bold=${isBold ? "true" : "false"}`)
    }
    const directive = `<!-- heading: ${parts.join(" ")} -->\n`
    return `\n${directive}${"#".repeat(level)} ${content.trim()}\n\n`
  },
})

// GFM 표 직렬화. turndown 기본은 표를 못 바꾸고(셀이 줄글로 뭉개짐), turndown-plugin-gfm
// 은 Tiptap 이 넣는 <colgroup> 때문에 heading-row 감지에 실패해 표를 통째로 HTML 로 남긴다
// → marked 가 표 토큰을 못 만들어 DOCX/HWPX 에서 표가 사라진다(2026-07-22 회귀). 그래서
// Tiptap 표 구조(<colgroup>·셀 속 <p>·colspan/rowspan)를 직접 다루는 규칙을 둔다.
const alignMarker = (cell: Node): string => {
  const readAlign = (el: Element | null): string | null => {
    if (!el || typeof el.getAttribute !== "function") return null
    const style = el.getAttribute("style") || ""
    const m = style.match(/text-align:\s*(left|center|right)/i)
    return (m && m[1]) || el.getAttribute("align")
  }
  const c = cell as Element
  let a = readAlign(c)
  if (!a) {
    const child = Array.from(c.childNodes).find((n) => n.nodeType === 1) as Element | undefined
    a = readAlign(child ?? null)
  }
  switch ((a || "").toLowerCase()) {
    case "center": return ":--:"
    case "right": return "--:"
    case "left": return ":--"
    default: return "---"
  }
}

turndown.addRule("gfmTable", {
  filter: "table",
  replacement: (content, node) => {
    const el = node as HTMLElement
    const rows = Array.from(el.getElementsByTagName("tr"))
    if (!rows.length) return content
    const cellsOf = (tr: Element) =>
      Array.from(tr.childNodes).filter((n) => n.nodeName === "TH" || n.nodeName === "TD") as Element[]
    const cellText = (cell: Element): string => {
      let s: string
      try { s = turndown.turndown(cell.innerHTML || "") } catch { s = cell.textContent || "" }
      // GFM 셀은 개행 불가 → 공백으로 접고, 파이프는 이스케이프.
      return s.replace(/\s*\n+\s*/g, " ").replace(/\|/g, "\\|").trim()
    }
    const rowMd = (tr: Element) => `| ${cellsOf(tr).map(cellText).join(" | ")} |`
    const header = cellsOf(rows[0])
    if (!header.length) return content
    const sep = `| ${header.map(alignMarker).join(" | ")} |`
    const lines = [rowMd(rows[0]), sep, ...rows.slice(1).map(rowMd)]
    return `\n\n${lines.join("\n")}\n\n`
  },
})

// 페이지 분할 노드(pageBreak)를 마크다운 토큰으로 왕복 직렬화.
// 단, 자동(auto) 나눔은 "표시 계층 전용"이므로 소스에 저장하지 않는다. 저장하면
// 분리 모드로 본 것만으로 문서(.md)가 변질되어 모드 간 표시가 어긋난다.
turndown.addRule("pageBreak", {
  filter: (node) => node.nodeName === "DIV" && (node as HTMLElement).hasAttribute("data-page-break"),
  replacement: (_content, node) =>
    (node as HTMLElement).getAttribute("data-auto") === "true" ? "" : `\n${PAGE_BREAK_TOKEN}\n`,
})

// 이미지 직렬화: 화면표시용 src(/api/asset...) 대신 원본 상대경로(data-canonical-src)로
// 되돌려 .md 파일이 변질되지 않게 한다. (doc-image.ts 의 resolveImageSrcs 와 왕복)
turndown.addRule("imageCanonical", {
  filter: "img",
  replacement: (_content, node) => {
    const el = node as HTMLElement
    const src = el.getAttribute("data-canonical-src") || el.getAttribute("src") || ""
    if (!src) return ""
    const alt = el.getAttribute("alt") || ""
    const title = el.getAttribute("title")
    return `![${alt}](${src}${title ? ` "${title}"` : ""})`
  },
})

marked.use({
  breaks: true, // 빈 줄 문단 구분(기존 방식)은 그대로 두고, 단일 개행도 <br>로 렌더링(외부 원고 그대로 붙여넣을 때 대응)
  extensions: [
    {
      name: "pagebreak",
      level: "block",
      start(src: string) {
        const i = src.indexOf(PAGE_BREAK_TOKEN)
        return i < 0 ? undefined : i
      },
      tokenizer(src: string) {
        const match = new RegExp(`^${PAGE_BREAK_TOKEN}\\s*(?:\\n|$)`).exec(src)
        if (match) {
          return {
            type: "pagebreak",
            raw: match[0],
          }
        }
      },
      renderer() {
        return '<div data-page-break></div>\n'
      },
    },
  ],
})

export function htmlToMd(html: string): string {
  const md = turndown.turndown(html)
  // HTML에 심어둔 프론트매터(data-frontmatter)를 본문 앞에 재부착
  const match = /<template data-frontmatter="([^"]*)"><\/template>/.exec(html)
  if (match) {
    const fm = decodeURIComponent(match[1]).trim()
    if (fm) return `${fm}\n${md}`
  }
  return md
}

const FRONTMATTER_TEMPLATE_RE = /<template data-frontmatter="[^"]*"><\/template>/

// 편집기 HTML 앞에 프론트매터를 숨은 template 노드로 (재)부착한다.
// Tiptap 은 template 노드를 스키마에 없다는 이유로 getHTML() 에서 떨궈내므로,
// 저장/자동저장 직전에 이 함수로 프론트매터를 다시 심어야 htmlToMd 가 복원할 수 있다.
// 기존 template 이 있으면 제거 후 최신값으로 교체(idempotent).
export function injectFrontmatter(html: string, data: Record<string, unknown>): string {
  const stripped = html.replace(FRONTMATTER_TEMPLATE_RE, "")
  const keys = Object.keys(data)
  if (keys.length === 0) return stripped
  const fm = matter.stringify("", data).trim()
  if (!fm) return stripped
  return `<template data-frontmatter="${encodeURIComponent(fm)}"></template>${stripped}`
}

export function frontmatterFromMarkdown(md: string): Record<string, unknown> {
  try {
    return matter(md).data as Record<string, unknown>
  } catch {
    return {}
  }
}

export function frontmatterFromHtml(html: string): Record<string, unknown> {
  const match = FRONTMATTER_TEMPLATE_RE.exec(html)
  if (!match) return {}
  const raw = /data-frontmatter="([^"]*)"/.exec(match[0])
  if (!raw) return {}
  try {
    return matter(decodeURIComponent(raw[1]).trim()).data as Record<string, unknown>
  } catch {
    return {}
  }
}

// turndown의 headingStyleDirective 규칙이 남긴 `<!-- heading: k=v k=v -->` 를 읽어
// 바로 다음 헤딩 태그에 style 속성으로 복원하고 주석은 제거한다(왕복의 반대편 절반).
const HEADING_DIRECTIVE_RE = /<!-- heading: ([^>]*?) -->\s*<h([1-6])([^>]*)>/g

function applyHeadingDirectives(html: string): string {
  return html.replace(HEADING_DIRECTIVE_RE, (_match, attrsRaw: string, level: string, tagAttrs: string) => {
    const styles: string[] = []
    const attrRe = /(\w+)=(\S+)/g
    let m: RegExpExecArray | null
    while ((m = attrRe.exec(attrsRaw))) {
      const [, key, val] = m
      if (key === "accentColor") styles.push(`border-left-color: ${val}`)
      else if (key === "accentWidth") styles.push(`border-left-width: ${val}`)
      else if (key === "fontSize") styles.push(`font-size: ${val}`)
      else if (key === "bold") styles.push(`font-weight: ${val === "true" ? "bold" : "normal"}`)
    }
    const styleAttr = styles.length > 0 ? ` style="${styles.join("; ")}"` : ""
    return `<h${level}${tagAttrs}${styleAttr}>`
  })
}

export async function mdToHtml(markdown: string): Promise<string> {
  const { content, data } = matter(markdown)
  const fm = Object.keys(data).length > 0 ? matter.stringify("", data).trim() : ""
  const result = applyHeadingDirectives(await marked.parse(content, { async: true }))
  // 프론트매터 보존: HTML 본문 앞에 숨은 template 노드로 심어둠
  if (fm) {
    return `<template data-frontmatter="${encodeURIComponent(fm)}"></template>${result}`
  }
  return result
}
