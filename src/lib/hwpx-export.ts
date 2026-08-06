// HWPX 파일명 헬퍼만 남긴다. 실제 HWPX 생성은 공인 라이브러리 python-hwpx 로 이동했다
// (src/lib/hwpx-plan.ts 가 marked 로 plan 을 만들고, scripts/hwpx_gen.py 가 조립·검증).
// 과거 이 파일이 손으로 짜던 OWPML 은 한글에서 "파일 손상"으로 거부돼 폐기했다(2026-07-22).

export function getDefaultHwpxFileName(filePath: string): string {
  return filePath.replace(/\.md$/i, "") + ".hwpx"
}
