import type { ReportTheme } from "./report-theme"

// 테마별 강조색. DOCX(docx-export.ts)·HWPX(hwpx-plan.ts) 내보내기에서 공용으로 쓴다.
// (과거 이 파일에 있던 수제 OWPML charPr/paraPr/header 빌더는 python-hwpx 도입으로 폐기.)
export const THEME_ACCENT: Record<ReportTheme, string> = {
  plain: "#000000",
  report: "#1B1760",
  meeting: "#0F766E",
  proposal: "#1D4ED8",
  technical: "#334155",
  "one-paper": "#1B1760",
}
