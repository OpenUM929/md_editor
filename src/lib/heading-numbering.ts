import matter from "gray-matter"

// 헤딩(제목) 자동 번호 매기기 — 문서 프론트매터 `headingNumbering` 값(boolean)으로 토글한다.
// report-theme.ts 와 대칭 구조: 마크다운/HTML 양쪽에서 프론트매터를 읽는다.
// 켜면 h1~h4 가 Word/한글의 "다단계 목록"처럼 1 / 1.1 / 1.1.1 / 1.1.1.1 로 자동 번호가 매겨진다.
// - 편집화면·인쇄/PDF: globals.css 의 CSS counter(`.heading-numbered`)가 그린다(본문 텍스트는 건드리지 않음).
// - DOCX/HWPX 내보내기: HeadingNumberer로 계산한 번호를 내보낼 때 헤딩 텍스트 앞에 붙인다(docx-export.ts/hwpx-plan.ts).

const FRONTMATTER_KEY = "headingNumbering"

function normalize(value: unknown): boolean {
  return value === true || value === "true"
}

export function headingNumberingFromMarkdown(md: string): boolean {
  try {
    const { data } = matter(md)
    return normalize(data[FRONTMATTER_KEY])
  } catch {
    return false
  }
}

export function headingNumberingFromHtml(html: string): boolean {
  const match = /<template data-frontmatter="([^"]*)"><\/template>/.exec(html)
  if (match) {
    try {
      const fm = decodeURIComponent(match[1]).trim()
      const { data } = matter(fm)
      return normalize(data[FRONTMATTER_KEY])
    } catch {
      return false
    }
  }
  return false
}

// 표면 요소(.a4-canvas / .print-pages / .pdf-preview-sheet)에 붙일 클래스.
export function headingNumberingClass(enabled: boolean): string {
  return enabled ? "heading-numbered" : ""
}

// DOCX/HWPX 내보내기용 — 문서 내 헤딩을 만나는 순서대로 호출하면 1 / 1.1 / 1.1.1 / 1.1.1.1
// 계층 번호를 반환한다(레벨 5 이상은 번호를 매기지 않음 — 호출 측에서 depth<=4 일 때만 사용).
export class HeadingNumberer {
  private counters = [0, 0, 0, 0]

  next(depth: number): string {
    const d = Math.min(Math.max(depth, 1), 4)
    this.counters[d - 1] += 1
    for (let i = d; i < 4; i++) this.counters[i] = 0
    return this.counters.slice(0, d).join(".")
  }
}
