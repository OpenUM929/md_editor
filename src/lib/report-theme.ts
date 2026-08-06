import matter from "gray-matter"

// 보고서 양식 테마 — 문서 프론트매터 `reportTheme` 값으로 선택한다.
// page-mode.ts 와 대칭 구조: 마크다운/HTML 양쪽에서 프론트매터를 읽는다.
export type ReportTheme =
  | "plain"
  | "report"
  | "meeting"
  | "proposal"
  | "technical"
  | "one-paper"

export const REPORT_THEMES: ReportTheme[] = [
  "plain",
  "report",
  "meeting",
  "proposal",
  "technical",
  "one-paper",
]

export const REPORT_THEME_LABELS: Record<ReportTheme, string> = {
  plain: "일반",
  report: "보고서",
  meeting: "회의록",
  proposal: "제안서",
  technical: "기술문서",
  "one-paper": "원페이퍼",
}

const DEFAULT_THEME: ReportTheme = "plain"

function normalize(value: unknown): ReportTheme {
  if (typeof value === "string" && (REPORT_THEMES as string[]).includes(value)) {
    return value as ReportTheme
  }
  return DEFAULT_THEME
}

export function reportThemeFromMarkdown(md: string): ReportTheme {
  try {
    const { data } = matter(md)
    return normalize(data.reportTheme)
  } catch {
    return DEFAULT_THEME
  }
}

export function reportThemeFromHtml(html: string): ReportTheme {
  const match = /<template data-frontmatter="([^"]*)"><\/template>/.exec(html)
  if (match) {
    try {
      const fm = decodeURIComponent(match[1]).trim()
      const { data } = matter(fm)
      return normalize(data.reportTheme)
    } catch {
      return DEFAULT_THEME
    }
  }
  return DEFAULT_THEME
}

// 표면 요소(.ProseMirror / .print-pages / .pdf-preview-sheet)에 붙일 클래스.
// plain 이면 클래스 없음 → 기존 일반 마크다운 스타일 유지.
export function reportThemeClass(theme: ReportTheme): string {
  if (theme === "plain") return ""
  return `report-theme report-theme--${theme}`
}
